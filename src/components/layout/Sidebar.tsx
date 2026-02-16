
import Link from 'next/link';
import { LayoutDashboard, Users, MessageSquare, Package, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/conversas', label: 'Conversas', icon: MessageSquare },
    { href: '/produtos', label: 'Produtos', icon: Package },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar() {
    return (
        <aside className="w-64 bg-white border-r h-screen hidden md:flex flex-col fixed left-0 top-0">
            <div className="p-6 border-b flex items-center justify-center">
                <h1 className="text-xl font-bold text-primary">Arcoverde</h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors",
                            // Add active state logic here if needed (using usePathname)
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t">
                <button className="flex items-center gap-3 px-4 py-3 w-full text-left text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </aside>
    );
}
