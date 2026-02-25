'use client';

import { useState, useEffect, useRef } from 'react';
import { listTemplatesMeta, submitTemplateMeta, dispatchCampaign } from './actions';
import Link from 'next/link';
import {
    Loader2, CheckCircle2, AlertCircle, RefreshCw,
    FileText, Image as ImageIcon, FileOutput, Send, Clock, XCircle, UploadCloud,
    Users, Contact, Rocket, ChevronRight, X
} from 'lucide-react';

type Template = {
    name: string;
    status: string;
    category: string;
    language: string;
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; classes: string }> = {
    APPROVED: {
        label: 'Aprovado',
        icon: <CheckCircle2 className="h-3 w-3" />,
        classes: 'bg-green-50 text-green-700 border-green-200',
    },
    REJECTED: {
        label: 'Rejeitado',
        icon: <XCircle className="h-3 w-3" />,
        classes: 'bg-red-50 text-red-700 border-red-200',
    },
    PENDING: {
        label: 'Em análise',
        icon: <Clock className="h-3 w-3" />,
        classes: 'bg-amber-50 text-amber-700 border-amber-200',
    },
};

function getStatus(status: string) {
    return STATUS_CONFIG[status.toUpperCase()] ?? STATUS_CONFIG.PENDING;
}

export default function CampanhasPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Form state
    const [templateName, setTemplateName] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [headerType, setHeaderType] = useState<'NONE' | 'IMAGE' | 'DOCUMENT'>('NONE');
    const [headerFile, setHeaderFile] = useState<File | null>(null);
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [submitMessage, setSubmitMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dispatchMediaRef = useRef<HTMLInputElement>(null);

    // Dispatching state
    const [dispatchingTemplate, setDispatchingTemplate] = useState<Template | null>(null);
    const [audienceChoices, setAudienceChoices] = useState<Record<string, 'leads' | 'vendedores'>>({});
    const [campanhaName, setCampanhaName] = useState('');
    const [dispatchMedia, setDispatchMedia] = useState<File | null>(null);
    const [isSendingCampaign, setIsSendingCampaign] = useState(false);

    const fetchTemplates = async () => {
        setRefreshing(true);
        const result = await listTemplatesMeta();
        if (result.templates) setTemplates(result.templates);
        setLoading(false);
        setRefreshing(false);
    };

    useEffect(() => { fetchTemplates(); }, []);

    const handleHeaderTypeChange = (type: 'NONE' | 'IMAGE' | 'DOCUMENT') => {
        setHeaderType(type);
        setHeaderFile(null);
        setHeaderPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setHeaderFile(file);
        if (file && headerType === 'IMAGE') {
            setHeaderPreviewUrl(URL.createObjectURL(file));
        } else {
            setHeaderPreviewUrl(null);
        }
    };

    const handleSubmitTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateName.trim() || !mensagem.trim()) {
            alert('Preencha o nome do template e a mensagem.');
            return;
        }
        setSubmitStatus('sending');
        setSubmitMessage('');

        const formData = new FormData();
        formData.set('template_name', templateName);
        formData.set('template_body', mensagem);
        formData.set('header_type', headerType);
        if (headerFile) formData.set('header_file', headerFile);

        const result = await submitTemplateMeta(formData);

        if (result.error) {
            setSubmitStatus('error');
            setSubmitMessage(result.error);
        } else {
            setSubmitStatus('success');
            setSubmitMessage(`Template "${result.templateName}" enviado para aprovação!`);
            setTemplateName('');
            setMensagem('');
            setHeaderType('NONE');
            setHeaderFile(null);
            setHeaderPreviewUrl(null);
            fetchTemplates();
            setTimeout(() => setSubmitStatus('idle'), 4000);
        }
    };

    const approvedTemplates = templates.filter(t => t.status.toUpperCase() === 'APPROVED');
    const pendingTemplates = templates.filter(t => t.status.toUpperCase() !== 'APPROVED');

    const toggleAudience = (templateName: string, audience: 'leads' | 'vendedores') => {
        setAudienceChoices(prev => {
            const current = prev[templateName] === audience ? undefined : audience;
            return { ...prev, [templateName]: audience };
        });
    };

    const handleOpenDispatch = (tpl: Template) => {
        setDispatchingTemplate(tpl);
        setCampanhaName(`campanha_${tpl.name}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}`);
        setDispatchMedia(null);
    };

    const handleConfirmDispatch = async () => {
        if (!dispatchingTemplate || !campanhaName.trim()) return;
        const audience = audienceChoices[dispatchingTemplate.name] || 'leads';

        setIsSendingCampaign(true);

        const formData = new FormData();
        formData.set('template_name', dispatchingTemplate.name);
        formData.set('campanha_name', campanhaName);
        formData.set('audience', audience);
        if (dispatchMedia) formData.set('media_file', dispatchMedia);

        const result = await dispatchCampaign(formData);

        setIsSendingCampaign(false);

        if (result.error) {
            alert(`Erro: ${result.error}`);
        } else {
            alert(`Campanha "${campanhaName}" criada e disparando para ${audience.toUpperCase()}!`);
            setDispatchingTemplate(null);
            setCampanhaName('');
            setDispatchMedia(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Campanhas</h1>
                    <p className="text-sm text-gray-500">Crie, gerencie e teste seus templates da Meta.</p>
                </div>
            </div>

            {/* Main grid: 50/50 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                {/* ── LEFT: Form ───────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-primary/20 p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-gray-800">Solicitar Novo Template</h3>
                            <p className="text-xs text-gray-500">A Meta leva em média 5 minutos para aprovar.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitTemplate} className="space-y-5">

                        {/* Template name */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                Título da Campanha <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all text-sm p-3 border"
                                placeholder="ex: promocao_janeiro_2026"
                                value={templateName}
                                onChange={e =>
                                    setTemplateName(
                                        e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                                    )
                                }
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Apenas letras minúsculas, números e underline.</p>
                        </div>

                        {/* Header type */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Cabeçalho da Mensagem
                            </label>
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {([
                                    { type: 'NONE', icon: null, label: 'Nenhum' },
                                    { type: 'IMAGE', icon: <ImageIcon className="h-5 w-5" />, label: 'Imagem' },
                                    { type: 'DOCUMENT', icon: <FileOutput className="h-5 w-5" />, label: 'PDF' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.type}
                                        type="button"
                                        onClick={() => handleHeaderTypeChange(opt.type)}
                                        className={`p-3 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-1.5 ${headerType === opt.type
                                            ? 'border-primary bg-primary/5 text-primary'
                                            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        {opt.icon}
                                        <span className="text-xs font-bold">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* File upload area */}
                            {headerType !== 'NONE' && (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary/40 transition-all p-4 flex flex-col items-center gap-2"
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept={headerType === 'IMAGE' ? 'image/jpeg,image/png' : 'application/pdf'}
                                        onChange={handleFileChange}
                                    />
                                    {headerFile ? (
                                        <>
                                            {headerPreviewUrl ? (
                                                <img
                                                    src={headerPreviewUrl}
                                                    alt="preview"
                                                    className="h-24 object-cover rounded-lg border border-gray-200"
                                                />
                                            ) : (
                                                <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center text-red-500">
                                                    <FileOutput className="h-6 w-6" />
                                                </div>
                                            )}
                                            <p className="text-xs font-medium text-gray-700">{headerFile.name}</p>
                                            <p className="text-[10px] text-gray-400">Clique para trocar</p>
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="h-7 w-7 text-gray-300" />
                                            <p className="text-xs font-medium text-gray-500">
                                                {headerType === 'IMAGE' ? 'Selecionar JPEG ou PNG' : 'Selecionar PDF'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">Clique para escolher o arquivo</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Body text */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                Texto para Aprovação <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                rows={5}
                                className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all text-sm p-3 border resize-none"
                                placeholder="Olá! Temos uma novidade especial para você..."
                                value={mensagem}
                                onChange={e => setMensagem(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">{mensagem.length} / 1024 caracteres</p>
                        </div>

                        {/* Feedback */}
                        {submitStatus === 'success' && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm">
                                <CheckCircle2 className="h-5 w-5 flex-shrink-0" /> {submitMessage}
                            </div>
                        )}
                        {submitStatus === 'error' && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-sm">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" /> {submitMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitStatus === 'sending'}
                            className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {submitStatus === 'sending' ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Enviando para a Meta...</>
                            ) : (
                                <><Send className="h-4 w-4" /> Enviar para Aprovação</>
                            )}
                        </button>
                    </form>
                </div>

                {/* ── RIGHT: Preview + Approved List ───────────── */}
                <div className="space-y-6">

                    {/* Preview */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm">📱</span>
                            <h3 className="font-bold text-sm text-gray-800">Preview do Template</h3>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Visualize como sua mensagem chegará no WhatsApp.</p>

                        <div className="bg-[#E5DDD5] rounded-xl p-4 min-h-[260px] flex flex-col gap-1 shadow-inner">
                            <div className="bg-white rounded-lg shadow-sm max-w-[92%] space-y-2 relative pb-6 border border-gray-100 overflow-hidden">

                                {/* Header preview */}
                                {headerType === 'IMAGE' && (
                                    headerPreviewUrl ? (
                                        <img
                                            src={headerPreviewUrl}
                                            alt="header"
                                            className="w-full h-36 object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-36 bg-gray-100 flex flex-col items-center justify-center text-gray-300 border-b border-gray-100">
                                            <ImageIcon className="h-8 w-8 mb-1" />
                                            <span className="text-[10px] font-medium">Espaço da Imagem</span>
                                        </div>
                                    )
                                )}
                                {headerType === 'DOCUMENT' && (
                                    <div className="w-full bg-red-50 p-3 flex items-center gap-3 border-b border-red-100">
                                        <div className="h-9 w-9 bg-red-100 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                                            <FileOutput className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">
                                                {headerFile?.name ?? 'documento.pdf'}
                                            </p>
                                            <p className="text-[10px] text-gray-400">PDF · Clique para abrir</p>
                                        </div>
                                    </div>
                                )}

                                {/* Body */}
                                <p className="text-[13px] text-gray-800 px-3 pt-1 whitespace-pre-wrap leading-relaxed">
                                    {mensagem || <span className="text-gray-300">O texto da sua mensagem aparecerá aqui...</span>}
                                </p>

                                {/* Footer */}
                                <p className="text-[10px] text-gray-400 px-3 leading-relaxed">
                                    Deseja continuar recebendo ofertas da Indústria Arcoverde?
                                </p>

                                <span className="text-[10px] text-gray-400 absolute bottom-1 right-2">12:00 ✓✓</span>
                            </div>

                            {/* Quick reply button */}
                            <div className="bg-white rounded-lg shadow-sm max-w-[92%] py-2 text-center border border-gray-100">
                                <span className="text-xs text-blue-500 font-semibold">Parar Ofertas</span>
                            </div>
                        </div>
                    </div>

                    {/* Approved Templates List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h2 className="font-bold text-sm text-gray-800">Templates Aprovados pela Meta</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Prontos para usar em campanhas.</p>
                            </div>
                            <button
                                onClick={fetchTemplates}
                                disabled={refreshing}
                                title="Atualizar"
                                className="p-2 border border-gray-200 bg-white shadow-sm rounded-lg text-gray-500 hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                            </button>
                        </div>

                        {loading ? (
                            <div className="p-8 flex justify-center">
                                <Loader2 className="h-7 w-7 animate-spin text-primary/40" />
                            </div>
                        ) : approvedTemplates.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <CheckCircle2 className="h-9 w-9 mx-auto text-gray-200 mb-2" />
                                <p className="text-sm font-medium">Nenhum template aprovado ainda.</p>
                                <p className="text-xs text-gray-400 mt-1">Templates aprovados aparecem aqui.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-50">
                                {approvedTemplates.map((tpl, i) => (
                                    <li key={i} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors">
                                        <div className="flex-1 min-w-[140px]">
                                            <p className="text-sm font-bold text-gray-800 truncate">{tpl.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wide">{tpl.category} · {tpl.language}</p>
                                        </div>

                                        {/* Audience Selection Column */}
                                        <div className="flex items-center bg-gray-100 p-1 rounded-xl w-fit">
                                            <button
                                                onClick={() => toggleAudience(tpl.name, 'leads')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${(audienceChoices[tpl.name] || 'leads') === 'leads'
                                                    ? 'bg-white text-primary shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                <Users className="h-3 w-3" />
                                                Leads
                                            </button>
                                            <button
                                                onClick={() => toggleAudience(tpl.name, 'vendedores')}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${audienceChoices[tpl.name] === 'vendedores'
                                                    ? 'bg-white text-primary shadow-sm'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                            >
                                                <Contact className="h-3 w-3" />
                                                Vendedores
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatus(tpl.status).classes}`}>
                                                {getStatus(tpl.status).icon}
                                                {getStatus(tpl.status).label}
                                            </span>

                                            <button
                                                onClick={() => handleOpenDispatch(tpl)}
                                                className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm group"
                                                title="Disparar Campanha"
                                            >
                                                <Rocket className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Pending / rejected section */}
                        {!loading && pendingTemplates.length > 0 && (
                            <>
                                <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/60">
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Em análise / Rejeitados</p>
                                </div>
                                <ul className="divide-y divide-gray-50">
                                    {pendingTemplates.map((tpl, i) => (
                                        <li key={i} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/80 transition-colors opacity-70">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{tpl.name}</p>
                                                <p className="text-[11px] text-gray-400 uppercase font-medium tracking-wide">{tpl.category} · {tpl.language}</p>
                                            </div>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatus(tpl.status).classes}`}>
                                                {getStatus(tpl.status).icon}
                                                {getStatus(tpl.status).label}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Dispatch Modal Overlay */}
            {dispatchingTemplate && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Modal Header */}
                        <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-primary" />
                                <h3 className="font-bold text-gray-800">Finalizar Disparo</h3>
                            </div>
                            <button
                                onClick={() => setDispatchingTemplate(null)}
                                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            <div>
                                <p className="text-xs text-gray-500 mb-4">
                                    Enviando template <span className="font-bold text-primary">"{dispatchingTemplate.name}"</span> para
                                    <span className="font-bold text-gray-800 uppercase"> {audienceChoices[dispatchingTemplate.name] || 'leads'}</span>.
                                </p>

                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome Interno da Campanha
                                </label>
                                <input
                                    type="text"
                                    className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all text-sm p-3 border"
                                    placeholder="ex: Campanha Especial Lançamento"
                                    value={campanhaName}
                                    onChange={e => setCampanhaName(e.target.value)}
                                />
                            </div>

                            {/* Optional Media (Simulated logic based on header type) */}
                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                                <label className="block text-[11px] font-bold text-primary uppercase mb-2">
                                    Mídia do Cabeçalho
                                </label>
                                <div
                                    onClick={() => dispatchMediaRef.current?.click()}
                                    className="cursor-pointer border-2 border-dashed border-primary/20 bg-white hover:border-primary/40 rounded-xl p-4 flex flex-col items-center gap-2 transition-all"
                                >
                                    <input
                                        type="file"
                                        className="hidden"
                                        ref={dispatchMediaRef}
                                        onChange={(e) => setDispatchMedia(e.target.files?.[0] || null)}
                                    />
                                    {dispatchMedia ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            <span className="text-xs font-medium text-gray-700">{dispatchMedia.name}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="h-5 w-5 text-gray-400" />
                                            <span className="text-xs text-gray-500 font-medium text-center line-clamp-1">Carregar imagem ou PDF</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 pt-0 flex gap-3">
                            <button
                                onClick={() => setDispatchingTemplate(null)}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDispatch}
                                disabled={!campanhaName || isSendingCampaign}
                                className="flex-[2] bg-primary text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Confirmar Envio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
