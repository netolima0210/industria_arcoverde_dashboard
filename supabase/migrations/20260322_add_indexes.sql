-- ============================================================
-- MIGRAÇÃO: Índices para otimizar queries frequentes
-- Aplicar no Supabase SQL Editor do projeto uvjdxecyulzpitrgzhnt
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_n8n_chat_conversas_created_at ON n8n_chat_conversas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_n8n_chat_conversas_session_id ON n8n_chat_conversas(session_id);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clientes_contato ON clientes(contato);
CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);
