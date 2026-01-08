import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, ArrowRight, CornerDownLeft, FilePlus, Truck, Users, Wrench, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    menuItems: any[];
}

const CommandPalette = ({ isOpen, onClose, menuItems }: CommandPaletteProps) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Definir acciones rápidas estáticas
    const quickActions = [
        {
            id: 'new-trip',
            label: 'Nuevo Viaje',
            path: '/viajes?action=new',
            icon: FilePlus,
            description: 'Crear una nueva orden de transporte',
            keywords: ['crear', 'nuevo', 'viaje', 'ruta']
        },
        {
            id: 'new-maintenance',
            label: 'Registrar Mantenimiento',
            path: '/mantenimientos?action=new',
            icon: Wrench,
            description: 'Ingresar servicio de taller',
            keywords: ['mantenimiento', 'taller', 'reparación', 'servicio']
        },
        {
            id: 'new-driver',
            label: 'Nuevo Chofer',
            path: '/choferes?action=new',
            icon: Users,
            description: 'Dar de alta un conductor',
            keywords: ['chofer', 'conductor', 'personal', 'crear']
        },
        {
            id: 'new-vehicle',
            label: 'Nuevo Vehículo',
            path: '/vehiculos?action=new',
            icon: Truck,
            description: 'Registrar una nueva unidad',
            keywords: ['vehículo', 'camión', 'flota', 'crear']
        }
    ];

    // Combinar y filtrar resultados
    const filteredItems = [
        ...quickActions.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description.toLowerCase().includes(query.toLowerCase()) ||
            item.keywords.some(k => k.includes(query.toLowerCase()))
        ).map(item => ({ ...item, type: 'action' })),
        ...menuItems.filter(item =>
            item.label.toLowerCase().includes(query.toLowerCase())
        ).map(item => ({ ...item, type: 'navigation', description: 'Ir a página' }))
    ];

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Manejo de teclado
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredItems.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[selectedIndex]) {
                    handleSelect(filteredItems[selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex]);

    const handleSelect = (item: any) => {
        navigate(item.path);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] overflow-y-auto w-full h-full flex items-start justify-center pt-[15vh] px-4">

                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="relative bg-white/90 backdrop-blur-xl w-full max-w-xl rounded-2xl shadow-2xl ring-1 ring-white/50 border border-slate-200/50 overflow-hidden flex flex-col max-h-[60vh]"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Search Header */}
                        <div className="relative border-b border-slate-100 flex-shrink-0">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-12 pr-12 py-5 text-lg text-slate-800 placeholder:text-slate-400 focus:outline-none bg-transparent"
                                placeholder="¿Qué deseas hacer?"
                                value={query}
                                onChange={e => {
                                    setQuery(e.target.value);
                                    setSelectedIndex(0);
                                }}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Results List */}
                        <div className="overflow-y-auto py-2 flex-1 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                            {filteredItems.length > 0 ? (
                                <div className="px-2 space-y-1">
                                    {filteredItems.map((item, index) => (
                                        <motion.button
                                            layout
                                            key={`${item.type}-${item.path}`}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-4 transition-all duration-200 group ${index === selectedIndex
                                                    ? 'bg-indigo-50/80 text-indigo-900 shadow-sm ring-1 ring-indigo-100'
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }`}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                        >
                                            <div className={`p-2.5 rounded-xl transition-colors ${index === selectedIndex
                                                    ? 'bg-white text-indigo-600 shadow-sm'
                                                    : 'bg-slate-100/80 text-slate-500 group-hover:bg-white group-hover:shadow-sm'
                                                }`}>
                                                <item.icon size={20} className="stroke-[2px]" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`font-semibold truncate ${index === selectedIndex ? 'text-indigo-900' : 'text-slate-700'}`}>
                                                        {item.label}
                                                    </span>
                                                    {item.type === 'action' && (
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${index === selectedIndex
                                                                ? 'bg-indigo-100 text-indigo-600 border-indigo-200'
                                                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                                            }`}>
                                                            Acción
                                                        </span>
                                                    )}
                                                </div>
                                                <p className={`text-xs truncate ${index === selectedIndex ? 'text-indigo-600/80' : 'text-slate-400'}`}>
                                                    {item.description}
                                                </p>
                                            </div>

                                            {index === selectedIndex && (
                                                <motion.div
                                                    layoutId="enter-icon"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <CornerDownLeft size={18} className="text-indigo-400" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-16 text-center text-slate-500 flex flex-col items-center">
                                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                                        <Command size={32} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">No se encontraron resultados</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                                        Intenta buscar "viaje", "mantenimiento", o "chofer"
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-slate-50/80 backdrop-blur-sm px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] font-medium text-slate-400 uppercase tracking-wider flex-shrink-0">
                            <span className="flex items-center gap-1.5">
                                <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 text-[10px] shadow-sm">ESC</kbd> cerrar
                            </span>
                            <div className="flex gap-4">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 text-[10px] shadow-sm">↑↓</kbd> navegar
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 text-[10px] shadow-sm">↵</kbd> seleccionar
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CommandPalette;
