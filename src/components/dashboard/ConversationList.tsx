'use client';

import { useState } from 'react';
import { User, Calendar, Clock, Hash, ChevronDown, ChevronUp, Bot, UserCircle, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

interface SessionData {
    session_id: string;
    phone: string;
    first_message_at: string;
    last_message_at: string;
    message_count: number;
    last_human_message: string;
    last_ai_message: string;
    status: 'transferred' | 'resolved' | 'active';
    last_messages: { type: string; content: string; created_at: string }[];
}

interface ConversationListProps {
    sessions: SessionData[];
    clienteMap: Record<string, string>;
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

const statusConfig = {
    resolved: {
        label: 'Resolvido',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle2
    },
    transferred: {
        label: 'Transferido',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: ArrowRightLeft
    },
    active: {
        label: 'Ativo',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: CheckCircle2
    },
};

export function ConversationList({ sessions, clienteMap }: ConversationListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (sessionId: string) => {
        setExpandedId(prev => prev === sessionId ? null : sessionId);
    };

    return (
        <div className="space-y-3">
            {sessions.map((session) => {
                const clienteNome = clienteMap[session.phone];
                const isExpanded = expandedId === session.session_id;
                const status = statusConfig[session.status];
                const StatusIcon = status.icon;

                return (
                    <div
                        key={session.session_id}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden transition-all duration-200 hover:shadow-md"
                    >
                        {/* Main Row */}
                        <button
                            onClick={() => toggleExpand(session.session_id)}
                            className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
                        >
                            {/* Avatar */}
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <User className="h-5 w-5" />
                            </div>

                            {/* Contact Info */}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">
                                        {clienteNome || session.phone}
                                    </span>
                                    {clienteNome && <span className="text-xs text-gray-400">{session.phone}</span>}
                                </div>
                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                    <span className="text-gray-400">Cliente:</span>{' '}
                                    {session.last_human_message || '—'}
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
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {formatDate(session.last_message_at)}
                                </span>
                            </div>

                            {/* Expand Toggle */}
                            <div className="text-gray-400 flex-shrink-0">
                                {isExpanded ? (
                                    <ChevronUp className="h-5 w-5" />
                                ) : (
                                    <ChevronDown className="h-5 w-5" />
                                )}
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
                                    <div className="space-y-2 max-h-80 overflow-y-auto">
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
    );
}
