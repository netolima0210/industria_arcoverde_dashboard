-- ============================================================
-- MIGRAÇÃO: RPCs para otimização de egress do Dashboard
-- Aplicar no Supabase SQL Editor do projeto uvjdxecyulzpitrgzhnt
-- ============================================================

-- 1. RPC: última conversa por sessão (substitui o while paginado em conversas/page.tsx)
CREATE OR REPLACE FUNCTION get_latest_conversations()
RETURNS TABLE (session_id text, last_message_at timestamptz)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT session_id, MAX(created_at) as last_message_at
    FROM n8n_chat_conversas
    GROUP BY session_id
    ORDER BY last_message_at DESC;
$$;

-- 2. RPC: métricas do Dashboard (elimina busca de todas as mensagens com conteúdo)
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_start_date timestamptz, p_end_date timestamptz,
    p_prev_start_date timestamptz, p_prev_end_date timestamptz
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json;
BEGIN
    WITH cp AS (
        SELECT COUNT(DISTINCT session_id) as total_conversas, COUNT(*) as total_mensagens,
            COUNT(DISTINCT CASE WHEN (message->>'type' = 'ai' OR message->>'role' = 'assistant')
                AND (lower(message->>'content') LIKE '%transferindo%' OR lower(message->>'content') LIKE '%atendente%'
                    OR lower(message->>'content') LIKE '%humano%' OR lower(message->>'content') LIKE '%setor%'
                    OR lower(message->>'content') LIKE '%financeiro%' OR lower(message->>'content') LIKE '%comercial%'
                    OR lower(message->>'content') LIKE '%compras%') THEN session_id END) as transferencias
        FROM n8n_chat_conversas WHERE created_at >= p_start_date AND created_at <= p_end_date),
    pp AS (
        SELECT COUNT(DISTINCT session_id) as total_conversas, COUNT(*) as total_mensagens,
            COUNT(DISTINCT CASE WHEN (message->>'type' = 'ai' OR message->>'role' = 'assistant')
                AND (lower(message->>'content') LIKE '%transferindo%' OR lower(message->>'content') LIKE '%atendente%'
                    OR lower(message->>'content') LIKE '%humano%' OR lower(message->>'content') LIKE '%setor%'
                    OR lower(message->>'content') LIKE '%financeiro%' OR lower(message->>'content') LIKE '%comercial%'
                    OR lower(message->>'content') LIKE '%compras%') THEN session_id END) as transferencias
        FROM n8n_chat_conversas WHERE created_at >= p_prev_start_date AND created_at <= p_prev_end_date),
    cl AS (SELECT COUNT(*) as count FROM clientes WHERE created_at >= p_start_date AND created_at <= p_end_date),
    pl AS (SELECT COUNT(*) as count FROM clientes WHERE created_at >= p_prev_start_date AND created_at <= p_prev_end_date)
    SELECT json_build_object(
        'current', json_build_object('total_conversas', cp.total_conversas, 'total_mensagens', cp.total_mensagens, 'transferencias', cp.transferencias),
        'previous', json_build_object('total_conversas', pp.total_conversas, 'total_mensagens', pp.total_mensagens, 'transferencias', pp.transferencias),
        'current_leads', cl.count, 'previous_leads', pl.count
    ) INTO result FROM cp, pp, cl, pl;
    RETURN result;
END; $$;

-- 3. RPC: dados do gráfico do Dashboard
CREATE OR REPLACE FUNCTION get_dashboard_chart_data(p_start_date timestamptz, p_end_date timestamptz)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE result json; diff_days float;
BEGIN
    diff_days := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400.0;
    IF diff_days > 1.5 THEN
        SELECT json_agg(row_to_json(t) ORDER BY t.sort_date) INTO result FROM (
            SELECT to_char(created_at AT TIME ZONE 'America/Recife', 'DD/MM') as hour,
                   date_trunc('day', created_at AT TIME ZONE 'America/Recife') as sort_date,
                   COUNT(*) as count
            FROM n8n_chat_conversas WHERE created_at >= p_start_date AND created_at <= p_end_date
            GROUP BY 1, 2) t;
    ELSE
        SELECT json_agg(row_to_json(t) ORDER BY t.hour_num) INTO result FROM (
            SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Recife')::int as hour_num,
                   EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Recife')::text || 'h' as hour,
                   COUNT(*) as count
            FROM n8n_chat_conversas WHERE created_at >= p_start_date AND created_at <= p_end_date
            GROUP BY 1) t;
    END IF;
    RETURN COALESCE(result, '[]'::json);
END; $$;
