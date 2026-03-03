export function Footer() {
    return (
        <footer className="py-4 px-6 mt-auto sticky bottom-0 bg-white/60 backdrop-blur-md border-t border-gray-200/50 z-50">
            <div className="flex justify-center items-center">
                <p className="text-base text-gray-400">
                    &copy; {new Date().getFullYear()} <a href="https://www.instagram.com/nexflow7/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:underline transition-all">nexseven</a> - Todos os direitos reservados
                </p>
            </div>
        </footer>
    );
}
