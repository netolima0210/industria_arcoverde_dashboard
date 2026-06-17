'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
    listTemplatesMeta, submitTemplateMeta, dispatchCampaign, listCampanhas,
    getCampanhaEnvios, uploadCampaignMedia, deleteCampaign, getActiveAudienceCount,
    deleteTemplateMeta, cancelScheduledCampaign
} from './actions';
import {
    Loader2, CheckCircle2, AlertCircle, RefreshCw,
    FileText, Image as ImageIcon, FileOutput, Send, Clock, XCircle, UploadCloud,
    Users, Contact, Rocket, ChevronRight, ChevronDown, X, Megaphone, History,
    Trash2, BookOpen, CalendarClock, CalendarX, Search, Plus
} from 'lucide-react';
import TemplateLibrary from './TemplateLibrary';
import TemplateLibraryWizard from './TemplateLibraryWizard';
import type { LibraryTemplate } from './template-library';

type Tab = 'templates' | 'library' | 'history';

type Template = {
    name: string;
    status: string;
    category: string;
    language: string;
    has_media_header?: boolean;
    header_format?: string;
    body_preview?: string;
};

type Campanha = {
    id: string;
    nome: string;
    mensagem: string;
    publico_alvo: string;
    status: string;
    total_alvos: number;
    enviados: number;
    erros: number;
    created_at: string;
    scheduled_at: string | null;
};

type Envio = {
    id: string;
    status: string;
    mensagem_erro: string | null;
    enviado_at: string | null;
    destinatario_nome: string;
};

const META_STATUS_MAP: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    APPROVED: { label: 'Aprovado',   classes: 'bg-green-50 text-green-700 border-green-200',  icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED: { label: 'Rejeitado',  classes: 'bg-red-50 text-red-700 border-red-200',        icon: <XCircle className="h-3 w-3" /> },
    PENDING:  { label: 'Em análise', classes: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock className="h-3 w-3" /> },
};

const CAMPANHA_STATUS: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    rascunho:    { label: 'Rascunho',    classes: 'bg-gray-100 text-gray-600',     icon: <Clock className="h-3 w-3" /> },
    agendada:    { label: 'Agendada',    classes: 'bg-purple-100 text-purple-700', icon: <CalendarClock className="h-3 w-3" /> },
    processando: { label: 'Enviando...', classes: 'bg-blue-100 text-blue-700',     icon: <Loader2 className="h-3 w-3 animate-spin" /> },
    concluida:   { label: 'Concluída',   classes: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="h-3 w-3" /> },
};

const CATEGORY_LABELS: Record<string, string> = {
    MARKETING:      'Marketing',
    UTILITY:        'Utilidade',
    AUTHENTICATION: 'Autenticação',
};

function getMetaStatus(status: string) {
    return META_STATUS_MAP[status.toUpperCase()] ?? META_STATUS_MAP.PENDING;
}
function getCampanhaStatus(status: string) {
    return CAMPANHA_STATUS[status] ?? CAMPANHA_STATUS.rascunho;
}

export default function CampanhasPage() {
    const [activeTab, setActiveTab] = useState<Tab>('templates');

    // Templates
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Template filters
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [templateSearch, setTemplateSearch] = useState('');

    // Create template modal
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [mensagem, setMensagem] = useState('');
    const [headerType, setHeaderType] = useState<'NONE' | 'IMAGE' | 'DOCUMENT'>('NONE');
    const [headerFile, setHeaderFile] = useState<File | null>(null);
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [submitMessage, setSubmitMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Dispatch modal
    const [dispatchingTemplate, setDispatchingTemplate] = useState<Template | null>(null);
    const [dispatchAudience, setDispatchAudience] = useState<'leads' | 'vendedores'>('leads');
    const [isSendingCampaign, setIsSendingCampaign] = useState(false);
    const [dispatchImageUrl, setDispatchImageUrl] = useState('');
    const [dispatchUploading, setDispatchUploading] = useState(false);
    const dispatchFileRef = useRef<HTMLInputElement>(null);
    const [activeCount, setActiveCount] = useState<number | null>(null);
    const [deletingTemplate, setDeletingTemplate] = useState<string | null>(null);

    // Scheduling
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Library
    const [libraryWizardTemplate, setLibraryWizardTemplate] = useState<LibraryTemplate | null>(null);

    // Campanhas
    const [campanhas, setCampanhas] = useState<Campanha[]>([]);
    const [loadingCampanhas, setLoadingCampanhas] = useState(true);
    const [expandedCampanha, setExpandedCampanha] = useState<string | null>(null);
    const [enviosMap, setEnviosMap] = useState<Record<string, Envio[]>>({});
    const [loadingEnvios, setLoadingEnvios] = useState<string | null>(null);
    const [cancellingCampaign, setCancellingCampaign] = useState<string | null>(null);

    // Computed counts
    const PENDING_STATUSES = ['PENDING', 'IN_APPEAL', 'PENDING_DELETION', 'FLAGGED', 'PAUSED'];
    const approvedCount = useMemo(() => templates.filter(t => t.status.toUpperCase() === 'APPROVED').length, [templates]);
    const pendingCount  = useMemo(() => templates.filter(t => PENDING_STATUSES.includes(t.status.toUpperCase())).length, [templates]);
    const rejectedCount = useMemo(() => templates.filter(t => t.status.toUpperCase() === 'REJECTED').length, [templates]);

    const filteredTemplates = useMemo(() => templates.filter(t => {
        if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
        if (filterStatus === 'APPROVED' && t.status.toUpperCase() !== 'APPROVED') return false;
        if (filterStatus === 'PENDING'  && !PENDING_STATUSES.includes(t.status.toUpperCase())) return false;
        if (filterStatus === 'REJECTED' && t.status.toUpperCase() !== 'REJECTED') return false;
        if (templateSearch) {
            const q = templateSearch.toLowerCase();
            if (!t.name.toLowerCase().includes(q) && !t.body_preview?.toLowerCase().includes(q)) return false;
        }
        return true;
    }), [templates, filterCategory, filterStatus, templateSearch]);

    // Audience count
    useEffect(() => {
        if (!dispatchingTemplate) { setActiveCount(null); return; }
        let stale = false;
        setActiveCount(null);
        getActiveAudienceCount(dispatchAudience).then(n => { if (!stale) setActiveCount(n); });
        return () => { stale = true; };
    }, [dispatchingTemplate, dispatchAudience]);

    const fetchTemplates = async () => {
        setRefreshing(true);
        const result = await listTemplatesMeta();
        if (result.templates) setTemplates(result.templates);
        setLoading(false);
        setRefreshing(false);
    };
    const fetchCampanhas = async () => {
        setLoadingCampanhas(true);
        const result = await listCampanhas();
        if (result.campanhas) setCampanhas(result.campanhas as Campanha[]);
        setLoadingCampanhas(false);
    };

    useEffect(() => { fetchTemplates(); fetchCampanhas(); }, []);

    // ── Create form ────────────────────────────────────────────
    const handleHeaderTypeChange = (type: 'NONE' | 'IMAGE' | 'DOCUMENT') => {
        setHeaderType(type); setHeaderFile(null); setHeaderPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setHeaderFile(file);
        setHeaderPreviewUrl(file && headerType === 'IMAGE' ? URL.createObjectURL(file) : null);
    };
    const handleSubmitTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateName.trim() || !mensagem.trim()) { alert('Preencha o nome e a mensagem.'); return; }
        setSubmitStatus('sending');
        const fd = new FormData();
        fd.set('template_name', templateName); fd.set('template_body', mensagem); fd.set('header_type', headerType);
        if (headerFile) fd.set('header_file', headerFile);
        const result = await submitTemplateMeta(fd);
        if (result.error) {
            setSubmitStatus('error'); setSubmitMessage(result.error);
        } else {
            setSubmitStatus('success'); setSubmitMessage(`Template "${result.templateName}" enviado!`);
            setTemplateName(''); setMensagem(''); setHeaderType('NONE'); setHeaderFile(null); setHeaderPreviewUrl(null);
            fetchTemplates();
            setTimeout(() => { setSubmitStatus('idle'); setShowCreateForm(false); }, 2500);
        }
    };

    // ── Dispatch ───────────────────────────────────────────────
    const handleOpenDispatch = (tpl: Template) => {
        setDispatchingTemplate(tpl); setDispatchAudience('leads');
        setDispatchImageUrl(''); setScheduledDate(''); setScheduledTime('');
    };
    const handleDispatchFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setDispatchUploading(true);
        const fd = new FormData(); fd.set('file', file);
        const result = await uploadCampaignMedia(fd);
        if (result.error) alert(`Erro no upload: ${result.error}`);
        else if (result.url) setDispatchImageUrl(result.url);
        setDispatchUploading(false);
        if (dispatchFileRef.current) dispatchFileRef.current.value = '';
    };
    const handleConfirmDispatch = async () => {
        if (!dispatchingTemplate) return;
        if (dispatchingTemplate.has_media_header && !dispatchImageUrl.trim()) { alert('Selecione a imagem antes de disparar.'); return; }
        let scheduledAtISO: string | null = null;
        if (scheduledDate) {
            const dt = new Date(`${scheduledDate}T${scheduledTime || '00:00'}:00-03:00`);
            if (isNaN(dt.getTime())) { alert('Data/hora inválida.'); return; }
            if (dt <= new Date()) { alert('O horário deve ser no futuro.'); return; }
            scheduledAtISO = dt.toISOString();
        }
        setIsSendingCampaign(true);
        const fd = new FormData();
        fd.set('template_name', dispatchingTemplate.name); fd.set('audience', dispatchAudience);
        if (dispatchImageUrl.trim()) fd.set('image_url', dispatchImageUrl.trim());
        if (scheduledAtISO) fd.set('scheduled_at', scheduledAtISO);
        try {
            const result = await dispatchCampaign(fd);
            if (result.error) { alert(`Erro: ${result.error}`); }
            else if (result.scheduled) { alert(`Campanha agendada para ${scheduledDate} às ${scheduledTime || '00:00'} (Brasília)!`); await fetchCampanhas(); setActiveTab('history'); }
            else { alert(`Campanha disparada para ${dispatchAudience.toUpperCase()}!`); await fetchCampanhas(); }
        } catch { alert('Falha ao disparar.'); }
        finally { setIsSendingCampaign(false); setDispatchingTemplate(null); }
    };

    const handleDeleteTemplate = async (name: string) => {
        if (!window.confirm(`Excluir "${name}" da Meta? Ação irreversível.`)) return;
        setDeletingTemplate(name);
        const res = await deleteTemplateMeta(name);
        setDeletingTemplate(null);
        if (res?.error) alert(`Erro: ${res.error}`);
        else setTemplates(prev => prev.filter(t => t.name !== name));
    };
    const handleCancelScheduled = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('Cancelar o agendamento?')) return;
        setCancellingCampaign(id);
        const res = await cancelScheduledCampaign(id);
        setCancellingCampaign(null);
        if (res?.error) alert(`Erro: ${res.error}`); else await fetchCampanhas();
    };
    const handleToggleEnvios = async (id: string) => {
        if (expandedCampanha === id) { setExpandedCampanha(null); return; }
        setExpandedCampanha(id);
        if (enviosMap[id]) return;
        setLoadingEnvios(id);
        const result = await getCampanhaEnvios(id);
        if (result.envios) setEnviosMap(prev => ({ ...prev, [id]: result.envios }));
        setLoadingEnvios(null);
    };
    const handleLibraryWizardSubmit = async (fd: FormData) => {
        const result = await submitTemplateMeta(fd);
        if (result.error) throw new Error(result.error);
        fetchTemplates();
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const categoryChips = [
        { key: 'ALL', label: 'TODOS' },
        { key: 'MARKETING', label: 'MARKETING' },
        { key: 'UTILITY', label: 'UTILIDADE' },
        { key: 'AUTHENTICATION', label: 'AUTENTICAÇÃO' },
    ];
    const statusChips = [
        { key: 'APPROVED', label: 'Aprovados',  count: approvedCount },
        { key: 'PENDING',  label: 'Em análise', count: pendingCount },
        { key: 'REJECTED', label: 'Rejeitados', count: rejectedCount },
        { key: 'ALL',      label: 'Todos',      count: templates.length },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Campanhas</h1>
                <p className="text-sm text-gray-500">Crie, gerencie e dispare campanhas via WhatsApp.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-200/60 p-1.5 w-fit">
                {([
                    { id: 'templates' as Tab, label: 'Meus Templates', icon: FileText },
                    { id: 'library'   as Tab, label: 'Biblioteca Meta', icon: BookOpen },
                    { id: 'history'   as Tab, label: 'Histórico',        icon: History },
                ] as const).map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── ABA: MEUS TEMPLATES ── */}
            {activeTab === 'templates' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">

                    {/* Filter chips */}
                    <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                            {categoryChips.map(chip => (
                                <button key={chip.key} onClick={() => setFilterCategory(chip.key)}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                        filterCategory === chip.key
                                            ? 'bg-gray-800 text-white border-gray-800'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            ))}

                            <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

                            {statusChips.map(chip => (
                                <button key={chip.key} onClick={() => setFilterStatus(chip.key)}
                                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                        filterStatus === chip.key
                                            ? 'bg-primary/10 text-primary border-primary/30'
                                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                                    }`}
                                >
                                    {chip.label} ({chip.count})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search + Actions bar */}
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input type="text" placeholder="Buscar templates..." value={templateSearch}
                                onChange={e => setTemplateSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all"
                            />
                        </div>
                        <div className="flex-1" />
                        <button onClick={fetchTemplates} disabled={refreshing} title="Sincronizar com a Meta"
                            className="p-2 border border-gray-200 bg-white shadow-sm rounded-xl text-gray-500 hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
                        </button>
                        <button onClick={() => setShowCreateForm(true)}
                            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-all">
                            <Plus className="h-4 w-4" /> Novo Template
                        </button>
                    </div>

                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_110px_110px_3fr_76px] gap-4 px-5 py-2.5 bg-gray-50/70 border-b border-gray-100">
                        {['NOME', 'STATUS', 'CATEGORIA', 'CONTEÚDO', 'AÇÕES'].map(col => (
                            <span key={col} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{col}</span>
                        ))}
                    </div>

                    {/* Table body */}
                    {loading ? (
                        <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary/30" /></div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <FileText className="h-10 w-10 mx-auto text-gray-200" />
                            <p className="text-sm font-bold text-gray-500">Nenhum template encontrado</p>
                            <p className="text-xs text-gray-400">Tente ajustar os filtros ou clique em sincronizar.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {filteredTemplates.map(tpl => {
                                const st = getMetaStatus(tpl.status);
                                const isApproved = tpl.status.toUpperCase() === 'APPROVED';
                                return (
                                    <li key={tpl.name}
                                        className="grid grid-cols-[2fr_110px_110px_3fr_76px] gap-4 items-center px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                                    >
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 truncate">{tpl.name}</p>
                                            <p className="text-[10px] text-gray-400 uppercase font-medium mt-0.5">{tpl.language}</p>
                                        </div>

                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border w-fit ${st.classes}`}>
                                            {st.icon} {st.label}
                                        </span>

                                        <span className="text-xs text-gray-500 font-medium">
                                            {CATEGORY_LABELS[tpl.category] ?? tpl.category}
                                        </span>

                                        <p className="text-xs text-gray-400 truncate">
                                            {tpl.body_preview
                                                ? tpl.body_preview.replace(/\{\{\d+\}\}/g, '…').slice(0, 100)
                                                : <span className="text-gray-300">—</span>
                                            }
                                        </p>

                                        <div className="flex items-center gap-1.5">
                                            {isApproved && (
                                                <button onClick={() => handleOpenDispatch(tpl)} title="Disparar campanha"
                                                    className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all">
                                                    <Rocket className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteTemplate(tpl.name)} disabled={deletingTemplate === tpl.name}
                                                title="Excluir da Meta"
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50">
                                                {deletingTemplate === tpl.name
                                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    : <Trash2 className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* ── ABA: BIBLIOTECA META ── */}
            {activeTab === 'library' && (
                <TemplateLibrary onUseTemplate={t => setLibraryWizardTemplate(t)} />
            )}

            {/* ── ABA: HISTÓRICO ── */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                <History className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="font-bold text-sm text-gray-800">Campanhas Enviadas</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Histórico de disparos e status de cada envio.</p>
                            </div>
                        </div>
                        <button onClick={fetchCampanhas} disabled={loadingCampanhas}
                            className="p-2 border border-gray-200 bg-white shadow-sm rounded-xl text-gray-500 hover:text-primary hover:border-primary/40 transition-all disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${loadingCampanhas ? 'animate-spin text-primary' : ''}`} />
                        </button>
                    </div>

                    {loadingCampanhas ? (
                        <div className="py-16 flex justify-center"><Loader2 className="h-7 w-7 animate-spin text-primary/30" /></div>
                    ) : campanhas.length === 0 ? (
                        <div className="py-16 text-center space-y-2">
                            <Megaphone className="h-9 w-9 mx-auto text-gray-200" />
                            <p className="text-sm font-bold text-gray-500">Nenhuma campanha enviada ainda.</p>
                            <p className="text-xs text-gray-400">Dispare sua primeira campanha na aba Meus Templates.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {campanhas.map(camp => {
                                const st = getCampanhaStatus(camp.status);
                                const isExpanded = expandedCampanha === camp.id;
                                const isScheduled = camp.status === 'agendada';
                                const envios = enviosMap[camp.id];
                                return (
                                    <li key={camp.id}>
                                        <div role="button" tabIndex={0}
                                            onClick={() => handleToggleEnvios(camp.id)}
                                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleEnvios(camp.id); } }}
                                            className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors cursor-pointer"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate">{camp.nome}</p>
                                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                    <span className="text-[10px] text-gray-400 uppercase font-medium">
                                                        {camp.publico_alvo === 'leads' ? '👥 Leads' : '🤝 Vendedores'}
                                                    </span>
                                                    {camp.status === 'concluida' && (
                                                        <span className="text-[10px] text-gray-400">
                                                            ✅ {camp.enviados} enviados {camp.erros > 0 ? `· ❌ ${camp.erros} erros` : ''}
                                                        </span>
                                                    )}
                                                    {isScheduled && camp.scheduled_at && (
                                                        <span className="text-[10px] text-purple-600 font-medium">
                                                            📅 {new Date(camp.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 ml-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${st.classes}`}>
                                                    {st.icon} {st.label}
                                                </span>
                                                {isScheduled && (
                                                    <button type="button" title="Cancelar agendamento"
                                                        onClick={e => handleCancelScheduled(camp.id, e)}
                                                        disabled={cancellingCampaign === camp.id}
                                                        className="p-1.5 text-purple-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50">
                                                        {cancellingCampaign === camp.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarX className="h-4 w-4" />}
                                                    </button>
                                                )}
                                                <button type="button"
                                                    onClick={async e => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Excluir histórico da campanha "${camp.nome}"?`)) {
                                                            const res = await deleteCampaign(camp.id);
                                                            if (res?.error) alert(res.error); else fetchCampanhas();
                                                        }
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-5 pb-4 bg-gray-50/50 border-t border-gray-100">
                                                {isScheduled ? (
                                                    <div className="py-4 text-center">
                                                        <CalendarClock className="h-8 w-8 mx-auto text-purple-200 mb-2" />
                                                        <p className="text-sm text-purple-600 font-medium">Campanha agendada</p>
                                                        <p className="text-xs text-gray-400 mt-1">Os envios aparecerão aqui após o disparo automático.</p>
                                                    </div>
                                                ) : loadingEnvios === camp.id ? (
                                                    <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary/40" /></div>
                                                ) : !envios || envios.length === 0 ? (
                                                    <p className="text-xs text-gray-400 py-3">Nenhum envio registrado.</p>
                                                ) : (
                                                    <div className="mt-3 space-y-1.5">
                                                        <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 pb-1">
                                                            <span>Destinatário</span><span>Status</span><span>Detalhe</span>
                                                        </div>
                                                        {envios.map((envio, idx) => (
                                                            <div key={envio.id || idx} className="grid grid-cols-3 gap-2 items-center px-3 py-2 bg-white rounded-xl border border-gray-100 text-xs">
                                                                <span className="font-medium text-gray-700 truncate">{envio.destinatario_nome}</span>
                                                                <span>
                                                                    {envio.status === 'enviado'
                                                                        ? <span className="inline-flex items-center gap-1 text-green-600 font-bold"><CheckCircle2 className="h-3 w-3" /> Enviado</span>
                                                                        : envio.status === 'erro'
                                                                            ? <span className="inline-flex items-center gap-1 text-red-500 font-bold"><XCircle className="h-3 w-3" /> Erro</span>
                                                                            : <span className="inline-flex items-center gap-1 text-amber-500 font-bold"><Clock className="h-3 w-3" /> Pendente</span>
                                                                    }
                                                                </span>
                                                                <span className="text-gray-400 truncate">
                                                                    {envio.status === 'erro' && envio.mensagem_erro ? envio.mensagem_erro
                                                                        : envio.enviado_at ? new Date(envio.enviado_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                                                        : '—'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* ── MODAL: CRIAR TEMPLATE ── */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><FileText className="h-4 w-4" /></div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Novo Template</h3>
                                    <p className="text-xs text-gray-500">A Meta leva em média 5 minutos para aprovar.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2">
                            {/* Form */}
                            <form onSubmit={handleSubmitTemplate} className="p-6 space-y-5 border-r border-gray-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Título da Campanha <span className="text-red-500">*</span></label>
                                    <input type="text" required
                                        className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary focus:bg-white transition-all"
                                        placeholder="ex: promocao_janeiro"
                                        value={templateName}
                                        onChange={e => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Letras minúsculas, números e underline.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-2">Cabeçalho</label>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {([
                                            { type: 'NONE' as const, label: 'Nenhum', icon: null },
                                            { type: 'IMAGE' as const, label: 'Imagem', icon: <ImageIcon className="h-4 w-4" /> },
                                            { type: 'DOCUMENT' as const, label: 'PDF', icon: <FileOutput className="h-4 w-4" /> },
                                        ]).map(opt => (
                                            <button key={opt.type} type="button" onClick={() => handleHeaderTypeChange(opt.type)}
                                                className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${headerType === opt.type ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}>
                                                {opt.icon}<span className="text-[10px] font-bold">{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    {headerType !== 'NONE' && (
                                        <div onClick={() => fileInputRef.current?.click()}
                                            className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary/40 p-4 flex flex-col items-center gap-2 transition-all">
                                            <input ref={fileInputRef} type="file" className="hidden"
                                                accept={headerType === 'IMAGE' ? 'image/jpeg,image/png' : 'application/pdf'}
                                                onChange={handleFileChange} />
                                            {headerFile ? (
                                                <>
                                                    {headerPreviewUrl ? <img src={headerPreviewUrl} alt="preview" className="h-20 object-cover rounded-lg border" /> : <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center text-red-500"><FileOutput className="h-5 w-5" /></div>}
                                                    <p className="text-xs font-medium text-gray-700">{headerFile.name}</p>
                                                    <p className="text-[10px] text-gray-400">Clique para trocar</p>
                                                </>
                                            ) : (
                                                <><UploadCloud className="h-6 w-6 text-gray-300" /><p className="text-xs text-gray-500">{headerType === 'IMAGE' ? 'JPEG ou PNG' : 'PDF'}</p></>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Texto da Mensagem <span className="text-red-500">*</span></label>
                                    <textarea required rows={5}
                                        className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary transition-all resize-none"
                                        placeholder="Olá! Temos uma novidade para você..."
                                        value={mensagem} onChange={e => setMensagem(e.target.value)} />
                                    <p className="text-[10px] text-gray-400 mt-1">{mensagem.length} / 1024 caracteres</p>
                                </div>

                                {submitStatus === 'success' && <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-green-700 text-xs"><CheckCircle2 className="h-4 w-4 shrink-0" /> {submitMessage}</div>}
                                {submitStatus === 'error'   && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs"><AlertCircle className="h-4 w-4 shrink-0" /> {submitMessage}</div>}

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowCreateForm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                                    <button type="submit" disabled={submitStatus === 'sending'}
                                        className="flex-[2] bg-primary text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                        {submitStatus === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</> : <><Send className="h-4 w-4" /> Enviar para Aprovação</>}
                                    </button>
                                </div>
                            </form>

                            {/* Preview */}
                            <div className="p-6">
                                <p className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2"><span>📱</span> Preview</p>
                                <div className="bg-[#E5DDD5] rounded-xl p-4 min-h-[260px] flex flex-col gap-1.5 shadow-inner">
                                    <div className="bg-white rounded-lg shadow-sm max-w-[92%] space-y-2 relative pb-6 border border-gray-100 overflow-hidden">
                                        {headerType === 'IMAGE' && (headerPreviewUrl
                                            ? <img src={headerPreviewUrl} alt="header" className="w-full h-32 object-cover" />
                                            : <div className="w-full h-32 bg-gray-100 flex flex-col items-center justify-center text-gray-300 border-b"><ImageIcon className="h-7 w-7 mb-1" /><span className="text-[10px]">Espaço da imagem</span></div>
                                        )}
                                        {headerType === 'DOCUMENT' && (
                                            <div className="w-full bg-red-50 p-2.5 flex items-center gap-2.5 border-b border-red-100">
                                                <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500 shrink-0"><FileOutput className="h-4 w-4" /></div>
                                                <div><p className="text-[11px] font-bold text-gray-800">{headerFile?.name ?? 'documento.pdf'}</p><p className="text-[10px] text-gray-400">PDF</p></div>
                                            </div>
                                        )}
                                        <p className="text-[12px] text-gray-800 px-3 pt-1 whitespace-pre-wrap leading-relaxed">
                                            {mensagem || <span className="text-gray-300">O texto aparecerá aqui...</span>}
                                        </p>
                                        <p className="text-[10px] text-gray-400 px-3">Deseja continuar recebendo ofertas?</p>
                                        <span className="text-[9px] text-gray-400 absolute bottom-1 right-2">12:00 ✓✓</span>
                                    </div>
                                    <div className="bg-white rounded-lg shadow-sm max-w-[92%] py-1.5 text-center border border-gray-100">
                                        <span className="text-[11px] text-blue-500 font-semibold">Parar Ofertas</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: DISPATCH ── */}
            {dispatchingTemplate && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm overflow-hidden">
                        <div className="bg-gray-50/80 px-6 py-4 flex items-center justify-between border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Rocket className="h-5 w-5 text-primary" />
                                <h3 className="font-bold text-gray-800">Confirmar Disparo</h3>
                            </div>
                            <button onClick={() => setDispatchingTemplate(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600">
                                Template: <span className="font-bold text-primary">"{dispatchingTemplate.name}"</span>
                            </p>

                            {/* Audiência */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">Público-alvo</label>
                                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                                    <button onClick={() => setDispatchAudience('leads')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${dispatchAudience === 'leads' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                                        <Users className="h-3.5 w-3.5" /> Leads
                                    </button>
                                    <button onClick={() => setDispatchAudience('vendedores')}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${dispatchAudience === 'vendedores' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}>
                                        <Contact className="h-3.5 w-3.5" /> Vendedores
                                    </button>
                                </div>
                            </div>

                            {/* Upload */}
                            {dispatchingTemplate.has_media_header && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                        {dispatchingTemplate.header_format === 'DOCUMENT' ? 'PDF' : 'Imagem'} da campanha <span className="text-red-500">*</span>
                                    </label>
                                    <input ref={dispatchFileRef} type="file" className="hidden"
                                        accept={dispatchingTemplate.header_format === 'DOCUMENT' ? 'application/pdf' : 'image/jpeg,image/png,image/webp'}
                                        onChange={handleDispatchFileChange} />
                                    {dispatchImageUrl ? (
                                        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                                            {dispatchingTemplate.header_format !== 'DOCUMENT' && <img src={dispatchImageUrl} alt="preview" className="h-10 w-10 object-cover rounded-lg border border-green-200 shrink-0" />}
                                            <p className="text-xs font-bold text-green-700 flex-1 truncate">Imagem carregada</p>
                                            <button onClick={() => dispatchFileRef.current?.click()} className="text-[11px] text-green-600 font-bold hover:underline">Trocar</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => dispatchFileRef.current?.click()} disabled={dispatchUploading}
                                            className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary/40 p-4 flex flex-col items-center gap-2 transition-all disabled:opacity-50">
                                            {dispatchUploading ? <><Loader2 className="h-5 w-5 animate-spin text-primary/40" /><span className="text-xs text-gray-400">Fazendo upload...</span></>
                                                : <><UploadCloud className="h-5 w-5 text-gray-300" /><span className="text-xs text-gray-500">Clique para selecionar</span></>}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Agendamento */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Agendar envio <span className="text-gray-400 font-normal">(opcional)</span>
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} min={todayStr}
                                        className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary transition-all" />
                                    <input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} disabled={!scheduledDate}
                                        className="block w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary transition-all disabled:opacity-40" />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {scheduledDate ? `Envio em ${scheduledDate} às ${scheduledTime || '00:00'} (Brasília).` : 'Sem data = disparo imediato.'}
                                </p>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                                <p className="text-xs text-amber-700">
                                    ⚠️ Será enviado para{' '}
                                    <strong>{activeCount !== null ? activeCount : '...'}</strong>{' '}
                                    {dispatchAudience}(s) ativos. O processo roda em background.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button onClick={() => setDispatchingTemplate(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors">Cancelar</button>
                            <button onClick={handleConfirmDispatch} disabled={isSendingCampaign}
                                className="flex-[2] bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSendingCampaign ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : scheduledDate ? <CalendarClock className="h-4 w-4" />
                                    : <Send className="h-4 w-4" />}
                                {isSendingCampaign ? 'Salvando...' : scheduledDate ? 'Agendar Campanha' : 'Confirmar Envio'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL: LIBRARY WIZARD ── */}
            <TemplateLibraryWizard
                template={libraryWizardTemplate}
                onClose={() => setLibraryWizardTemplate(null)}
                onSubmit={handleLibraryWizardSubmit}
            />
        </div>
    );
}
