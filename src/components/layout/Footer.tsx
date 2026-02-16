export function Footer() {
    return (
        <footer className="py-4 px-6 mt-auto">
            <div className="flex justify-center items-center">
                <p className="text-xs text-gray-400">
                    &copy; {new Date().getFullYear()} <span className="font-medium text-gray-500">N7tech</span> - Todos os direitos reservados
                </p>
            </div>
        </footer>
    );
}
