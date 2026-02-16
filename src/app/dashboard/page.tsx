
import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDown, ArrowUp, MessageSquare, Users, CheckCircle, Clock } from 'lucide-react';
import { ConversasChart } from '@/components/dashboard/ConversationsChart'; // Assuming component export name

// Renaming import to match file export if needed, checking file content of chart...
// File content export name: ConversationsChart
import { ConversationsChart } from '@/components/dashboard/ConversationsChart';

export default async function DashboardPage() {
    const supabase = await createClient();

    // 1. Total Conversas
    const { count: totalConversas } = await supabase
        .from('conversas')
        .select('*', { count: 'exact', head: true });

    // 2. Leads Novos (Clientes criados hoje)
    const todayObs = new Date(); // using 'todayObs' to avoid conflict if I use 'today' later
    todayObs.setHours(0, 0, 0, 0);
    const { count: totalLeads } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
    // .gte('created_at', todayObs.toISOString()); // Uncomment for "Today" specifically

    // 3. Taxa de Resolução
    const { count: resolvidaBot } = await supabase
        .from('conversas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'resolvida_bot');

    // Calculate rate (FIXED TYPO HERE)
    const taxaResolucao = totalConversas && totalConversas > 0
        ? ((resolvidaBot || 0) / totalConversas) * 100
        : 0;

    // 4. Tempo Médio
    const { data: duracaoData } = await supabase
        .from('conversas')
        .select('duracao_segundos')
        .not('duracao_segundos', 'is', null)
        .limit(100);

    const avgDuration = duracaoData && duracaoData.length > 0
        ? duracaoData.reduce((acc, curr) => acc + (curr.duracao_segundos || 0), 0) / duracaoData.length
        : 0;

    // Formatting duration
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.round(seconds % 60);
        return `${m}m ${s}s`;
    }

    // 5. Chart Data (Conversations by Hour)
    const { data: conversationsToday } = await supabase
        .from('conversas')
        .select('created_at')
        .gte('created_at', todayObs.toISOString());

    const chartData = Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}h`,
        count: 0
    }));

    if (conversationsToday) {
        conversationsToday.forEach(conv => {
            const date = new Date(conv.created_at);
            // Adjust for timezone if needed, assuming server time is UTC or consistent
            // If created_at is UTC, and we want local time, we might need adjustment.
            // For MVP, using getHours() from the parsed date (which might be local or UTC depending on env)
            const hour = date.getHours();
            if (chartData[hour]) {
                chartData[hour].count++;
            }
        });
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Visão Geral</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metrics Cards (Same as before) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <MessageSquare className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Total Conversas</h3>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-4">{totalConversas || 0}</p>
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                        <ArrowUp className="h-3 w-3" />
                        -
                        <span className="text-gray-400">total</span>
                    </span>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-green-50 rounded-lg">
                                <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Total Contatos</h3>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-4">{totalLeads || 0}</p>
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1 mt-1">
                        <ArrowUp className="h-3 w-3" />
                        -
                        <span className="text-gray-400">total</span>
                    </span>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-purple-50 rounded-lg">
                                <CheckCircle className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Resolução Bot</h3>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-4">{taxaResolucao.toFixed(1)}%</p>
                    <span className="text-xs text-gray-400 font-medium mt-1 block">
                        Target: 70%
                    </span>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="p-2 bg-orange-50 rounded-lg">
                                <Clock className="h-6 w-6 text-orange-600" />
                            </div>
                            <h3 className="text-sm font-medium text-gray-500">Tempo Médio</h3>
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-4">{formatDuration(avgDuration)}</p>
                    <span className="text-xs text-gray-400 font-medium mt-1 block">
                        Global
                    </span>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border h-80">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Conversas por Hora (Hoje)</h3>
                    <div className="h-64">
                        <ConversationsChart data={chartData} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border h-80 flex flex-col items-center justify-center text-gray-400">
                    <p>Funil de Vendas (Em breve)</p>
                </div>
            </div>
        </div>
    )
}
