'use client';

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { CATEGORIES, LIBRARY_TEMPLATES, type LibraryTemplate, type TemplateCategory } from './template-library';
import TemplateLibraryCard from './TemplateLibraryCard';

type MetaCategory = 'ALL' | 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

interface Props {
    onUseTemplate: (template: LibraryTemplate) => void;
}

const META_CHIPS: { key: MetaCategory; label: string }[] = [
    { key: 'ALL',            label: 'TODOS' },
    { key: 'UTILITY',        label: 'UTILIDADE' },
    { key: 'MARKETING',      label: 'MARKETING' },
    { key: 'AUTHENTICATION', label: 'AUTENTICAÇÃO' },
];

export default function TemplateLibrary({ onUseTemplate }: Props) {
    const [filterMeta, setFilterMeta]                   = useState<MetaCategory>('ALL');
    const [selectedCategory, setSelectedCategory]       = useState<TemplateCategory | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery]                 = useState('');

    // Contadores por meta-categoria
    const metaCounts = useMemo(() => {
        const counts: Record<MetaCategory, number> = { ALL: LIBRARY_TEMPLATES.length, UTILITY: 0, MARKETING: 0, AUTHENTICATION: 0 };
        for (const t of LIBRARY_TEMPLATES) {
            const mc = (t.metaCategory ?? 'UTILITY') as MetaCategory;
            if (counts[mc] !== undefined) counts[mc]++;
        }
        return counts;
    }, []);

    const filtered = useMemo(() => {
        return LIBRARY_TEMPLATES.filter(t => {
            const mc = (t.metaCategory ?? 'UTILITY') as MetaCategory;
            if (filterMeta !== 'ALL' && mc !== filterMeta) return false;
            if (selectedCategory && t.category !== selectedCategory) return false;
            if (selectedSubcategory && t.subcategory !== selectedSubcategory) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    t.displayName.toLowerCase().includes(q) ||
                    t.body.toLowerCase().includes(q) ||
                    t.subcategoryDisplayName.toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [filterMeta, selectedCategory, selectedSubcategory, searchQuery]);

    const handleCategoryClick = (catId: TemplateCategory) => {
        if (selectedCategory === catId) {
            setSelectedCategory(null);
            setSelectedSubcategory(null);
        } else {
            setSelectedCategory(catId);
            setSelectedSubcategory(null);
        }
    };

    const handleSubcategoryClick = (subId: string) => {
        setSelectedSubcategory(prev => prev === subId ? null : subId);
    };

    const activeCategoryMeta = CATEGORIES.find(c => c.id === selectedCategory);

    return (
        <div className="space-y-4">

            {/* ── Chips de Meta-Categoria (topo) ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 px-5 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {META_CHIPS.map(chip => (
                        <button
                            key={chip.key}
                            onClick={() => {
                                setFilterMeta(chip.key);
                                setSelectedCategory(null);
                                setSelectedSubcategory(null);
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                                filterMeta === chip.key
                                    ? 'bg-gray-800 text-white border-gray-800'
                                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            {chip.label} ({metaCounts[chip.key]})
                        </button>
                    ))}

                    {/* Divisor */}
                    <div className="w-px h-5 bg-gray-200 mx-1 shrink-0" />

                    {/* Busca inline */}
                    <div className="relative ml-auto">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar templates..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all w-52"
                        />
                    </div>
                </div>
            </div>

            {/* ── Sidebar + Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4 items-start">

                {/* Sidebar de subcategorias */}
                <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Categorias</p>
                    </div>
                    <nav className="p-2">
                        <button
                            onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1 ${
                                !selectedCategory
                                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            Todos os templates
                        </button>

                        {CATEGORIES.map(cat => (
                            <div key={cat.id}>
                                <button
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                        selectedCategory === cat.id
                                            ? 'bg-primary/10 text-primary border-l-2 border-primary'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <span>{cat.emoji}</span>
                                    {cat.label}
                                </button>

                                {selectedCategory === cat.id && (
                                    <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l-2 border-gray-100 pl-2">
                                        {cat.subcategories.map(sub => (
                                            <button
                                                key={sub.id}
                                                onClick={() => handleSubcategoryClick(sub.id)}
                                                className={`w-full text-left px-2 py-1.5 rounded-md text-[11px] transition-all ${
                                                    selectedSubcategory === sub.id
                                                        ? 'bg-primary/10 text-primary font-bold'
                                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                {sub.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Grade de templates */}
                <div>
                    {/* Breadcrumb / contagem */}
                    <div className="flex items-center gap-2 mb-3">
                        <p className="text-xs text-gray-500">
                            <span className="font-bold text-gray-700">{filtered.length}</span> template{filtered.length !== 1 ? 's' : ''}
                            {selectedCategory && activeCategoryMeta && (
                                <span> em <span className="font-bold text-gray-700">{activeCategoryMeta.label}</span></span>
                            )}
                            {selectedSubcategory && activeCategoryMeta && (
                                <span> › <span className="font-bold text-gray-700">
                                    {activeCategoryMeta.subcategories.find(s => s.id === selectedSubcategory)?.label}
                                </span></span>
                            )}
                        </p>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200/60 p-10 text-center">
                            <Search className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-sm font-medium text-gray-500">Nenhum template encontrado.</p>
                            <p className="text-xs text-gray-400 mt-1">Tente outra categoria ou termo de busca.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filtered.map(template => (
                                <TemplateLibraryCard
                                    key={template.id}
                                    template={template}
                                    onSelect={onUseTemplate}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
