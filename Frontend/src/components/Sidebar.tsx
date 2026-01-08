import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, LogOut, ChevronRight, User, Settings } from 'lucide-react';
import { ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MenuItem {
    path: string;
    icon: ElementType;
    label: string;
    roles: string[];
}

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    menuItems: MenuItem[];
    onLogout: () => void;
}

const Sidebar = ({ isOpen, setIsOpen, menuItems, onLogout }: SidebarProps) => {
    const { usuario } = useAuth();
    const location = useLocation();

    return (
        <>
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={false}
                animate={{
                    width: isOpen ? 280 : 80,
                    x: 0
                }}
                className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-slate-50/50 backdrop-blur-xl border-r border-white/50 shadow-glass flex flex-col transition-colors duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Logo Area */}
                <div className={`h-24 flex items-center ${isOpen ? 'px-8' : 'justify-center'} border-b border-slate-100/50 relative overflow-hidden`}>

                    {/* Background glow effect for Logo */}
                    {isOpen && <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>}

                    <motion.div
                        className="flex items-center gap-3 relative z-10"
                        layout
                    >
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl p-2.5 shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-500/50">
                            <Truck className="h-6 w-6 text-white" />
                        </div>

                        <AnimatePresence mode="popLayout">
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="flex flex-col"
                                >
                                    <h1 className="text-xl font-bold tracking-tight font-display text-slate-800 leading-none">
                                        Fleet<span className="text-indigo-600">Master</span>
                                    </h1>
                                    <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mt-1">Management OS</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Navigation Scroll Area */}
                <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className="block outline-none"
                                title={!isOpen ? item.label : ''}
                            >
                                <div className={`group relative flex items-center ${isOpen ? 'px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>

                                    {/* Active Background Pill */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white shadow-sm border border-indigo-100 rounded-xl"
                                        />
                                    )}

                                    {/* Hover Background */}
                                    {!isActive && (
                                        <div className="absolute inset-0 bg-white/50 border border-transparent hover:border-slate-100 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                    )}

                                    {/* Icon Container */}
                                    <div className={`relative z-10 p-2 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50' : 'bg-transparent group-hover:bg-slate-50'}`}>
                                        <Icon className={`stroke-[2px] transition-all duration-300 ${isOpen ? 'h-5 w-5' : 'h-6 w-6'} ${isActive ? 'text-indigo-600 drop-shadow-sm' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                    </div>

                                    {/* Label (Text) */}
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: "auto" }}
                                                exit={{ opacity: 0, width: 0 }}
                                                className={`relative z-10 ml-3 font-medium text-sm tracking-wide whitespace-nowrap overflow-hidden ${isActive ? 'font-bold' : ''}`}
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {/* Active/Hover Indicator Arrow */}
                                    <AnimatePresence>
                                        {isOpen && isActive && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2"
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-lg shadow-indigo-500/50" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </NavLink>
                        );
                    })}
                </div>

                {/* User Profile Footer */}
                <div className="p-4 bg-gradient-to-t from-white/80 to-transparent backdrop-blur-sm border-t border-white/50">
                    <div className={`relative bg-white/60 border border-white shadow-sm rounded-2xl p-2 transition-all duration-300 hover:shadow-md hover:bg-white/80 ${isOpen ? 'flex items-center gap-3 pr-3' : 'flex flex-col gap-3 items-center py-4'}`}>

                        <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-white flex items-center justify-center border border-indigo-50 shadow-inner">
                                <User className="w-5 h-5 text-indigo-900/60" />
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></span>
                        </div>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    className="flex-1 min-w-0"
                                >
                                    <p className="text-sm font-bold text-slate-800 truncate">
                                        {usuario?.nombreCompleto?.split(' ')[0] || 'Usuario'}
                                    </p>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider truncate bg-indigo-50 px-1.5 py-0.5 rounded-full inline-block mt-0.5 border border-indigo-100/50">
                                        {usuario?.rol}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={onLogout}
                            title="Cerrar Sesión"
                            className={`relative z-10 p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-200 group ${!isOpen && 'w-full'}`}
                        >
                            <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                        </button>
                    </div>
                </div>
            </motion.aside>
        </>
    );
};

export default Sidebar;
