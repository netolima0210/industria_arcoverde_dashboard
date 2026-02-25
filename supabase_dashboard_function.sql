-- ============================================================
-- Função: get_dashboard_metrics
-- Calcula todas as métricas do dashboard direto no banco,
-- sem precisar trazer milhares de linhas pro servidor.
-- ============================================================
-- Cole este SQL no Editor SQL do Supabase e clique em "Run".
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics(
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  total_conversas bigint,
  total_mensagens bigint,
  transferencias bigint,
  novos_leads bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_conversas bigint;
  v_total_mensagens bigint;
  v_transferencias bigint;
  v_novos_leads bigint;
BEGIN
  -- Total de mensagens e sessões únicas no período
  SELECT
    COUNT(DISTINCT session_id),
    COUNT(*)
  INTO v_total_conversas, v_total_mensagens
  FROM n8n_chat_conversas
  WHERE created_at >= p_start
    AND created_at <= p_end;

  -- Transferências: sessões onde o bot mencionou palavras-chave de encaminhamento
  SELECT COUNT(DISTINCT session_id)
  INTO v_transferencias
  FROM n8n_chat_conversas
  WHERE created_at >= p_start
    AND created_at <= p_end
    AND message IS NOT NULL
    AND (message->>'type') = 'ai'
    AND (
      LOWER(message->'content'->>'content') LIKE '%transferindo%'
      OR LOWER(message->'content'->>'content') LIKE '%atendente%'
      OR LOWER(message->'content'->>'content') LIKE '%humano%'
      OR LOWER(message->'content'->>'content') LIKE '%setor%'
      OR LOWER(message->'content'->>'content') LIKE '%financeiro%'
      OR LOWER(message->'content'->>'content') LIKE '%comercial%'
      OR LOWER(message->'content'->>'content') LIKE '%compras%'
    );

  -- Novos leads no período
  SELECT COUNT(*)
  INTO v_novos_leads
  FROM clientes
  WHERE created_at >= p_start
    AND created_at <= p_end;

  RETURN QUERY SELECT v_total_conversas, v_total_mensagens, v_transferencias, v_novos_leads;
END;
$$;
