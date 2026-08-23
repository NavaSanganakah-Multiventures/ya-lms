-- Replace the DEPRECATED @cf/meta/llama-3.1-8b-instruct with
-- @cf/meta/llama-4-scout-17b-16e-instruct (Meta Llama 4 Scout 17B) as the new DEFAULT model.
--
-- Why: Cloudflare Workers AI has deprecated @cf/meta/llama-3.1-8b-instruct (no longer
-- served reliably). Scout 17B is multilingual (Hindi-supported), supports function calling
-- and vision, and is a Cloudflare-recommended (pinned) text-generation model.
-- getAiModelConfig() in src/index.ts reads is_default = 1.

-- 1. Register the new Scout model (idempotent).
INSERT OR IGNORE INTO AiModels (id, name, provider, endpoint, system_prompt, fallback_model_ids, is_active, is_default)
VALUES ('@cf/meta/llama-4-scout-17b-16e-instruct', 'Meta Llama 4 Scout 17B', 'workers-ai', 'chat/completions', 'You are a helpful, expert AI assistant.', '[]', 1, 0);

-- 2. Deactivate the deprecated model so it is never selected (getAiModelConfig filters is_active = 1).
UPDATE AiModels SET is_active = 0 WHERE id = '@cf/meta/llama-3.1-8b-instruct';

-- 3. Make Scout the single default.
UPDATE AiModels SET is_default = 0;
UPDATE AiModels SET is_default = 1, is_active = 1 WHERE id = '@cf/meta/llama-4-scout-17b-16e-instruct';
