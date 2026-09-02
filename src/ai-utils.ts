import type { Env } from "./server-utils";
import { sanitizeJson } from "./server-utils";

interface AiModel {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  system_prompt?: string | null;
  fallback_model_ids?: string | null;
  is_active: number;
  is_default: number;
}

export async function getAiModelConfig(env: Env, modelId?: string | null): Promise<AiModel[]> {
  const db = env.DB;
  let model: AiModel | null = null;
  
  if (modelId) {
    model = await db.prepare("SELECT * FROM AiModels WHERE id = ? AND is_active = 1").bind(modelId).first<AiModel>();
  }
  
  if (!model) {
    model = await db.prepare("SELECT * FROM AiModels WHERE is_default = 1 AND is_active = 1").first<AiModel>();
  }
  
  if (!model) {
    return [{
      id: "@cf/meta/llama-4-scout-17b-16e-instruct",
      name: "Meta Llama 4 Scout 17B",
      provider: "workers-ai",
      endpoint: "chat/completions",
      is_active: 1,
      is_default: 1
    }];
  }

  const models: AiModel[] = [model];
  
  if (model.fallback_model_ids) {
    try {
      const fallbackIds: string[] = JSON.parse(model.fallback_model_ids);
      for (const fId of fallbackIds) {
        const fallback = await db.prepare("SELECT * FROM AiModels WHERE id = ? AND is_active = 1").bind(fId).first<AiModel>();
        if (fallback) models.push(fallback);
      }
    } catch (e) {
      console.error("Failed to parse fallback_model_ids", e);
    }
  }
  
  return models;
}

export function applySystemPrompt(messages: any[], systemPrompt?: string | null) {
  if (!systemPrompt) return messages;
  const newMessages = [...messages];
  if (newMessages.length > 0 && newMessages[0].role === "system") {
    newMessages[0].content = systemPrompt + "\n" + newMessages[0].content;
  } else {
    newMessages.unshift({ role: "system", content: systemPrompt });
  }
  return newMessages;
}

export async function generateAIContent(
  messages: any[],
  env: Env,
  forceJson: boolean = false,
  modelId?: string | null,
): Promise<string> {
  const models = await getAiModelConfig(env, modelId);

  let lastError: any = null;
  for (const m of models) {
    let modelMessages = applySystemPrompt(messages, m.system_prompt);
    if (forceJson) {
      modelMessages = [
        ...modelMessages,
        {
          role: "system",
          content:
            'CRITICAL: Output ONLY a single valid JSON object. Do not include any text, markdown, code fences, or explanation outside the JSON.',
        },
      ];
    }

    try {
      const aiResult: any = await env.AI.run(
        m.id,
        { messages: modelMessages, max_tokens: 4000 },
      );

      const rawResult = (aiResult as any)?.response;
      let content = "";
      if (typeof rawResult === "string" && rawResult.trim()) {
        content = rawResult;
      } else if (rawResult !== undefined && rawResult !== null && typeof rawResult === "object") {
        content = JSON.stringify(rawResult);
      } else if (typeof aiResult === "string") {
        content = aiResult;
      } else if (aiResult !== undefined && aiResult !== null) {
        content = JSON.stringify(aiResult);
      }

      if (!content || !content.trim()) {
        lastError = new Error(`Model ${m.id} returned an empty response`);
        console.warn(`[AI] Model ${m.id} returned empty, trying fallback...`);
        continue;
      }
      return forceJson ? sanitizeJson(content) : content;
    } catch (e: any) {
      lastError = new Error(`Workers AI request failed for model ${m.id}: ${e.message}`);
      console.warn(`[AI] Model ${m.id} error, trying fallback...`, lastError.message);
    }
  }

  throw lastError || new Error("AI: all configured models failed");
}
