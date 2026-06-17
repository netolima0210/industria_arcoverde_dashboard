'use client';

import { useState } from 'react';
import { FileOutput, Pencil, Check } from 'lucide-react';
import type { LibraryTemplate } from './template-library';

interface Props {
    template: LibraryTemplate;
    onSelect: (template: LibraryTemplate) => void;
}

const META_CATEGORY_BADGE: Record<string, { label: string; classes: string }> = {
    UTILITY:        { label: 'Utilidade',    classes: 'bg-blue-50 text-blue-600 border-blue-200' },
    MARKETING:      { label: 'Marketing',    classes: 'bg-orange-50 text-orange-600 border-orange-200' },
    AUTHENTICATION: { label: 'Autenticação', classes: 'bg-purple-50 text-purple-600 border-purple-200' },
};

function highlightVars(text: string): React.ReactNode[] {
    return text.split(/(\{\{\d+\}\})/g).map((part, i) =>
        /\{\{\d+\}\}/.test(part)
            ? <span key={i} className="bg-primary/10 text-primary font-mono text-[11px] px-0.5 rounded">{part}</span>
            : part
    );
}

export default function TemplateLibraryCard({ template, onSelect }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedBody, setEditedBody] = useState(template.body);

    const metaCategory = template.metaCategory ?? 'UTILITY';
    const badge = META_CATEGORY_BADGE[metaCategory] ?? META_CATEGORY_BADGE.UTILITY;

    const displayBody = editedBody;
    const previewBody = displayBody.length > 160 ? displayBody.slice(0, 160) + '...' : displayBody;

    const handleSelect = () => {
        onSelect({ ...template, body: editedBody });
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden flex flex-col hover:border-primary/30 hover:shadow-md transition-all">

            {/* Header */}
            <div className="px-4 pt-3 pb-1 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.classes}`}>
                            {badge.label}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">
                            {template.subcategoryDisplayName}
                        </span>
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 leading-tight">{template.displayName}</h3>
                </div>

                <button
                    onClick={() => setIsEditing(e => !e)}
                    title={isEditing ? 'Confirmar edição' : 'Editar texto do template'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold transition-all shrink-0 ${
                        isEditing
                            ? 'bg-primary/10 text-primary border-primary/30'
                            : 'text-gray-500 border-gray-200 bg-white hover:border-primary/40 hover:text-primary hover:bg-primary/5'
                    }`}
                >
                    {isEditing
                        ? <><Check className="h-3 w-3" /> OK</>
                        : <><Pencil className="h-3 w-3" /> Editar</>
                    }
                </button>
            </div>

            {/* Body: edit mode ou preview WhatsApp */}
            {isEditing ? (
                <div className="mx-4 my-2">
                    <textarea
                        value={editedBody}
                        onChange={e => setEditedBody(e.target.value)}
                        rows={6}
                        autoFocus
                        className="w-full text-xs border-2 border-primary/30 rounded-xl p-2.5 bg-primary/5 focus:outline-none focus:border-primary resize-none leading-relaxed text-gray-700"
                        placeholder="Edite o texto do template..."
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                        Use {'{{1}}'}, {'{{2}}'}, ... para variáveis. {editedBody.length} caracteres.
                    </p>
                </div>
            ) : (
                <div className="mx-4 my-2 bg-[#E5DDD5] rounded-xl p-2.5 flex flex-col gap-1">
                    <div className="bg-white rounded-lg shadow-sm max-w-full space-y-1 pb-4 border border-gray-100 overflow-hidden relative">
                        {template.headerType === 'IMAGE' && (
                            <div className="w-full h-16 bg-gray-100 flex items-center justify-center text-gray-300 border-b border-gray-100">
                                <span className="text-[10px] text-gray-400">📷 Imagem</span>
                            </div>
                        )}
                        {template.headerType === 'DOCUMENT' && (
                            <div className="w-full bg-red-50 p-2 flex items-center gap-2 border-b border-red-100">
                                <div className="h-7 w-7 bg-red-100 rounded-md flex items-center justify-center text-red-500 flex-shrink-0">
                                    <FileOutput className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-[10px] text-gray-600 font-medium">Documento PDF</span>
                            </div>
                        )}
                        <p className="text-[11px] text-gray-800 px-2.5 pt-1 whitespace-pre-wrap leading-relaxed">
                            {highlightVars(previewBody)}
                        </p>
                        <span className="text-[9px] text-gray-400 absolute bottom-1 right-2">✓✓</span>
                    </div>

                    {template.buttons.length > 0 && (
                        <div className="space-y-0.5">
                            {template.buttons.map((btn, i) => (
                                <div key={i} className="bg-white rounded-md py-1.5 text-center border border-gray-100">
                                    <span className="text-[10px] text-blue-500 font-semibold">{btn.text}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Variáveis */}
            {template.variableLabels.length > 0 && (
                <div className="px-4 pb-2">
                    <div className="flex flex-wrap gap-1">
                        {template.variableLabels.map((label, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[9px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                                <span className="font-mono text-primary font-bold">{`{{${i + 1}}}`}</span>
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Botão */}
            <div className="px-4 pb-4 pt-1 mt-auto">
                <button
                    onClick={handleSelect}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all border ${
                        isEditing
                            ? 'bg-primary text-white border-primary hover:bg-primary/90 shadow-sm'
                            : 'bg-primary/10 hover:bg-primary text-primary hover:text-white border-primary/20 hover:border-primary'
                    }`}
                >
                    {isEditing ? '✓ Salvar edição e usar template' : 'Usar este template'}
                </button>
            </div>
        </div>
    );
}
