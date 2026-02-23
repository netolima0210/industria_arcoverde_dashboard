'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, MessageSquare, Package, Settings, LogOut, Zap, Contact, Megaphone } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/leads', label: 'Leads', icon: Users },
    { href: '/dashboard/vendedores', label: 'Vendedores', icon: Contact },
    { href: '/dashboard/campanhas', label: 'Campanhas', icon: Megaphone },
    { href: '/dashboard/conversas', label: 'Conversas', icon: MessageSquare },
    { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <aside className="w-64 bg-primary h-screen hidden md:flex flex-col fixed left-0 top-0 z-20">
            {/* Logo */}
            <div className="p-6 flex items-center gap-3">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white leading-tight">Indústria</h1>
                    <p className="text-xs text-white/70 font-medium">Arcoverde</p>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 mt-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-white text-primary shadow-sm"
                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-primary" : "text-white/80"
                            )} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="px-3 pb-6">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 text-sm font-medium"
                >
                    <LogOut className="h-5 w-5" />
                    <span>Sair</span>
                </button>
            </div>
        </aside>
    );
}
