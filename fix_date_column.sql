-- Adiciona a coluna created_at se ela não existir
ALTER TABLE n8n_chat_conversas 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Atualiza os registros existentes que possam estar com data nula (embora o default resolva para novos inserts)
UPDATE n8n_chat_conversas SET created_at = timezone('utc'::text, now()) WHERE created_at IS NULL;
