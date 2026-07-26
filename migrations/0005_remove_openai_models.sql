DELETE FROM AiModels WHERE provider = 'openai';
UPDATE AiModels SET fallback_model_ids = '[]' WHERE id = '@cf/meta/llama-3.1-8b-instruct';
