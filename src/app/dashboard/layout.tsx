
import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
    title: "Dashboard - Indústria Arcoverde",
    description: "Painel de controle do agente CLP",
};

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-[#f1f3f4] flex">
            <Sidebar />
            <div className="flex-1 flex flex-col md:ml-64 transition-all duration-300 min-h-screen">
                <Header />
                <main className="flex-1 p-6 mt-16 overflow-y-auto">
                    {children}
                </main>
                <Footer />
            </div>
        </div>
    );
}
