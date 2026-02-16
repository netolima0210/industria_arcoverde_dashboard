
import { Bell, User } from 'lucide-react';

export function Header() {
    return (
        <header className="h-16 bg-white border-b flex items-center justify-between px-6 fixed top-0 right-0 left-0 md:left-64 z-10">
            <div className="flex items-center gap-4">
                {/* Breadcrumbs or Page Title could go here */}
                <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="flex items-center gap-3 pl-4 border-l">
                    <div className="hidden md:block text-right">
                        <p className="text-sm font-medium text-gray-700">Admin User</p>
                        <p className="text-xs text-gray-500">Gestor</p>
                    </div>
                    <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <User className="h-5 w-5" />
                    </div>
                </div>
            </div>
        </header>
    );
}
