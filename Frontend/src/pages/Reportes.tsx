import React, { useState, useEffect, useRef, useMemo } from 'react';
import { reportesService, vehiculoService, choferService, clienteService } from '../services/api';
import type { Vehiculo, Chofer, Cliente } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import { BarChart3, Calendar, TrendingUp, TrendingDown, DollarSign, Truck, Users, Briefcase, FileText, Banknote, Download, PieChart, Activity } from 'lucide-react';
import ReporteCartera from '../components/ReporteCartera';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useFormatters } from '../hooks/useFormatters';

// Tipo para datos de reporte unificado
interface ReporteData {
    ingresos?: number | string;
    gastos?: {
        total?: number | string;
        pagosChoferes?: number | string;
        mantenimientos?: number | string;
        viaticos?: number | string;
    };
    gananciaNeta?: number | string;
    ingresosViajes?: number | string;
    gastosTotales?: number | string;
    pagosChoferes?: number | string;
    gastosMantenimientos?: number | string;
    gastosViaticos?: number | string;
    viajesRealizados?: number;
    ingresosGenerados?: number | string;
    pagosRealizados?: number | string;
    saldoPendiente?: number | string;
    ingresosTotales?: number | string;
    materialMasFrecuente?: string;
    // Permite propiedades adicionales dinámicas si es necesario, pero preferir tipos explícitos
    [key: string]: unknown;
}

// Tipo para colores de CardReport
type CardColor = 'emerald' | 'rose' | 'indigo' | 'blue' | 'amber' | 'purple';

// Props tipadas para CardReport
interface CardReportProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    color: CardColor;
}

const Reportes = () => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'VEHICULOS' | 'CHOFERES' | 'CLIENTES' | 'CARTERA'>('GENERAL');
    const [loading, setLoading] = useState(false);

    // Listas de selección
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [choferes, setChoferes] = useState<Chofer[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);

    // Filtros
    // Por defecto: Primer día del mes actual hasta hoy
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    const [filtros, setFiltros] = useState({
        id: '',
        fechaDesde: firstDay,
        fechaHasta: today
    });

    // Refs for date inputs to open picker on icon click
    const fromDateRef = useRef<HTMLInputElement>(null);
    const toDateRef = useRef<HTMLInputElement>(null);

    // Resultado de datos
    const [reporteData, setReporteData] = useState<ReporteData | null>(null);

    useEffect(() => {
        cargarListas();

        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const id = params.get('id');

        if (tab && ['GENERAL', 'VEHICULOS', 'CHOFERES', 'CLIENTES'].includes(tab)) {
            setActiveTab(tab as 'GENERAL' | 'VEHICULOS' | 'CHOFERES' | 'CLIENTES');
        }
        if (id) {
            setFiltros(prev => ({ ...prev, id }));
        } else if (!tab || tab === 'GENERAL') {
            // Auto-load general report if landing on page
            generarReporte('GENERAL');
        }
    }, []);

    const cargarListas = async () => {
        try {
            const [v, c, cli] = await Promise.all([
                vehiculoService.listar({ estado: 'ACTIVO' }),
                choferService.listar({ estado: 'ACTIVO' }),
                clienteService.listar({ estado: 'ACTIVO' })
            ]);
            setVehiculos(v.datos || []);
            setChoferes(c.datos || []);
            setClientes(cli.datos || []);
        } catch (error) {
            const err = error as ApiError;
            console.error('Error cargando listas:', err);
        }
    };

    const generarReporte = async (tabOverride?: string) => {
        const tab = tabOverride || activeTab;

        // Validation: ID is required for entity reports, but NOT for GENERAL
        if (tab !== 'GENERAL' && !filtros.id) return;

        setLoading(true);
        setReporteData(null);
        try {
            let data;
            const params = {
                fechaDesde: new Date(filtros.fechaDesde).toISOString(),
                fechaHasta: new Date(filtros.fechaHasta).toISOString()
            };

            if (tab === 'GENERAL') {
                data = await reportesService.general(params);
            } else if (tab === 'VEHICULOS') {
                data = await reportesService.porVehiculo({ vehiculoId: Number(filtros.id), ...params });
            } else if (tab === 'CHOFERES') {
                data = await reportesService.porChofer({ choferId: Number(filtros.id), ...params });
            } else if (tab === 'CLIENTES') {
                data = await reportesService.porCliente({ clienteId: Number(filtros.id), ...params });
            }
            setReporteData(data.datos);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al generar el reporte'));
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                toast.error('No se encontró el token de autenticación');
                return;
            }

            let url = '';
            const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
            const queryParams = `fechaDesde=${filtros.fechaDesde}&fechaHasta=${filtros.fechaHasta}`;

            if (activeTab === 'GENERAL') {
                url = `${baseUrl}/reportes/general/export?${queryParams}`;
            } else if (activeTab === 'VEHICULOS') {
                url = `${baseUrl}/reportes/vehiculos/export?vehiculoId=${filtros.id}&${queryParams}`;
            } else if (activeTab === 'CHOFERES') {
                url = `${baseUrl}/reportes/choferes/export?choferId=${filtros.id}&${queryParams}`;
            } else if (activeTab === 'CLIENTES') {
                url = `${baseUrl}/reportes/clientes/export?clienteId=${filtros.id}&${queryParams}`;
            }

            const promise = fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).then(async (response) => {
                if (!response.ok) throw new Error('Error al descargar');
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `reporte_${activeTab.toLowerCase()}_${new Date().getTime()}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);
                return 'Reporte descargado correctamente';
            });

            toast.promise(promise, {
                loading: 'Generando archivo CSV...',
                success: 'Reporte descargado correctamente',
                error: 'Error al exportar el archivo',
            });

        } catch (error) {
            const err = error as ApiError;
            console.error("Error exportando:", err);
            if (!wasToastShown(err)) toast.error("Error al iniciar la exportación");
        }
    };

    const handleTabChange = (tab: 'GENERAL' | 'VEHICULOS' | 'CHOFERES' | 'CLIENTES' | 'CARTERA') => {
        setActiveTab(tab);
        if (tab !== 'GENERAL') {
            setFiltros({ ...filtros, id: '' });
            setReporteData(null);
        } else {
            generarReporte('GENERAL');
        }
    };

    // Prepare chart data function
    const getChartData = () => {
        if (!reporteData) return [];

        if (activeTab === 'GENERAL') {
            return [
                { name: 'Ingresos', valor: Number(reporteData.ingresos), fill: '#10b981' },
                { name: 'Gastos', valor: Number(reporteData.gastos?.total), fill: '#ef4444' },
                { name: 'Ganancia', valor: Number(reporteData.gananciaNeta), fill: '#6366f1' }
            ];
        }
        if (activeTab === 'VEHICULOS') {
            return [
                { name: 'Ingresos', valor: Number(reporteData.ingresosViajes), fill: '#10b981' }, // Emerald
                { name: 'Gastos', valor: Number(reporteData.gastosTotales), fill: '#ef4444' },   // Red
                { name: 'Ganancia', valor: Number(reporteData.ingresosViajes) - Number(reporteData.gastosTotales), fill: '#6366f1' }       // Indigo
            ];
        }
        if (activeTab === 'CHOFERES') {
            return [
                { name: 'Generado', valor: Number(reporteData.ingresosGenerados), fill: '#10b981' },
                { name: 'Pagado', valor: Number(reporteData.pagosRealizados), fill: '#3b82f6' },
                { name: 'Pendiente', valor: Number(reporteData.saldoPendiente), fill: '#f59e0b' }
            ];
        }
        if (activeTab === 'CLIENTES') {
            return [
                { name: 'Facturado', valor: Number(reporteData.ingresosTotales), fill: '#10b981' },
            ];
        }
        return [];
    };

    const chartData = getChartData();

    return (
        <div className="space-y-8 pb-10">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">Reportes y Estadísticas</h1>
                <p className="text-slate-500 mt-2 text-lg">Análisis financiero y operativo detallado</p>
            </motion.div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-100/50 rounded-2xl overflow-x-auto">
                {[
                    { id: 'GENERAL', icon: Activity, label: 'General' },
                    { id: 'VEHICULOS', icon: Truck, label: 'Vehículos' },
                    { id: 'CHOFERES', icon: Users, label: 'Choferes' },
                    { id: 'CLIENTES', icon: Briefcase, label: 'Clientes' },
                    { id: 'CARTERA', icon: FileText, label: 'Cartera' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        className={`flex-1 min-w-[120px] px-6 py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 relative ${activeTab === tab.id ? 'text-indigo-600 shadow-sm bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div layoutId="tab-bg" className="absolute inset-0 bg-white rounded-xl shadow-sm z-0" transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <tab.icon className="w-4 h-4" /> {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* Content for Cartera */}
            <AnimatePresence mode="wait">
                {activeTab === 'CARTERA' ? (
                    <motion.div key="cartera" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <ReporteCartera />
                    </motion.div>
                ) : (
                    <motion.div key="filters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                        {/* Filters Panel */}
                        <div className="bg-white p-6 rounded-3xl shadow-card border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        {activeTab === 'GENERAL' ? 'Rango de Fecha' :
                                            activeTab === 'VEHICULOS' ? 'Seleccionar Vehículo' :
                                                activeTab === 'CHOFERES' ? 'Seleccionar Chofer' : 'Seleccionar Cliente'}
                                    </label>

                                    {activeTab === 'GENERAL' ? (
                                        <div className="h-12 flex items-center px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-500 italic">
                                            Reporte Global de la Flota
                                        </div>
                                    ) : (
                                        <select
                                            className="form-select bg-slate-50/50 border-slate-200 focus:bg-white transition-all h-12 text-slate-700 font-medium"
                                            value={filtros.id}
                                            onChange={e => setFiltros({ ...filtros, id: e.target.value })}
                                            autoFocus
                                        >
                                            <option value="">Seleccione una opción...</option>
                                            {activeTab === 'VEHICULOS' && vehiculos?.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                                            {activeTab === 'CHOFERES' && choferes?.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                                            {activeTab === 'CLIENTES' && clientes?.map(c => <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Desde</label>
                                    <div className="relative group">
                                        <input
                                            ref={fromDateRef}
                                            type="date"
                                            className="form-input bg-slate-50/50 border-slate-200 focus:bg-white h-12 w-full transition-all hover:bg-white cursor-pointer relative z-10"
                                            value={filtros.fechaDesde}
                                            onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                                        />
                                        <Calendar
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none group-hover:text-indigo-500 transition-colors z-20"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Hasta</label>
                                    <div className="relative group">
                                        <input
                                            ref={toDateRef}
                                            type="date"
                                            className="form-input bg-slate-50/50 border-slate-200 focus:bg-white h-12 w-full transition-all hover:bg-white cursor-pointer relative z-10"
                                            value={filtros.fechaHasta}
                                            onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                                        />
                                        <Calendar
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none group-hover:text-indigo-500 transition-colors z-20"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex gap-3 justify-end mt-6 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => generarReporte()}
                                    disabled={(!filtros.id && activeTab !== 'GENERAL') || loading}
                                    className="btn btn-primary px-8 py-3 h-12 shadow-lg shadow-indigo-200"
                                >
                                    <BarChart3 className="w-5 h-5" />
                                    {loading ? 'Analizando...' : 'Generar Reporte'}
                                </button>
                                {reporteData && (
                                    <button
                                        onClick={handleExport}
                                        className="btn btn-secondary h-12 px-6"
                                    >
                                        <Download className="w-4 h-4" />
                                        Exportar CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results Dashboard */}
                        {reporteData && (
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                {/* Metrics Cards */}
                                <div className="xl:col-span-1 space-y-4">
                                    {activeTab === 'GENERAL' && (
                                        <>
                                            <CardReport
                                                title="Ingresos Totales"
                                                value={`$${Number(reporteData.ingresos).toFixed(2)}`}
                                                subtitle="Suma de todos los viajes"
                                                icon={TrendingUp}
                                                color="emerald"
                                            />
                                            <CardReport
                                                title="Gastos & Pagos"
                                                value={`$${Number(reporteData.gastos?.total).toFixed(2)}`}
                                                subtitle={`Choferes: $${reporteData.gastos?.pagosChoferes} | Mant: $${reporteData.gastos?.mantenimientos} | Viáticos: $${reporteData.gastos?.viaticos}`}
                                                icon={TrendingDown}
                                                color="rose"
                                            />
                                            <CardReport
                                                title="Ganancia Neta Global"
                                                value={`$${Number(reporteData.gananciaNeta).toFixed(2)}`}
                                                subtitle="Ingresos - (Gastos + Pagos)"
                                                icon={DollarSign}
                                                color={Number(reporteData.gananciaNeta) >= 0 ? "indigo" : "rose"}
                                            />
                                        </>
                                    )}

                                    {activeTab === 'VEHICULOS' && (
                                        <>
                                            <CardReport
                                                title="Ingresos"
                                                value={`$${Number(reporteData.ingresosViajes).toFixed(2)}`}
                                                icon={TrendingUp}
                                                color="emerald"
                                            />
                                            <CardReport
                                                title="Gastos Totales"
                                                value={`$${Number(reporteData.gastosTotales).toFixed(2)}`}
                                                subtitle={`Choferes: $${Number(reporteData.pagosChoferes || 0).toFixed(0)} | Mant: $${Number(reporteData.gastosMantenimientos || 0).toFixed(0)} | Viáticos: $${Number(reporteData.gastosViaticos || 0).toFixed(0)}`}
                                                icon={TrendingDown}
                                                color="rose"
                                            />
                                            <CardReport
                                                title="Ganancia Neta"
                                                value={`$${(Number(reporteData.ingresosViajes || 0) - Number(reporteData.gastosTotales || 0)).toFixed(2)}`}
                                                icon={DollarSign}
                                                color={(Number(reporteData.ingresosViajes || 0) - Number(reporteData.gastosTotales || 0)) >= 0 ? "indigo" : "rose"}
                                            />
                                        </>
                                    )}
                                    {activeTab === 'CHOFERES' && (
                                        <>
                                            <CardReport title="Viajes" value={reporteData.viajesRealizados || 0} icon={Truck} color="blue" />
                                            <CardReport title="Generado" value={`$${Number(reporteData.ingresosGenerados).toFixed(2)}`} icon={DollarSign} color="emerald" />
                                            <CardReport title="Pendiente" value={`$${Number(reporteData.saldoPendiente).toFixed(2)}`} icon={Banknote} color="amber" />
                                        </>
                                    )}
                                    {activeTab === 'CLIENTES' && (
                                        <>
                                            <CardReport title="Solicitudes" value={reporteData.viajesRealizados || 0} icon={Truck} color="blue" />
                                            <CardReport title="Facturación" value={`$${Number(reporteData.ingresosTotales).toFixed(2)}`} icon={DollarSign} color="emerald" />
                                            <CardReport title="Material" value={reporteData.materialMasFrecuente || 'N/A'} icon={Briefcase} color="purple" />
                                        </>
                                    )}
                                </div>

                                {/* Chart Area */}
                                <div className="xl:col-span-2 bg-white p-6 rounded-3xl shadow-card border border-slate-100 flex flex-col">
                                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                                        Análisis Gráfico
                                    </h3>
                                    <div className="flex-1" style={{ minHeight: '300px', height: '300px' }}>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(value) => `$${value}`} />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend />
                                                <Bar dataKey="valor" name="Monto (USD)" radius={[8, 8, 0, 0]} animationDuration={1500}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Internal Helper - Memoized component
const CardReport = React.memo(({ title, value, subtitle, icon: Icon, color }: CardReportProps) => {
    const colors: Record<CardColor, string> = {
        emerald: 'bg-emerald-50 text-emerald-600',
        rose: 'bg-rose-50 text-rose-600',
        indigo: 'bg-indigo-50 text-indigo-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600'
    };

    const colorClass = colors[color] || colors.indigo;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h4>
                    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-3 rounded-xl ${colorClass} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </motion.div>
    );
});

export default Reportes;
