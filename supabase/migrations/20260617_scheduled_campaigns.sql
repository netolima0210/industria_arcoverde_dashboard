-- Migration: Suporte a agendamento de campanhas
-- Adiciona o campo scheduled_at à tabela campanhas e cria índice para busca eficiente.

ALTER TABLE campanhas
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;

-- Índice parcial: só indexa campanhas agendadas, mantendo o índice pequeno.
CREATE INDEX IF NOT EXISTS idx_campanhas_scheduled
  ON campanhas (scheduled_at, status)
  WHERE status = 'agendada';
