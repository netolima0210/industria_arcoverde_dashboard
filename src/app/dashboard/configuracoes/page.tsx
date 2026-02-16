'use client';

import { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Globe, Save, Check, Eye, EyeOff } from 'lucide-react';

interface AppSettings {
    companyName: string;
    timezone: string;
    notifyNewLeads: boolean;
    notifyTransfers: boolean;
    notifyReports: boolean;
}

const defaultSettings: AppSettings = {
    companyName: 'Indústria Arcoverde',
    timezone: 'America/Recife',
    notifyNewLeads: true,
    notifyTransfers: true,
    notifyReports: false,
};

const timezones = [
    { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
    { value: 'America/Recife', label: 'Recife (BRT)' },
    { value: 'America/Manaus', label: 'Manaus (AMT)' },
    { value: 'America/Belem', label: 'Belém (BRT)' },
    { value: 'America/Fortaleza', label: 'Fortaleza (BRT)' },
];



export default function ConfiguracoesPage() {
    const [settings, setSettings] = useState<AppSettings>(defaultSettings);
    const [saved, setSaved] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaved, setPasswordSaved] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('dashboard_settings');
        if (stored) {
            try {
                setSettings({ ...defaultSettings, ...JSON.parse(stored) });
            } catch { }
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('dashboard_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleToggle = (key: keyof AppSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handlePasswordSave = () => {
        setPasswordError('');
        if (newPassword.length < 6) {
            setPasswordError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem.');
            return;
        }
        // In a real app, call Supabase auth.updateUser here
        setPasswordSaved(true);
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSaved(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
                    <p className="text-sm text-gray-500">Gerencie as preferências do sistema.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark transition-all shadow-sm text-sm font-medium"
                >
                    {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                    {saved ? 'Salvo!' : 'Salvar Alterações'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Geral */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-blue-500 rounded-xl">
                            <Settings className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Geral</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Nome da Empresa</label>
                            <input
                                type="text"
                                value={settings.companyName}
                                onChange={(e) => setSettings(prev => ({ ...prev, companyName: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                            />
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Fuso Horário</label>
                            <select
                                value={settings.timezone}
                                onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                            >
                                {timezones.map(tz => (
                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <div>
                                <p className="text-sm font-medium text-gray-700">Idioma</p>
                                <p className="text-xs text-gray-400">Fixo nesta versão</p>
                            </div>
                            <span className="text-sm font-medium text-gray-600">Português (BR)</span>
                        </div>
                    </div>
                </div>

                {/* Notificações */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-orange-500 rounded-xl">
                            <Bell className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Notificações</h2>
                    </div>
                    <div className="space-y-4">
                        {([
                            { key: 'notifyNewLeads' as const, label: 'Novos Leads', desc: 'Notificar ao receber novo lead' },
                            { key: 'notifyTransfers' as const, label: 'Transferências', desc: 'Notificar ao transferir conversa' },
                            { key: 'notifyReports' as const, label: 'Relatórios', desc: 'Receber resumo diário por e-mail' },
                        ]).map(item => (
                            <button
                                key={item.key}
                                onClick={() => handleToggle(item.key)}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl w-full text-left hover:bg-gray-100/80 transition-colors"
                            >
                                <div>
                                    <p className="text-sm font-medium text-gray-700">{item.label}</p>
                                    <p className="text-xs text-gray-400">{item.desc}</p>
                                </div>
                                <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${settings[item.key] ? 'bg-primary' : 'bg-gray-300'}`}>
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${settings[item.key] ? 'right-0.5' : 'left-0.5'}`}></div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Segurança */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-green-500 rounded-xl">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Segurança</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Nova Senha</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl">
                            <label className="text-sm font-medium text-gray-700 block mb-1.5">Confirmar Senha</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repita a senha"
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                            />
                        </div>
                        {passwordError && (
                            <p className="text-sm text-red-500 px-1">{passwordError}</p>
                        )}
                        <button
                            onClick={handlePasswordSave}
                            disabled={!newPassword}
                            className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {passwordSaved ? <><Check className="h-4 w-4" /> Senha Atualizada!</> : 'Alterar Senha'}
                        </button>
                    </div>
                </div>

                {/* Sobre (Estático) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2.5 bg-purple-500 rounded-xl">
                            <Globe className="h-5 w-5 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-800">Sobre</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm font-medium text-gray-700">Versão</p>
                            <span className="text-sm font-medium text-gray-600">1.0.0</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                            <p className="text-sm font-medium text-gray-700">Desenvolvido por</p>
                            <span className="text-sm font-medium text-primary">N7tech</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
