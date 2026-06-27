CREATE TABLE IF NOT EXISTS AiModels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  system_prompt TEXT,
  fallback_model_ids TEXT,
  is_active INTEGER DEFAULT 1,
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default model
INSERT INTO AiModels (id, name, provider, endpoint, system_prompt, fallback_model_ids, is_active, is_default)
VALUES
('@cf/meta/llama-3.1-8b-instruct', 'Meta Llama 3.1 8B', 'workers-ai', 'chat/completions', 'You are a helpful, expert AI assistant.', '["gpt-4o-mini"]', 1, 1),
('gpt-4o-mini', 'OpenAI GPT-4o Mini', 'openai', 'chat/completions', 'You are a helpful, expert AI assistant.', '[]', 1, 0);
