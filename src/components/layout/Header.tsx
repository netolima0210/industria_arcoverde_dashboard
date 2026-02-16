
import { Bell } from 'lucide-react';

export function Header() {
    return (
        <header className="h-16 bg-white border-b border-gray-200/80 flex items-center justify-end px-6 fixed top-0 right-0 left-0 md:left-64 z-10">
            <div className="flex items-center gap-3">
                <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full relative transition-colors">
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                </button>

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
