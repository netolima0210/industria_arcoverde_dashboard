'use client';

import { useState, useEffect, useRef } from 'react';
import {
    X, Send, Loader2, CheckCircle2, AlertCircle,
    Image as ImageIcon, FileOutput, UploadCloud
} from 'lucide-react';
import type { LibraryTemplate } from './template-library';

interface Props {
    template: LibraryTemplate | null;
    onClose: () => void;
    onSubmit: (formData: FormData) => Promise<void>;
}

function livePreview(body: string): React.ReactNode[] {
    return body.split(/(\{\{\d+\}\})/g).map((part, i) =>
        /\{\{\d+\}\}/.test(part)
            ? <span key={i} className="bg-primary/15 text-primary font-mono text-[11px] px-0.5 rounded">{part}</span>
            : part
    );
}

export default function TemplateLibraryWizard({ template, onClose, onSubmit }: Props) {
    const [templateName, setTemplateName] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [headerType, setHeaderType] = useState<'NONE' | 'IMAGE' | 'DOCUMENT'>('NONE');
    const [headerFile, setHeaderFile] = useState<File | null>(null);
    const [headerPreviewUrl, setHeaderPreviewUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!template) return;
        setTemplateName(template.suggestedName);
        setBodyText(template.body);
        setHeaderType(template.headerType);
        setHeaderFile(null);
        setHeaderPreviewUrl(null);
        setStatus('idle');
        setStatusMessage('');
    }, [template]);

    if (!template) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setHeaderFile(file);
        if (file && headerType === 'IMAGE') {
            setHeaderPreviewUrl(URL.createObjectURL(file));
        } else {
            setHeaderPreviewUrl(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!templateName.trim() || !bodyText.trim()) {
            setStatus('error');
            setStatusMessage('Preencha o nome do template e o texto da mensagem.');
            return;
        }
        if (headerType !== 'NONE' && !headerFile) {
            setStatus('error');
            setStatusMessage('Selecione o arquivo de cabeçalho antes de enviar.');
            return;
        }

        setStatus('sending');
        setStatusMessage('');

        const formData = new FormData();
        formData.set('template_name', templateName);
        formData.set('template_body', bodyText);
        formData.set('header_type', headerType);
        if (headerFile) formData.set('header_file', headerFile);

        try {
            await onSubmit(formData);
            setStatus('success');
            setStatusMessage(`Template "${templateName}" enviado para aprovação da Meta!`);
            setTimeout(onClose, 2500);
        } catch (err: any) {
            setStatus('error');
            setStatusMessage(err?.message || 'Erro ao enviar o template.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                    <div>
                        <h3 className="font-bold text-gray-800">Personalizar Template</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{template.displayName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                        {/* Coluna esquerda: formulário */}
                        <div className="p-6 space-y-5 border-r border-gray-100">
                            {/* Nome do template */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Nome do Template <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={e => setTemplateName(
                                        e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                                    )}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary focus:bg-white transition-all"
                                    placeholder="meu_template"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Apenas letras minúsculas, números e underline.</p>
                            </div>

                            {/* Cabeçalho */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">Cabeçalho</label>
                                <div className="grid grid-cols-3 gap-1.5 mb-2">
                                    {(['NONE', 'IMAGE', 'DOCUMENT'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => { setHeaderType(type); setHeaderFile(null); setHeaderPreviewUrl(null); }}
                                            className={`p-2 rounded-lg border-2 text-xs font-bold transition-all ${
                                                headerType === type
                                                    ? 'border-primary bg-primary/5 text-primary'
                                                    : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                                            }`}
                                        >
                                            {type === 'NONE' ? 'Nenhum' : type === 'IMAGE' ? '📷 Imagem' : '📄 PDF'}
                                        </button>
                                    ))}
                                </div>

                                {headerType !== 'NONE' && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:bg-primary/5 hover:border-primary/40 transition-all p-3 flex flex-col items-center gap-1.5"
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
                                                {headerPreviewUrl
                                                    ? <img src={headerPreviewUrl} alt="preview" className="h-16 object-cover rounded-lg" />
                                                    : <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center text-red-500"><FileOutput className="h-5 w-5" /></div>
                                                }
                                                <p className="text-[10px] font-medium text-gray-600">{headerFile.name}</p>
                                                <p className="text-[10px] text-gray-400">Clique para trocar</p>
                                            </>
                                        ) : (
                                            <>
                                                <UploadCloud className="h-6 w-6 text-gray-300" />
                                                <p className="text-[11px] text-gray-500">
                                                    {headerType === 'IMAGE' ? 'JPEG ou PNG' : 'PDF'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Corpo do template */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                                    Texto da Mensagem <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={6}
                                    value={bodyText}
                                    onChange={e => setBodyText(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 text-sm p-2.5 focus:outline-none focus:border-primary focus:bg-white transition-all resize-none"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{bodyText.length} / 1024 caracteres</p>
                            </div>

                            {/* Variáveis informativas */}
                            {template.variableLabels.length > 0 && (
                                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                                    <p className="text-[11px] font-bold text-blue-700 mb-2">Variáveis do template:</p>
                                    <div className="space-y-1">
                                        {template.variableLabels.map((label, i) => (
                                            <div key={i} className="flex items-center gap-2 text-[11px]">
                                                <span className="bg-primary/10 text-primary font-mono px-1.5 py-0.5 rounded font-bold shrink-0">
                                                    {`{{${i + 1}}}`}
                                                </span>
                                                <span className="text-blue-600">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-blue-500 mt-2">
                                        Esses valores serão preenchidos automaticamente ao disparar a campanha.
                                    </p>
                                </div>
                            )}

                            {/* Status feedback */}
                            {status === 'success' && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200 text-green-700 text-xs">
                                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {statusMessage}
                                </div>
                            )}
                            {status === 'error' && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" /> {statusMessage}
                                </div>
                            )}
                        </div>

                        {/* Coluna direita: preview ao vivo */}
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm">📱</span>
                                <p className="text-xs font-bold text-gray-700">Preview ao vivo</p>
                            </div>

                            <div className="bg-[#E5DDD5] rounded-xl p-3 min-h-[260px] flex flex-col gap-1.5 shadow-inner">
                                <div className="bg-white rounded-lg shadow-sm max-w-[95%] space-y-1.5 relative pb-5 border border-gray-100 overflow-hidden">
                                    {/* Header preview */}
                                    {headerType === 'IMAGE' && (
                                        headerPreviewUrl
                                            ? <img src={headerPreviewUrl} alt="header" className="w-full h-28 object-cover" />
                                            : <div className="w-full h-28 bg-gray-100 flex items-center justify-center text-gray-300 border-b border-gray-100">
                                                <div className="flex flex-col items-center gap-1">
                                                    <ImageIcon className="h-6 w-6" />
                                                    <span className="text-[10px]">Imagem</span>
                                                </div>
                                              </div>
                                    )}
                                    {headerType === 'DOCUMENT' && (
                                        <div className="w-full bg-red-50 p-2.5 flex items-center gap-2.5 border-b border-red-100">
                                            <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center text-red-500 flex-shrink-0">
                                                <FileOutput className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-gray-800">{headerFile?.name ?? 'documento.pdf'}</p>
                                                <p className="text-[10px] text-gray-400">PDF · Clique para abrir</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Body */}
                                    <p className="text-[12px] text-gray-800 px-3 pt-1 whitespace-pre-wrap leading-relaxed">
                                        {bodyText
                                            ? livePreview(bodyText)
                                            : <span className="text-gray-300">O texto aparecerá aqui...</span>
                                        }
                                    </p>

                                    {/* Footer */}
                                    <p className="text-[10px] text-gray-400 px-3 leading-relaxed">
                                        Deseja continuar recebendo ofertas da Indústria Arcoverde?
                                    </p>

                                    <span className="text-[9px] text-gray-400 absolute bottom-1 right-2">12:00 ✓✓</span>
                                </div>

                                {/* Botões de template */}
                                {template.buttons.map((btn, i) => (
                                    <div key={i} className="bg-white rounded-lg shadow-sm max-w-[95%] py-1.5 text-center border border-gray-100">
                                        <span className="text-[11px] text-blue-500 font-semibold">{btn.text}</span>
                                    </div>
                                ))}

                                <div className="bg-white rounded-lg shadow-sm max-w-[95%] py-1.5 text-center border border-gray-100">
                                    <span className="text-[11px] text-blue-500 font-semibold">Parar Ofertas</span>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                O footer e o botão "Parar Ofertas" são adicionados automaticamente.
                            </p>
                        </div>
                    </div>

                    {/* Footer do modal */}
                    <div className="px-6 pb-6 pt-2 flex gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={status === 'sending' || status === 'success'}
                            className="flex-[2] bg-primary text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {status === 'sending'
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando para a Meta...</>
                                : status === 'success'
                                    ? <><CheckCircle2 className="h-4 w-4" /> Enviado!</>
                                    : <><Send className="h-4 w-4" /> Enviar para Aprovação</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
