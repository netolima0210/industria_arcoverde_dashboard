'use client';

import { createCampaign, submitTemplateMeta } from '../actions';
import Link from 'next/link';
import { useState, useRef } from 'react';
import { ArrowLeft, Save, Megaphone, Users, Image as ImageIcon, FileText, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function NewCampaignPage() {
    const [loading, setLoading] = useState(false);
    const [publicoAlvo, setPublicoAlvo] = useState<'leads' | 'vendedores'>('leads');
    const [mensagem, setMensagem] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Template submission state
    const [templateName, setTemplateName] = useState('');
    const [templateStatus, setTemplateStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
    const [templateMessage, setTemplateMessage] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const uploadImage = async (): Promise<string | null> => {
        if (!imageFile) return null;

        setUploadingImage(true);
        try {
            const supabase = createClient();
            const fileName = `${Date.now()}_${imageFile.name}`;

            const { data, error } = await supabase.storage
                .from('campanhas')
                .upload(fileName, imageFile, { cacheControl: '3600', upsert: false });

            if (error) {
                console.error('Upload error:', error);
                alert('Erro ao enviar imagem. Verifique se o bucket "campanhas" existe no Supabase.');
                return null;
            }

            const { data: publicUrl } = supabase.storage
                .from('campanhas')
                .getPublicUrl(data.path);

            return publicUrl.publicUrl;
        } catch (err) {
            alert('Erro ao enviar imagem.');
            return null;
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);

        let imageUrl: string | null = null;
        if (imageFile) {
            imageUrl = await uploadImage();
        }

        const formData = new FormData();
        formData.set('nome', (event.currentTarget.elements.namedItem('nome') as HTMLInputElement).value);
        formData.set('mensagem', mensagem);
        formData.set('publico_alvo', publicoAlvo);
        if (imageUrl) {
            formData.set('imagem_url', imageUrl);
        }

        const result = await createCampaign(formData);

        if (result && result.error) {
            alert(result.error);
            setLoading(false);
        }
    };

    const handleSubmitTemplate = async () => {
        if (!templateName.trim() || !mensagem.trim()) {
            alert('Preencha o nome do template e a mensagem antes de enviar para a Meta.');
            return;
        }

        setTemplateStatus('sending');
        setTemplateMessage('');

        const formData = new FormData();
        formData.set('template_name', templateName);
        formData.set('template_body', mensagem);
        formData.set('has_image', imageFile ? 'true' : 'false');

        const result = await submitTemplateMeta(formData);

        if (result.error) {
            setTemplateStatus('error');
            setTemplateMessage(result.error);
        } else {
            setTemplateStatus('success');
            setTemplateMessage(`Template "${result.templateName}" enviado com sucesso! Status: ${result.status || 'PENDING'}`);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard/campanhas"
                    className="p-2 bg-white rounded-xl shadow-sm border border-gray-200 text-gray-400 hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Nova Campanha</h1>
                    <p className="text-sm text-gray-500">Crie e envie mensagens para leads ou vendedores via WhatsApp.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-hidden">
                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            {/* Campaign Name */}
                            <div>
                                <label htmlFor="nome" className="block text-sm font-bold text-gray-700 mb-2">
                                    Nome da Campanha *
                                </label>
                                <input
                                    type="text"
                                    name="nome"
                                    id="nome"
                                    required
                                    className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border"
                                    placeholder="Ex: Catálogo Janeiro 2026"
                                />
                            </div>

                            {/* Audience selector */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    Público-alvo *
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPublicoAlvo('leads')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${publicoAlvo === 'leads'
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Users className="h-5 w-5 mb-2" />
                                        <span className="block font-bold text-sm">Leads</span>
                                        <span className="block text-[10px] mt-1 opacity-70">Clientes e contatos</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPublicoAlvo('vendedores')}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${publicoAlvo === 'vendedores'
                                                ? 'border-primary bg-primary/5 text-primary'
                                                : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <Megaphone className="h-5 w-5 mb-2" />
                                        <span className="block font-bold text-sm">Vendedores</span>
                                        <span className="block text-[10px] mt-1 opacity-70">Equipe comercial</span>
                                    </button>
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <label htmlFor="mensagem" className="block text-sm font-bold text-gray-700 mb-2">
                                    Mensagem *
                                </label>
                                <textarea
                                    name="mensagem"
                                    id="mensagem"
                                    required
                                    rows={6}
                                    className="block w-full rounded-xl border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all sm:text-sm p-3 border resize-none"
                                    placeholder="Digite aqui a mensagem que será enviada..."
                                    value={mensagem}
                                    onChange={(e) => setMensagem(e.target.value)}
                                />
                                <p className="text-[10px] text-gray-400 mt-1">{mensagem.length} caracteres</p>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Imagem (opcional)
                                </label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${imagePreview
                                            ? 'border-primary bg-primary/5'
                                            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                                        }`}
                                >
                                    {imagePreview ? (
                                        <div className="space-y-3">
                                            <img src={imagePreview} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow-sm" />
                                            <p className="text-xs text-primary font-medium">Clique para trocar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <ImageIcon className="h-8 w-8 text-gray-300 mx-auto" />
                                            <p className="text-sm text-gray-400">Clique para selecionar uma imagem</p>
                                            <p className="text-[10px] text-gray-300">JPG, PNG ou WEBP (máx 5MB)</p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageChange}
                                    />
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                                <Link
                                    href="/dashboard/campanhas"
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 transition-all"
                                >
                                    Cancelar
                                </Link>
                                <button
                                    type="submit"
                                    disabled={loading || uploadingImage}
                                    className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    {loading ? 'Salvando...' : uploadingImage ? 'Enviando imagem...' : 'Salvar Campanha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Sidebar: Template Submission */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Template Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-gray-800">Pedir Aprovação</h3>
                                <p className="text-[10px] text-gray-400">Enviar template para a Meta</p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 leading-relaxed">
                            Para enviar campanhas fora da janela de 24h, a Meta precisa aprovar um template com o texto da sua mensagem.
                        </p>

                        <div>
                            <label htmlFor="template_name" className="block text-xs font-bold text-gray-600 mb-1">
                                Nome do Template
                            </label>
                            <input
                                type="text"
                                id="template_name"
                                className="block w-full rounded-lg border-gray-200 bg-gray-50 shadow-sm focus:border-primary focus:ring-primary focus:bg-white transition-all text-xs p-2.5 border"
                                placeholder="ex: catalogo_2026"
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Apenas letras, números e underline</p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmitTemplate}
                            disabled={templateStatus === 'sending' || !mensagem.trim()}
                            className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {templateStatus === 'sending' ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                            ) : (
                                <><Send className="h-3.5 w-3.5" /> Enviar para Aprovação</>
                            )}
                        </button>

                        {templateStatus === 'success' && (
                            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-green-700">{templateMessage}</p>
                            </div>
                        )}
                        {templateStatus === 'error' && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <p className="text-xs text-red-700">{templateMessage}</p>
                            </div>
                        )}
                    </div>

                    {/* Preview Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 space-y-4">
                        <h3 className="font-bold text-sm text-gray-800">📱 Preview da Mensagem</h3>
                        <div className="bg-[#E5DDD5] rounded-xl p-4">
                            <div className="bg-white rounded-lg p-3 shadow-sm max-w-[85%] space-y-2">
                                {imagePreview && (
                                    <img src={imagePreview} alt="Preview" className="rounded-md w-full" />
                                )}
                                <p className="text-xs text-gray-800 whitespace-pre-wrap">
                                    {mensagem || 'Sua mensagem aparecerá aqui...'}
                                </p>
                                <p className="text-[9px] text-gray-400 text-right">12:00</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
