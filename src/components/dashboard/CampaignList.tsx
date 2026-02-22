'use client';

import { useState } from 'react';
import {
    Megaphone,
    Search,
    Trash2,
    Send,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    Image as ImageIcon,
    FileText,
    XCircle,
    HelpCircle
} from 'lucide-react';
import { deleteCampaign, sendCampaign } from '@/app/dashboard/campanhas/actions';
import { useRouter } from 'next/navigation';

interface Campanha {
    id: string;
    nome: string;
    mensagem: string;
    imagem_url: string | null;
    publico_alvo: string;
    status: string;
    total_alvos: number;
    enviados: number;
    erros: number;
    created_at: string;
}

interface Template {
    name: string;
    status: string;
    category: string;
    language: string;
}

interface CampaignListProps {
    campanhas: Campanha[];
    templates: Template[];
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600', icon: Clock },
    processando: { label: 'Enviando...', color: 'bg-blue-100 text-blue-700', icon: Send },
    concluida: { label: 'Concluída', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    pausada: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
};

const templateStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
    APPROVED: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    PENDING:  { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    REJECTED: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: XCircle },
    PAUSED:   { label: 'Pausado', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
    DISABLED: { label: 'Desativado', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

export function CampaignList({ campanhas, templates }: CampaignListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSending, setIsSending] = useState<string | null>(null);
    const router = useRouter();

    const filtered = campanhas.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.publico_alvo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Tem certeza que deseja excluir a campanha "${name}"?`)) {
            setIsDeleting(id);
            try {
                await deleteCampaign(id);
                router.refresh();
            } catch {
                alert('Erro ao excluir campanha.');
            } finally {
                setIsDeleting(null);
            }
        }
    };

    const handleSend = async (id: string, name: string) => {
        if (confirm(`Deseja iniciar o envio da campanha "${name}"? Isso enviará mensagens para todos os destinatários.`)) {
            setIsSending(id);
            try {
                const result = await sendCampaign(id);
                if (result.error) {
                    alert(result.error);
                } else {
                    alert(`Campanha enviada! ✅ ${result.enviados} enviados, ${result.erros} erros.`);
                }
                router.refresh();
            } catch {
                alert('Erro ao enviar campanha.');
            } finally {
                setIsSending(null);
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Templates Status */}
            {templates.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <h2 className="text-sm font-bold text-gray-700">Templates WhatsApp</h2>
                        <span className="text-xs text-gray-400 font-medium">({templates.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {templates.map((t) => {
                            const cfg = templateStatusConfig[t.status] || { label: t.status, color: 'bg-gray-100 text-gray-500', icon: HelpCircle };
                            const StatusIcon = cfg.icon;
                            return (
                                <div key={t.name} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 text-xs">
                                    <span className="font-mono font-bold text-gray-700">{t.name}</span>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {cfg.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200/60">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar campanhas..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm p-12 text-center">
                    <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500 mb-1">Nenhuma campanha encontrada</h3>
                    <p className="text-sm text-gray-400">Crie sua primeira campanha para começar a enviar mensagens em massa.</p>
                </div>
            )}

            {/* Campaign cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((c) => {
                    const cfg = statusConfig[c.status] || statusConfig.rascunho;
                    const StatusIcon = cfg.icon;
                    const progress = c.total_alvos > 0 ? Math.round(((c.enviados + c.erros) / c.total_alvos) * 100) : 0;

                    return (
                        <div key={c.id} className="group bg-white rounded-2xl p-6 border border-gray-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                    <Megaphone className="h-6 w-6" />
                                </div>
                                <div className="flex items-center gap-1">
                                    {c.status === 'rascunho' && (
                                        <button
                                            onClick={() => handleSend(c.id, c.nome)}
                                            disabled={isSending === c.id}
                                            className="p-1.5 text-gray-300 hover:text-green-500 hover:bg-green-50 rounded-lg transition-all disabled:opacity-50"
                                            title="Enviar campanha"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(c.id, c.nome)}
                                        disabled={isDeleting === c.id || c.status === 'processando'}
                                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Title & audience */}
                            <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{c.nome}</h3>
                            <div className="flex items-center gap-2 mb-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    {cfg.label}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                    <Users className="h-3 w-3" />
                                    {c.publico_alvo === 'leads' ? 'Leads' : 'Vendedores'}
                                </span>
                                {c.imagem_url && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                                        <ImageIcon className="h-3 w-3" />
                                        Imagem
                                    </span>
                                )}
                            </div>

                            {/* Message preview */}
                            <p className="text-xs text-gray-500 line-clamp-2 mb-4 border-l-2 border-primary/20 pl-3 italic">{c.mensagem}</p>

                            {/* Progress */}
                            <div className="space-y-2 pt-4 border-t border-gray-50">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>{c.total_alvos} destinatários</span>
                                    <span className="font-bold">{c.enviados} enviados</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-primary to-blue-400 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                {c.erros > 0 && (
                                    <p className="text-[10px] text-red-400 font-medium">{c.erros} erro(s) no envio</p>
                                )}
                            </div>

                            {/* Date */}
                            <p className="text-[10px] text-gray-400 mt-3">
                                {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
