import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import Sidebar from './Sidebar';
import {
    LayoutDashboard,
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    Menu,
    ShieldCheck,
    MapPin,
    Wrench,
    Banknote,
    BarChart3,
    Search,
    Command,
    Bell
} from 'lucide-react';
import CommandPalette from './CommandPalette';
import AlertsDropdown from './AlertsDropdown';
import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
    const { usuario, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

    // Global Key Listener for Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close sidebar on mobile route change
    useEffect(() => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Definir todos los items de menú con sus roles permitidos
    const allMenuItems = [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/vehiculos', icon: Truck, label: 'Vehículos', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/choferes', icon: Users, label: 'Choferes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/clientes', icon: BriefcaseBusiness, label: 'Clientes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/materiales', icon: Package, label: 'Materiales', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/viajes', icon: MapPin, label: 'Viajes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/mantenimientos', icon: Wrench, label: 'Mantenimientos', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/pagos-choferes', icon: Banknote, label: 'Pagos Choferes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/reportes', icon: BarChart3, label: 'Reportes', roles: ['ADMIN', 'AUDITOR'] },
        { path: '/auditoria', icon: ShieldCheck, label: 'Auditoría', roles: ['AUDITOR'] },
    ];

    // Filtrar menú según rol del usuario
    const menuItems = allMenuItems.filter(item =>
        item.roles.includes(usuario?.rol || '')
    );

    const getPageTitle = () => {
        const item = allMenuItems.find(item => {
            if (item.path === '/') return location.pathname === '/';
            return location.pathname.startsWith(item.path);
        });
        return item ? item.label : 'Transporte';
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">

            <Sidebar
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                menuItems={menuItems}
                onLogout={() => setShowLogoutModal(true)}
            />

            {/* Main Content Wrapper */}
            <main className={`flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300 relative`}>

                {/* Background Decor */}
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent opacity-60"></div>
                </div>

                {/* Floating Header */}
                <header className="h-20 flex-shrink-0 z-20 px-6 lg:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-4 bg-white/70 backdrop-blur-md border border-white/50 shadow-glass rounded-2xl px-4 py-2 mt-4 ml-2 transition-all duration-300">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all hover:text-indigo-600 active:scale-95"
                        >
                            <Menu className="h-5 w-5" />
                        </button>

                        <div className="h-6 w-[1px] bg-slate-200 hidden md:block"></div>

                        <h2 className="font-display font-bold text-slate-800 text-lg tracking-tight hidden sm:block">
                            {getPageTitle()}
                        </h2>
                    </div>

                    <div className="flex items-center gap-4 mt-4 mr-2">
                        {/* Search Trigger */}
                        <button
                            onClick={() => setIsCommandPaletteOpen(true)}
                            className="hidden md:flex items-center gap-2 bg-white/80 backdrop-blur-md hover:bg-white border border-slate-200/60 shadow-sm text-slate-400 px-3 py-2 rounded-xl transition-all hover:border-indigo-200 hover:text-indigo-500 hover:shadow-md group active:scale-[0.98]"
                        >
                            <Search className="h-4 w-4" />
                            <span className="text-sm font-medium pr-1">Buscar...</span>
                            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 rounded-md border border-slate-200 text-[10px] font-bold text-slate-500 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors">
                                <Command className="h-3 w-3" />
                                <span>K</span>
                            </div>
                        </button>

                        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-1 border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
                            <AlertsDropdown />
                        </div>
                    </div>
                </header>

                {/* Content Scroll Area */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300 p-6 lg:p-10 z-10">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 15, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -15, scale: 0.99 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                            className="w-full max-w-7xl mx-auto min-h-full"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Modal de confirmación de logout */}
            <ConfirmModal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                onConfirm={handleLogout}
                title="Cerrar Sesión"
                message="¿Estás seguro de que deseas cerrar tu sesión? Deberás iniciar sesión nuevamente para acceder al sistema."
                confirmText="Cerrar Sesión"
                cancelText="Cancelar"
                type="info"
            />

            {/* Global Command Palette */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
                menuItems={menuItems}
            />
        </div>
    );
};

export default Layout;
