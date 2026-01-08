// Dashboard - Modernizado con Sparklines y Acciones Rápidas
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardService } from '../services/api';
import type { DashboardStats } from '../types/api.types';
import CardStat from '../components/CardStat';
import {
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    AlertTriangle,
    ChevronRight,
    Calendar,
    Sparkles,
    FilePlus,
    Wrench,
    Plus,
    Banknote,
} from 'lucide-react';
import { motion } from 'framer-motion';



const Dashboard = () => {
    const { usuario, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const fetchDashboard = async () => {
            try {
                setLoading(true);
                const response = await dashboardService.obtenerResumen();
                const data = response as any;
                if (isMounted && data.resumen) {
                    setStats(data.resumen);
                }
            } catch (err) {
                if (isMounted) {
                    setError('No se pudo cargar la información del dashboard.');
                    console.error(err);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDashboard();

        return () => {
            isMounted = false;
        };
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await dashboardService.obtenerResumen();
            const data = response as any;
            if (data.resumen) {
                setStats(data.resumen);
            }
        } catch (err) {
            setError('No se pudo cargar la información del dashboard.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatearMoneda = (valor: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(valor);
    };

    // Datos de Sparkline simulados (Aleatorios para efecto demo ya que la API no provee historial aún)
    const generateSparkline = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 50) + 10);

    const SkeletonCard = () => (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm animate-pulse h-48">
            <div className="flex justify-between items-start mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-200"></div>
                <div className="w-20 h-6 rounded-full bg-slate-200"></div>
            </div>
            <div className="space-y-2 mt-8">
                <div className="h-6 w-32 bg-slate-200 rounded"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="h-64 w-full bg-slate-200 rounded-3xl animate-pulse"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon bg-rose-50 text-rose-500">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <h3 className="empty-state-title">Error de Conexión</h3>
                <p className="empty-state-text text-rose-600/80">{error}</p>
                <button onClick={fetchDashboard} className="btn btn-secondary">
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    const safeStats = stats || {
        vehiculos: { activos: 0, total: 0 },
        choferes: { activos: 0, total: 0 },
        clientes: { activos: 0, total: 0 },
        materiales: { total: 0 },
        viajesMes: undefined,
        topVehiculos: [],
        topClientes: [],
        resumenAlertas: { documentos: 0, mantenimiento: 0, choferesSaldo: 0, pagosChoferes: 0, licencias: 0, pagosViajes: 0, viajesProximos: 0, total: 0 }
    };

    const cards = [
        {
            title: 'Vehículos Activos',
            value: safeStats.vehiculos.activos,
            subValue: `de ${safeStats.vehiculos.total} Total`,
            icon: Truck,
            color: 'blue' as const,
            trend: 'Operativos',
            path: '/vehiculos',
            data: generateSparkline()
        },
        {
            title: 'Choferes Disponibles',
            value: safeStats.choferes.activos,
            subValue: `de ${safeStats.choferes.total} Total`,
            icon: Users,
            color: 'emerald' as const,
            trend: 'En servicio',
            path: '/choferes',
            data: generateSparkline()
        },
        {
            title: 'Clientes Activos',
            value: safeStats.clientes.activos,
            subValue: `${safeStats.clientes.total} Registrados`,
            icon: BriefcaseBusiness,
            color: 'violet' as const,
            trend: 'Cartera',
            path: '/clientes',
            data: generateSparkline()
        },
        {
            title: 'Materiales',
            value: safeStats.materiales.total,
            subValue: 'Catálogo General',
            icon: Package,
            color: 'amber' as const,
            trend: 'Tipos',
            path: '/materiales',
            data: generateSparkline()
        }
    ];

    const quickActions = [
        { label: 'Nuevo Viaje', icon: FilePlus, path: '/viajes?action=new', color: 'text-indigo-600', bg: 'group-hover:bg-indigo-600' },
        { label: 'Mantenimiento', icon: Wrench, path: '/mantenimientos?action=new', color: 'text-orange-600', bg: 'group-hover:bg-orange-600' },
        { label: 'Nuevo Chofer', icon: Users, path: '/choferes?action=new', color: 'text-emerald-600', bg: 'group-hover:bg-emerald-600' },
        { label: 'Nuevo Vehículo', icon: Truck, path: '/vehiculos?action=new', color: 'text-blue-600', bg: 'group-hover:bg-blue-600' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Welcome Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-[2rem] p-8 md:p-12 overflow-hidden shadow-2xl group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700 transition-all duration-1000 group-hover:scale-105"></div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/20 rounded-full blur-3xl opacity-50 animate-pulse-soft"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-indigo-400/30 rounded-full blur-3xl opacity-50"></div>

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-4 shadow-sm">
                            <Sparkles className="w-3 h-3 text-yellow-300" />
                            Panel de Control
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2 drop-shadow-sm">
                            ¡Hola, {usuario?.nombreCompleto?.split(' ')[0] || 'Admin'}!
                        </h1>
                        <p className="text-indigo-100 text-lg font-medium flex items-center gap-2 opacity-90">
                            <Calendar className="h-5 w-5" />
                            {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* Sparkline Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, index) => (
                    <CardStat
                        key={index}
                        {...card}
                        onClick={() => navigate(card.path)}
                        delay={index + 2}
                    />
                ))}
            </div>

            {/* Alerts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Alerts Card */}
                {safeStats.resumenAlertas && safeStats.resumenAlertas.total > 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-white rounded-[2rem] border border-slate-100 shadow-card overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Alertas del Sistema
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold animate-pulse">
                                    {safeStats.resumenAlertas.total}
                                </span>
                            </h3>
                        </div>
                        <div className="p-2">
                            {safeStats.resumenAlertas.documentos > 0 && (
                                <div className="p-4 mx-2 mb-2 rounded-xl bg-orange-50 border border-orange-100 flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-orange-800 text-sm">Documentos por Vencer</p>
                                        <p className="text-xs text-orange-600 mt-0.5">{safeStats.resumenAlertas.documentos} vehículos requieren atención.</p>
                                    </div>
                                </div>
                            )}
                            {safeStats.resumenAlertas.mantenimiento > 0 && (
                                <div className="p-4 mx-2 mb-2 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
                                    <Wrench className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-blue-800 text-sm">Mantenimientos</p>
                                        <p className="text-xs text-blue-600 mt-0.5">{safeStats.resumenAlertas.mantenimiento} programados próximamente.</p>
                                    </div>
                                </div>
                            )}
                            {(safeStats.resumenAlertas.pagosChoferes || 0) > 0 && (
                                <div className="p-4 mx-2 mb-2 rounded-xl bg-emerald-50 border border-emerald-100 flex gap-3">
                                    <Banknote className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-emerald-800 text-sm">Pagos Mensuales</p>
                                        <p className="text-xs text-emerald-600 mt-0.5">{safeStats.resumenAlertas.pagosChoferes} pago(s) pendiente(s).</p>
                                    </div>
                                </div>
                            )}
                            {(safeStats.resumenAlertas.licencias || 0) > 0 && (
                                <div className="p-4 mx-2 mb-2 rounded-xl bg-pink-50 border border-pink-100 flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-pink-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-pink-800 text-sm">Licencias por Vencer</p>
                                        <p className="text-xs text-pink-600 mt-0.5">{safeStats.resumenAlertas.licencias} chofer(es) con licencia por vencer.</p>
                                    </div>
                                </div>
                            )}
                            {(safeStats.resumenAlertas.pagosViajes || 0) > 0 && (
                                <div className="p-4 mx-2 mb-2 rounded-xl bg-amber-50 border border-amber-100 flex gap-3">
                                    <Banknote className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-amber-800 text-sm">Pagos Viajes Pendientes</p>
                                        <p className="text-xs text-amber-600 mt-0.5">{safeStats.resumenAlertas.pagosViajes} pago(s) de viajes pendiente(s).</p>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 mt-2 text-center">
                                <button
                                    onClick={() => navigate('/alertas')}
                                    className="w-full py-3 rounded-xl bg-slate-50 text-slate-600 font-bold text-sm hover:bg-slate-100 hover:text-indigo-600 transition-all border border-slate-100 hover:border-slate-200"
                                >
                                    Ver Centro de Alertas
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2rem] p-8 text-white shadow-lg text-center"
                    >
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">¡Todo en Orden!</h3>
                        <p className="text-emerald-100 text-sm">No hay alertas pendientes que requieran tu atención inmediata.</p>
                    </motion.div>
                )}

                {/* Quick Access Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-[2rem] p-6 border-2 border-indigo-100 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-300 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
                    <h3 className="text-lg font-bold mb-4 relative z-10 text-indigo-900">Acceso Rápido</h3>
                    <div className="space-y-3 relative z-10">
                        <button onClick={() => navigate('/reportes')} className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-100/80 hover:bg-indigo-200 transition-all border border-indigo-200 group">
                            <span className="text-sm font-medium text-indigo-800">Ver Reportes Financieros</span>
                            <ChevronRight className="h-4 w-4 text-indigo-500 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all" />
                        </button>
                        <button onClick={() => navigate('/viajes')} className="w-full flex items-center justify-between p-3 rounded-xl bg-violet-100/80 hover:bg-violet-200 transition-all border border-violet-200 group">
                            <span className="text-sm font-medium text-violet-800">Gestionar Viajes</span>
                            <ChevronRight className="h-4 w-4 text-violet-500 group-hover:text-violet-700 group-hover:translate-x-1 transition-all" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
