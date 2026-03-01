'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Bot, UserCircle, MessageSquare, RefreshCw, Loader2, User } from 'lucide-react';
import { getLeadMessages } from '@/app/dashboard/conversas/actions';

interface Cliente {
    id: number;
    nome: string;
    contato: string;
}

interface Mensagem {
    id: number;
    type: string;
    content: string;
    created_at: string;
}

export function InboxLayout({ clientes }: { clientes: Cliente[] }) {
    const [search, setSearch] = useState('');
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [messages, setMessages] = useState<Mensagem[]>([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const filtered = clientes.filter(c => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (c.nome?.toLowerCase() || '').includes(q) || (c.contato || '').includes(q);
    });

    useEffect(() => {
        if (selectedClient) {
            setLoading(true);
            getLeadMessages(selectedClient.contato).then((res) => {
                if (res.messages) {
                    setMessages(res.messages);
                }
                setLoading(false);
            });
        }
    }, [selectedClient]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    function formatTime(dateString: string) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function formatDateSeparator(dateString: string) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    return (
        <div className="flex h-[calc(100vh-140px)] bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
            {/* Lado Esquerdo - Contatos */}
            <div className="w-1/3 min-w-[300px] border-r border-gray-100 flex flex-col bg-gray-50/30">
                {/* Cabeçalho Esquerda */}
                <div className="p-4 border-b border-gray-100 bg-white">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Leads & Contatos</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar contato..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Lista de Contatos */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedClient(c)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white transition-colors border-b border-gray-50
                                ${selectedClient?.id === c.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}
                            `}
                        >
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                <User className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {c.nome || 'Sem Nome'}
                                </p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">
                                    {c.contato}
                                </p>
                            </div>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <div className="p-6 text-center text-sm text-gray-400">
                            Nenhum contato encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* Lado Direito - Chat Histórico */}
            <div className="flex-1 flex flex-col bg-slate-50 relative">
                {!selectedClient ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare className="h-16 w-16 mb-4 text-gray-200" />
                        <p className="text-lg font-medium text-gray-500">Selecione um contato</p>
                        <p className="text-sm mt-1">Clique num dos leads na barra lateral para ver o histórico.</p>
                    </div>
                ) : (
                    <>
                        {/* Header do Chat */}
                        <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between shadow-sm z-10 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900">{selectedClient.nome || 'Sem Nome'}</h3>
                                    <p className="text-xs text-gray-400">{selectedClient.contato}</p>
                                </div>
                            </div>
                        </div>

                        {/* Corpo do Chat */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-[#e5ddd5]/30">
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                    <p className="text-sm bg-white px-4 py-2 rounded-lg shadow-sm">Nenhum histórico de conversa registrado com este sistema AI.</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, idx) => {
                                        const isAI = msg.type === 'ai';
                                        const prevMsg = messages[idx - 1];
                                        const showDate = !prevMsg ||
                                            new Date(msg.created_at).toDateString() !== new Date(prevMsg.created_at).toDateString();

                                        return (
                                            <div key={idx}>
                                                {showDate && (
                                                    <div className="flex justify-center my-4">
                                                        <span className="text-[11px] font-medium bg-white px-3 py-1 rounded-full text-gray-500 shadow-sm border border-gray-100">
                                                            {formatDateSeparator(msg.created_at)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className={`flex gap-2.5 max-w-[85%] ${isAI ? 'ml-0' : 'ml-auto flex-row-reverse'} mb-3`}>
                                                    <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm ${isAI ? 'bg-white text-primary' : 'bg-primary text-white'
                                                        }`}>
                                                        {isAI ? <Bot className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
                                                    </div>

                                                    <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm flex flex-col ${isAI
                                                            ? 'bg-white border text-gray-700 border-gray-100 rounded-tl-none'
                                                            : 'bg-[#daf8cb] border border-[#cfecd0] text-gray-800 rounded-tr-none'
                                                        }`}>
                                                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                            {msg.content}
                                                        </p>
                                                        <span className="text-[10px] text-gray-400 mt-1 self-end leading-none">
                                                            {formatTime(msg.created_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
