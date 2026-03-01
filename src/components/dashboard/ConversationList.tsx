'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    User, Calendar, Clock, Hash, ChevronDown, ChevronUp,
    Bot, UserCircle, ArrowRightLeft, CheckCircle2, Activity,
    Search, RefreshCw, Timer, UserPlus
} from 'lucide-react';
import type { SessionData, ConversaStats } from '@/app/dashboard/conversas/page';

interface ConversationListProps {
    sessions: SessionData[];
    clienteMap: Record<string, string>;
    stats: ConversaStats;
}

function formatDate(dateString: string) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatTime(dateString: string) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDuration(minutes: number | null) {
    if (minutes === null) return null;
    if (minutes === 0) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const statusConfig = {
    resolved: {
        label: 'Resolvido',
        color: 'bg-green-100 text-green-700 border-green-200',
        dot: 'bg-green-500',
        icon: CheckCircle2,
    },
    transferred: {
        label: 'Transferido',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        dot: 'bg-orange-500',
        icon: ArrowRightLeft,
    },
    active: {
        label: 'Ativo',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        dot: 'bg-blue-500',
        icon: Activity,
    },
};

export function ConversationList({ sessions, clienteMap, stats }: ConversationListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const router = useRouter();

    const handleRefresh = () => {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 1000);
    };

    const filtered = sessions.filter(s => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const nome = clienteMap[s.phone]?.toLowerCase() || '';
        return s.phone.includes(q) || nome.includes(q);
    });

    return (
        <div className="space-y-4">

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Total', value: stats.total, color: 'text-gray-800', bg: 'bg-white border-gray-200/60' },
                    { label: 'Ativos', value: stats.active, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
                    { label: 'Transferidos', value: stats.transferred, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100' },
                    { label: 'Resolvidos', value: stats.resolved, color: 'text-green-700', bg: 'bg-green-50 border-green-100' },
                ].map(card => (
                    <div key={card.label} className={`${card.bg} rounded-2xl border shadow-sm px-4 py-3`}>
                        <p className="text-xs text-gray-500 font-medium">{card.label}</p>
                        <p className={`text-2xl font-bold mt-0.5 ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            {/* Search + Refresh */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nome ou telefone..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Atualizar conversas"
                    className="p-2.5 border border-gray-200 bg-white shadow-sm rounded-xl text-gray-500 hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50"
                >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                </button>
            </div>

            {/* Empty search state */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/60 p-8 text-center text-sm text-gray-400">
                    Nenhuma conversa encontrada para &ldquo;{search}&rdquo;
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((session) => {
                        const clienteNome = clienteMap[session.phone];
                        const isNewContact = !clienteNome;
                        const isExpanded = expandedId === session.session_id;
                        const status = statusConfig[session.status];
                        const StatusIcon = status.icon;
                        const duration = formatDuration(session.duration_minutes);

                        return (
                            <div
                                key={session.session_id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden transition-all duration-200 hover:shadow-md"
                            >
                                {/* Main Row */}
                                <button
                                    onClick={() => setExpandedId(prev => prev === session.session_id ? null : session.session_id)}
                                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
                                >
                                    {/* Avatar */}
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                        <User className="h-5 w-5" />
                                    </div>

                                    {/* Contact Info */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-semibold text-gray-900">
                                                {clienteNome || session.phone}
                                            </span>
                                            {clienteNome && (
                                                <span className="text-xs text-gray-400">{session.phone}</span>
                                            )}
                                            {isNewContact && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200">
                                                    <UserPlus className="h-3 w-3" /> Novo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                            <span className="text-gray-400">Motivo:</span>{' '}
                                            {session.first_human_message || '—'}
                                        </p>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${status.color}`}>
                                        <StatusIcon className="h-3.5 w-3.5" />
                                        {status.label}
                                    </div>

                                    {/* Meta Info */}
                                    <div className="hidden md:flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                                        <span className="flex items-center gap-1">
                                            <Hash className="h-3.5 w-3.5" />
                                            {session.message_count} msgs
                                        </span>
                                        {duration && (
                                            <span className="flex items-center gap-1">
                                                <Timer className="h-3.5 w-3.5" />
                                                {duration}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDate(session.last_message_at)}
                                        </span>
                                    </div>

                                    {/* Expand Toggle */}
                                    <div className="text-gray-400 flex-shrink-0">
                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </div>
                                </button>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100">
                                        {/* Summary Bar */}
                                        <div className="px-5 py-3 bg-gray-50/80 flex flex-wrap gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5" />
                                                Início: {formatDate(session.first_message_at)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                Fim: {formatDate(session.last_message_at)}
                                            </span>
                                            {duration && (
                                                <span className="flex items-center gap-1">
                                                    <Timer className="h-3.5 w-3.5" />
                                                    Duração: {duration}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Hash className="h-3.5 w-3.5" />
                                                {session.message_count} mensagens
                                            </span>
                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${status.color} border sm:hidden`}>
                                                <StatusIcon className="h-3 w-3" />
                                                {status.label}
                                            </span>
                                        </div>

                                        {/* Last AI Response */}
                                        <div className="px-5 py-3 border-t border-gray-100">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                                Última resposta do Agente
                                            </p>
                                            <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-3 flex gap-2">
                                                <Bot className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                    {session.last_ai_message || 'Sem resposta registrada'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Chat Preview */}
                                        <div className="px-5 py-3 border-t border-gray-100">
                                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                                                Últimas mensagens
                                            </p>
                                            <div className="space-y-2 max-h-[32rem] overflow-y-auto">
                                                {session.last_messages.map((msg, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex gap-2 ${msg.type === 'ai' ? '' : 'flex-row-reverse'}`}
                                                    >
                                                        <div className={`flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${msg.type === 'ai'
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                            {msg.type === 'ai' ? (
                                                                <Bot className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <UserCircle className="h-3.5 w-3.5" />
                                                            )}
                                                        </div>
                                                        <div className={`max-w-[75%] rounded-xl px-3 py-2 ${msg.type === 'ai'
                                                            ? 'bg-blue-50 border border-blue-100 text-gray-700'
                                                            : 'bg-gray-100 border border-gray-200 text-gray-700'
                                                            }`}>
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                                {msg.content}
                                                            </p>
                                                            <span className="text-[10px] text-gray-400 mt-1 block">
                                                                {formatTime(msg.created_at)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
