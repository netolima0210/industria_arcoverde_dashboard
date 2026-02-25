
import { createClient } from '@/utils/supabase/server';
import { MessageSquare, CheckCircle, Zap, PhoneIncoming, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { ConversationsChart } from '@/components/dashboard/ConversationsChart';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { startOfMonth, endOfMonth } from 'date-fns';

function TrendBadge({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
    if (previous === 0 && current === 0) return <span className="text-xs text-gray-400 mt-1 block">sem dados anteriores</span>;

    let percent: number;
    if (previous === 0) {
        percent = 100;
    } else {
        percent = ((current - previous) / previous) * 100;
    }

    const isPositive = percent > 0;
    const isNeutral = percent === 0;
    // Para transferências, subir é ruim → invert
    const isGood = invert ? !isPositive : isPositive;

    if (isNeutral) {
        return (
            <span className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <Minus className="h-3 w-3" /> igual ao anterior
            </span>
        );
    }

    return (
        <span className={`flex items-center gap-1 text-xs mt-1 font-medium ${isGood ? 'text-green-600' : 'text-red-500'}`}>
            {isPositive
                ? <TrendingUp className="h-3.5 w-3.5" />
                : <TrendingDown className="h-3.5 w-3.5" />
            }
            {isPositive ? '+' : ''}{percent.toFixed(0)}% vs anterior
        </span>
    );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ start_date?: string, end_date?: string, filter?: string }> }) {
    const supabase = await createClient();
    const params = await searchParams;

    // Determine Date Range
    const now = new Date();
    const startDate = params.start_date ? new Date(params.start_date) : startOfMonth(now);
    const endDate = params.end_date ? new Date(params.end_date) : endOfMonth(now);

    // Calcular período anterior com a mesma duração
    const duration = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - duration);
    const prevEndDate = new Date(startDate.getTime() - 1); // 1ms antes do período atual

    // 1. Fetch chat messages filtered by date (necessário para chart data)
    const { data: chatMessages } = await supabase
        .from('n8n_chat_conversas')
        .select('session_id, created_at, message')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    // --- PROCESSAMENTO DE DADOS (Heurísticas) ---
    const sessions = new Map();
    let totalMensagens = 0;
    let transferenciasCount = 0;

    const transferKeywords = ['transferindo', 'atendente', 'humano', 'setor', 'financeiro', 'comercial', 'compras'];

    if (chatMessages) {
        totalMensagens = chatMessages.length;

        chatMessages.forEach(msg => {
            const currentSession = sessions.get(msg.session_id) || {
                created_at: new Date(msg.created_at),
                last_at: new Date(msg.created_at),
                msg_count: 0,
                has_transfer: false
            };

            const msgDate = new Date(msg.created_at);
            if (msgDate > currentSession.last_at) currentSession.last_at = msgDate;
            currentSession.msg_count++;

            if (msg.message && typeof msg.message === 'object') {
                const content = (msg.message as any).content?.toLowerCase() || '';
                const type = (msg.message as any).type;

                if (type === 'ai' && transferKeywords.some(keyword => content.includes(keyword))) {
                    currentSession.has_transfer = true;
                }
            }

            sessions.set(msg.session_id, currentSession);
        });
    }

    const totalConversas = sessions.size;

    sessions.forEach((session) => {
        if (session.has_transfer) transferenciasCount++;
    });

    const taxaResolucao = totalConversas > 0
        ? ((totalConversas - transferenciasCount) / totalConversas * 100).toFixed(1)
        : '0';

    // 2. Novos Leads no Período
    const { count: novosLeads } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

    // 3. PERÍODO ANTERIOR — mesmas métricas para comparação de tendência
    const { data: prevChatMessages } = await supabase
        .from('n8n_chat_conversas')
        .select('session_id, created_at, message')
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

    const prevSessions = new Map();
    let prevTotalMensagens = 0;
    let prevTransferenciasCount = 0;

    if (prevChatMessages) {
        prevTotalMensagens = prevChatMessages.length;

        prevChatMessages.forEach(msg => {
            const currentSession = prevSessions.get(msg.session_id) || {
                has_transfer: false
            };

            if (msg.message && typeof msg.message === 'object') {
                const content = (msg.message as any).content?.toLowerCase() || '';
                const type = (msg.message as any).type;

                if (type === 'ai' && transferKeywords.some(keyword => content.includes(keyword))) {
                    currentSession.has_transfer = true;
                }
            }

            prevSessions.set(msg.session_id, currentSession);
        });
    }

    const prevTotalConversas = prevSessions.size;
    prevSessions.forEach((session) => {
        if (session.has_transfer) prevTransferenciasCount++;
    });

    const prevTaxaResolucao = prevTotalConversas > 0
        ? ((prevTotalConversas - prevTransferenciasCount) / prevTotalConversas * 100)
        : 0;

    const { count: prevNovosLeads } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

    // 4. Chart Data
    const diffDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const isDailyChart = diffDays > 1.5;

    let chartData: { hour: string; count: number }[];
    let chartLabel: string;

    if (isDailyChart) {
        chartLabel = "Mensagens por Dia";
        const dayMap = new Map<string, number>();

        if (chatMessages) {
            chatMessages.forEach(msg => {
                const date = new Date(msg.created_at);
                const dayKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + 1);
            });
        }

        chartData = Array.from(dayMap.entries()).map(([day, count]) => ({
            hour: day,
            count
        })).sort((a, b) => {
            const [dA, mA] = a.hour.split('/');
            const [dB, mB] = b.hour.split('/');
            return new Date(2024, parseInt(mA) - 1, parseInt(dA)).getTime() - new Date(2024, parseInt(mB) - 1, parseInt(dB)).getTime();
        });

    } else {
        chartLabel = "Mensagens por Hora";
        chartData = Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}h`,
            count: 0
        }));

        if (chatMessages) {
            chatMessages.forEach(msg => {
                const date = new Date(msg.created_at);
                if (date.getDate() === startDate.getDate()) {
                    const hour = date.getHours();
                    if (chartData[hour]) {
                        chartData[hour].count++;
                    }
                }
            });
        }
    }

    // Metric cards config
    const metrics = [
        {
            label: 'Conversas',
            value: totalConversas,
            sub: 'iniciadas no período',
            icon: Zap,
            color: 'bg-blue-500',
            iconColor: 'text-white',
            current: totalConversas,
            previous: prevTotalConversas,
            invert: false,
        },
        {
            label: 'Resolução Bot',
            value: `${taxaResolucao}%`,
            sub: 'sem humano',
            icon: CheckCircle,
            color: 'bg-green-500',
            iconColor: 'text-white',
            current: parseFloat(taxaResolucao),
            previous: prevTaxaResolucao,
            invert: false,
        },
        {
            label: 'Transferências',
            value: transferenciasCount,
            sub: 'para setores',
            icon: PhoneIncoming,
            color: 'bg-orange-500',
            iconColor: 'text-white',
            current: transferenciasCount,
            previous: prevTransferenciasCount,
            invert: true,
        },
        {
            label: 'Mensagens',
            value: totalMensagens,
            sub: 'no período',
            icon: MessageSquare,
            color: 'bg-purple-500',
            iconColor: 'text-white',
            current: totalMensagens,
            previous: prevTotalMensagens,
            invert: false,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full flex items-center gap-2 shadow-sm border border-gray-200/50">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Sistema Operacional
                        </div>
                        <span className="text-xs text-gray-400">
                            {startDate.toLocaleDateString('pt-BR')} - {endDate.toLocaleDateString('pt-BR')}
                        </span>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Período:</span>
                    <DateFilter />
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {metrics.map((m, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-md transition-all duration-200 group">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 ${m.color} rounded-xl shadow-sm`}>
                                <m.icon className={`h-5 w-5 ${m.iconColor}`} />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">{m.label}</h3>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{m.value}</p>
                        <TrendBadge current={m.current} previous={m.previous} invert={m.invert} />
                    </div>
                ))}
            </div>

            {/* Charts + Performance Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 h-[400px]">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800">Fluxo de Mensagens</h3>
                        <p className="text-sm text-gray-400">{chartLabel}</p>
                    </div>
                    <div className="h-64 w-full">
                        <ConversationsChart data={chartData} />
                    </div>
                </div>

                {/* Performance Card */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200/60 h-[400px] flex flex-col">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800">Performance Geral</h3>
                        <p className="text-sm text-gray-400">Indicadores do período</p>
                    </div>

                    <div className="space-y-4 flex-1 overflow-auto">
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="text-sm font-medium text-gray-600">Sessões Únicas</span>
                            <span className="font-bold text-gray-900 text-lg">{totalConversas}</span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="text-sm font-medium text-gray-600">Novos Leads</span>
                            <div className="text-right">
                                <span className="font-bold text-gray-900 text-lg">{novosLeads || 0}</span>
                                <TrendBadge current={novosLeads || 0} previous={prevNovosLeads || 0} />
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                            <span className="text-sm font-medium text-gray-600">Média Msgs/Conversa</span>
                            <span className="font-bold text-gray-900 text-lg">
                                {totalConversas > 0 ? (totalMensagens / totalConversas).toFixed(1) : '0'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <span className="text-sm font-medium text-blue-700">Status do Agente</span>
                            <span className="font-bold text-green-600 flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span> Online
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
