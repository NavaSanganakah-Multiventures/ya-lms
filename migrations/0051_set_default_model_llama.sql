-- Set Meta Llama 3.1 8B as the DEFAULT AI model for ALL users (students + admin/teacher).
-- Reverts any admin-selected reasoning model (e.g. deepseek-r1-distill-qwen-32b) back to
-- the stable, fast, Hindi-capable Llama model. getAiModelConfig() reads is_default = 1.
UPDATE AiModels SET is_default = 0;
UPDATE AiModels SET is_default = 1 WHERE id = '@cf/meta/llama-3.1-8b-instruct';
