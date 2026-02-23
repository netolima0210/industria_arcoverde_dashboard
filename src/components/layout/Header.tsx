'use client';

import { Bell, CheckCircle, UserPlus, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Notificacao = {
    id: string;
    tipo: 'lead' | 'campanha';
    titulo: string;
    mensagem: string;
    data: string;
    link: string;
};

export function Header() {
    const [notifications, setNotifications] = useState<Notificacao[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    const fetchNotifications = async () => {
        try {
            // Buscar últimos 5 leads
            const { data: leads } = await supabase
                .from('clientes')
                .select('id, nome, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            // Buscar últimas 5 campanhas concluídas
            const { data: campanhas } = await supabase
                .from('campanhas')
                .select('id, nome, status, enviados, erros, created_at')
                .eq('status', 'concluida')
                .order('created_at', { ascending: false })
                .limit(5);

            let arr: Notificacao[] = [];

            if (leads) {
                const leadsNotif: Notificacao[] = leads.map(l => ({
                    id: `lead_${l.id}`,
                    tipo: 'lead',
                    titulo: 'Novo Lead',
                    mensagem: `${l.nome} entrou no seu funil.`,
                    data: l.created_at,
                    link: `/dashboard/leads`
                }));
                arr = [...arr, ...leadsNotif];
            }

            if (campanhas) {
                const campNotif: Notificacao[] = campanhas.map(c => ({
                    id: `camp_${c.id}`,
                    tipo: 'campanha',
                    titulo: 'Campanha Concluída',
                    mensagem: `A campanha "${c.nome}" terminou de ser enviada.`,
                    data: c.created_at, // O ideal seria 'updated_at', mas created_at funciona como fallback
                    link: `/dashboard/campanhas`
                }));
                arr = [...arr, ...campNotif];
            }

            // Ordenar por data mais recente
            arr.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

            // Pegar as 5 mais recentes
            const top5 = arr.slice(0, 5);
            setNotifications(top5);

            // Controlar a "bolinha" baseada na última vez que o usuário abriu
            const lastSeenStr = localStorage.getItem('lastSeenNotifications');
            if (!lastSeenStr && top5.length > 0) {
                setHasUnread(true);
            } else if (lastSeenStr && top5.length > 0) {
                const lastSeenTime = new Date(lastSeenStr).getTime();
                const latestNotifTime = new Date(top5[0].data).getTime();
                if (latestNotifTime > lastSeenTime) {
                    setHasUnread(true);
                }
            }

        } catch (error) {
            console.error('Erro ao buscar notificações', error);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Inscrever para escutar novos leads
        const channel = supabase.channel('realtime_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clientes' }, () => {
                fetchNotifications();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'campanhas', filter: 'status=eq.concluida' }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNotifications = () => {
        const newValue = !isOpen;
        setIsOpen(newValue);
        if (newValue) {
            // Quando abre, marca todas como lidas
            setHasUnread(false);
            localStorage.setItem('lastSeenNotifications', new Date().toISOString());
        }
    };

    return (
        <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-end px-6 fixed top-0 right-0 left-0 md:left-64 z-10">
            <div className="flex items-center gap-3">
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={toggleNotifications}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors focus:outline-none"
                    >
                        <Bell className="h-5 w-5" />
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        )}
                    </button>

                    {/* Dropdown de Notificações */}
                    {isOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50/50">
                                <h3 className="font-semibold text-gray-800 text-sm">Notificações</h3>
                                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">
                                        Nenhuma notificação no momento.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-50">
                                        {notifications.map(notif => (
                                            <li key={notif.id}>
                                                <Link
                                                    href={notif.link}
                                                    onClick={() => setIsOpen(false)}
                                                    className="flex items-start gap-3 p-4 hover:bg-blue-50/50 transition-colors"
                                                >
                                                    <div className="mt-0.5">
                                                        {notif.tipo === 'lead' ? (
                                                            <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
                                                                <UserPlus className="h-4 w-4" />
                                                            </div>
                                                        ) : (
                                                            <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                                                                <CheckCircle className="h-4 w-4" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 leading-tight mb-1">{notif.titulo}</p>
                                                        <p className="text-xs text-gray-600 mb-1">{notif.mensagem}</p>
                                                        <p className="text-[10px] text-gray-400">
                                                            {formatDistanceToNow(new Date(notif.data), { addSuffix: true, locale: ptBR })}
                                                        </p>
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-medium text-gray-700">Admin</p>
                        <p className="text-xs text-gray-400">Gestor</p>
                    </div>
                    <div className="h-9 w-9 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                        A
                    </div>
                </div>
            </div>
        </header>
    );
}
