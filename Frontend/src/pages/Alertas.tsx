// Página de Alertas - Dashboard de alertas del sistema
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertasService } from '../services/api';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ApiError, getErrorMessage } from '../types/error.types';
import {
    AlertTriangle,
    FileWarning,
    Wrench,
    Users,
    Calendar,
    ChevronRight,
    RefreshCw,
    Shield,
    DollarSign,
    IdCard,
    Truck,
    Clock
} from 'lucide-react';

interface AlertaDocumento {
    vehiculoId: number;
    placa: string;
    tipoDocumento: 'SOAT' | 'SEGURO' | 'MATRICULA';
    fechaVencimiento: string;
    diasRestantes: number;
}

interface AlertaMantenimiento {
    vehiculoId: number;
    placa: string;
    motivo: string;
    proximoMantenimientoFecha: string | null;
    diasRestantes: number | null;
}

interface AlertaChofer {
    choferId: number;
    nombre: string;
    totalGenerado: number;
    totalPagado: number;
    saldoPendiente: number;
}

interface AlertaFactura {
    viajeId: number;
    cliente: string;
    ruta: string;
    tarifa: number;
    montoPagado: number;
    saldoPendiente: number;
    fechaLimitePago: string;
    diasVencido: number;
}

// NUEVO: Alertas de pagos mensuales de choferes
interface AlertaPagoChofer {
    pagoId: number;
    choferId: number;
    nombreChofer: string;
    monto: number;
    fechaPago: string;
    descripcion: string;
    diasParaPago: number;
}

// Alertas de licencias de choferes
interface AlertaLicencia {
    choferId: number;
    nombre: string;
    fechaVencimiento: string;
    diasRestantes: number;
}

// Alertas de viajes próximos
interface AlertaViajeProximo {
    viajeId: number;
    placa: string;
    chofer: string;
    cliente: string;
    origen: string;
    destino: string;
    fechaSalida: string;
    horasRestantes: number;
}

// Alertas de pagos de viajes pendientes
interface AlertaPagoViaje {
    pagoId: number;
    viajeId: number;
    chofer: string;
    ruta: string;
    monto: number;
    fechaViaje: string;
    diasPendiente: number;
}

interface AlertasData {
    vehiculosDocumentosPorVencer: AlertaDocumento[];
    vehiculosMantenimientoPendiente: AlertaMantenimiento[];
    choferesConSaldoAlto: AlertaChofer[];
    facturasVencidas: AlertaFactura[];
    pagosMensualesPendientes?: AlertaPagoChofer[];
    licenciasChoferPorVencer?: AlertaLicencia[];
    viajesProximos?: AlertaViajeProximo[];
    pagosViajesPendientes?: AlertaPagoViaje[];
    resumen: {
        documentos: number;
        mantenimiento: number;
        choferesSaldo: number;
        facturas: number;
        pagosChoferes?: number;
        licencias?: number;
        viajesProximos?: number;
        pagosViajes?: number;
        total: number;
    };
}

const Alertas = () => {
    const navigate = useNavigate();
    const [alertas, setAlertas] = useState<AlertasData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<string>('todos');
    const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas');

    useEffect(() => {
        fetchAlertas();
    }, []);

    const fetchAlertas = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await alertasService.obtener();
            if (response.datos) {
                setAlertas(response.datos as unknown as AlertasData);
            }
        } catch (error) {
            const err = error as ApiError;
            setError(getErrorMessage(err, 'Error al cargar las alertas'));
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-EC', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(value);
    };

    const getDiasClass = (dias: number) => {
        if (dias < 0) return 'bg-rose-100 text-rose-700';
        if (dias <= 7) return 'bg-amber-100 text-amber-700';
        return 'bg-emerald-100 text-emerald-700';
    };

    const getDiasText = (dias: number) => {
        if (dias < 0) return `Vencido hace ${Math.abs(dias)} días`;
        if (dias === 0) return 'Vence hoy';
        return `${dias} días restantes`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="page-title">Centro de Alertas</h1>
                </div>
                <TableSkeleton rows={5} columns={4} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-state">
                <AlertTriangle className="empty-state-icon text-rose-400" />
                <h3 className="empty-state-title text-rose-800">Error</h3>
                <p className="empty-state-text text-rose-600">{error}</p>
                <button onClick={fetchAlertas} className="btn btn-secondary">
                    Intentar nuevamente
                </button>
            </div>
        );
    }

    const totalAlertas = alertas?.resumen.total || 0;

    // Calcular "salud" del sistema (0-100, donde 100 es perfecto sin alertas)
    const calcularSalud = () => {
        if (!alertas) return 100;
        const pesoAlertas = {
            documentos: 15,
            mantenimiento: 20,
            facturas: 10,
            licencias: 15,
            pagosChoferes: 5,
            pagosViajes: 10,
            viajesProximos: 5,
            choferesSaldo: 5
        };
        let penalizacion = 0;
        penalizacion += (alertas.resumen.documentos || 0) * pesoAlertas.documentos;
        penalizacion += (alertas.resumen.mantenimiento || 0) * pesoAlertas.mantenimiento;
        penalizacion += (alertas.resumen.facturas || 0) * pesoAlertas.facturas;
        penalizacion += (alertas.resumen.licencias || 0) * pesoAlertas.licencias;
        penalizacion += (alertas.resumen.pagosChoferes || 0) * pesoAlertas.pagosChoferes;
        penalizacion += (alertas.resumen.pagosViajes || 0) * pesoAlertas.pagosViajes;
        penalizacion += (alertas.resumen.viajesProximos || 0) * pesoAlertas.viajesProximos;
        penalizacion += (alertas.resumen.choferesSaldo || 0) * pesoAlertas.choferesSaldo;
        return Math.max(0, 100 - penalizacion);
    };

    const salud = calcularSalud();
    const getSaludColor = () => {
        if (salud >= 80) return 'from-emerald-500 to-teal-500';
        if (salud >= 50) return 'from-amber-500 to-orange-500';
        return 'from-rose-500 to-red-500';
    };
    const getSaludText = () => {
        if (salud >= 80) return 'Excelente';
        if (salud >= 50) return 'Atención requerida';
        return 'Crítico';
    };

    const shouldShow = (tipo: string) => filtroTipo === 'todos' || filtroTipo === tipo;

    return (
        <div className="space-y-6">
            {/* Header Hero con gradiente */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${totalAlertas === 0 ? 'from-emerald-50 to-teal-50 border-2 border-emerald-200' : 'from-indigo-50 via-violet-50 to-purple-50 border-2 border-indigo-200'} p-8 shadow-xl`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent"></div>

                <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl bg-gradient-to-br ${getSaludColor()} shadow-lg`}>
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className={`text-3xl font-black tracking-tight ${totalAlertas === 0 ? 'text-emerald-900' : 'text-indigo-900'}`}>Centro de Alertas</h1>
                            <p className={totalAlertas === 0 ? 'text-emerald-600 mt-1' : 'text-indigo-600 mt-1'}>
                                {totalAlertas > 0
                                    ? `${totalAlertas} alerta${totalAlertas !== 1 ? 's' : ''} requieren atención`
                                    : '¡Todo está bajo control!'
                                }
                            </p>
                        </div>
                    </div>

                    {/* Barra de Salud del Sistema */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                            <span className={totalAlertas === 0 ? 'text-sm text-emerald-600' : 'text-sm text-indigo-600'}>Salud del Sistema</span>
                            <span className={`text-2xl font-black bg-gradient-to-r ${getSaludColor()} bg-clip-text text-transparent`}>
                                {salud}%
                            </span>
                        </div>
                        <div className={`w-48 h-2 rounded-full overflow-hidden ${totalAlertas === 0 ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                            <div
                                className={`h-full bg-gradient-to-r ${getSaludColor()} transition-all duration-500`}
                                style={{ width: `${salud}%` }}
                            />
                        </div>
                        <span className={totalAlertas === 0 ? 'text-xs text-emerald-500' : 'text-xs text-indigo-500'}>{getSaludText()}</span>
                    </div>
                </div>

                {/* Botón Actualizar */}
                {/* Botón Actualizar */}
                <button
                    onClick={fetchAlertas}
                    className={`absolute top-4 right-4 p-2 rounded-xl transition-colors ${totalAlertas === 0 ? 'bg-emerald-100/50 hover:bg-emerald-100 text-emerald-600' : 'bg-indigo-100/50 hover:bg-indigo-100 text-indigo-600'}`}
                    title="Actualizar alertas"
                >
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
                    <span className="text-sm text-slate-500">Tipo:</span>
                    <select
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                        <option value="todos">Todos</option>
                        <option value="documentos">Documentos</option>
                        <option value="mantenimiento">Mantenimiento</option>
                        <option value="licencias">Licencias</option>
                        <option value="facturas">Facturas</option>
                        <option value="pagos">Pagos</option>
                        <option value="viajes">Viajes</option>
                    </select>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 shadow-sm border border-slate-100">
                    <span className="text-sm text-slate-500">Prioridad:</span>
                    <select
                        value={filtroPrioridad}
                        onChange={(e) => setFiltroPrioridad(e.target.value)}
                        className="text-sm font-medium text-slate-700 bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                        <option value="todas">Todas</option>
                        <option value="critica">Crítica</option>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                    </select>
                </div>
            </div>

            {/* Stats Cards con gradientes */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.documentos ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <FileWarning className={`h-5 w-5 ${alertas?.resumen.documentos ? 'text-amber-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.documentos || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Documentos</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.mantenimiento ? 'bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <Wrench className={`h-5 w-5 ${alertas?.resumen.mantenimiento ? 'text-rose-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.mantenimiento || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Mantenimiento</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.licencias ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-2 border-pink-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <IdCard className={`h-5 w-5 ${alertas?.resumen.licencias ? 'text-pink-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.licencias || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Licencias</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.facturas ? 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <DollarSign className={`h-5 w-5 ${alertas?.resumen.facturas ? 'text-red-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.facturas || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Facturas</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.pagosChoferes ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <DollarSign className={`h-5 w-5 ${alertas?.resumen.pagosChoferes ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.pagosChoferes || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Pagos Mens.</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.pagosViajes ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <Clock className={`h-5 w-5 ${alertas?.resumen.pagosViajes ? 'text-orange-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.pagosViajes || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Pagos Viajes</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.viajesProximos ? 'bg-gradient-to-br from-cyan-50 to-sky-50 border-2 border-cyan-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <Truck className={`h-5 w-5 ${alertas?.resumen.viajesProximos ? 'text-cyan-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.viajesProximos || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Viajes Próx.</p>
                </div>
                <div className={`relative overflow-hidden rounded-2xl p-4 ${alertas?.resumen.choferesSaldo ? 'bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-200' : 'bg-white border border-slate-100'} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5`}>
                    <Users className={`h-5 w-5 ${alertas?.resumen.choferesSaldo ? 'text-indigo-500' : 'text-slate-300'}`} />
                    <p className="text-2xl font-black text-slate-800 mt-2">{alertas?.resumen.choferesSaldo || 0}</p>
                    <p className="text-xs text-slate-500 truncate">Saldos</p>
                </div>
            </div>

            {/* No hay alertas */}
            {
                totalAlertas === 0 && (
                    <div className="empty-state bg-emerald-50 border border-emerald-200">
                        <div className="text-emerald-500 mb-4">
                            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="empty-state-title text-emerald-800">¡Todo en orden!</h3>
                        <p className="empty-state-text text-emerald-600">
                            No hay alertas pendientes en el sistema. Todos los documentos, mantenimientos y pagos están al día.
                        </p>
                    </div>
                )
            }

            {/* Sección: Documentos por Vencer */}
            {
                alertas && shouldShow('documentos') && alertas.vehiculosDocumentosPorVencer.length > 0 && (
                    <div className="card animate-fadeInUp">
                        <div className="flex items-center gap-3 mb-4">
                            <FileWarning className="h-6 w-6 text-amber-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Documentos por Vencer
                            </h2>
                            <span className="badge bg-amber-100 text-amber-700">
                                {alertas.vehiculosDocumentosPorVencer.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Placa</th>
                                        <th>Documento</th>
                                        <th>Fecha Vencimiento</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.vehiculosDocumentosPorVencer.map((alerta, idx) => (
                                        <tr key={`doc-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-mono font-semibold text-slate-800">
                                                    {alerta.placa}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-slate-100 text-slate-700">
                                                    {alerta.tipoDocumento}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    {formatDate(alerta.fechaVencimiento)}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getDiasClass(alerta.diasRestantes)}`}>
                                                    {getDiasText(alerta.diasRestantes)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/vehiculos?id=${alerta.vehiculoId}`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Ver <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Mantenimiento Pendiente */}
            {
                alertas && shouldShow('mantenimiento') && alertas.vehiculosMantenimientoPendiente.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <Wrench className="h-6 w-6 text-rose-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Mantenimiento Pendiente
                            </h2>
                            <span className="badge bg-rose-100 text-rose-700">
                                {alertas.vehiculosMantenimientoPendiente.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Placa</th>
                                        <th>Motivo</th>
                                        <th>Fecha Programada</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.vehiculosMantenimientoPendiente.map((alerta, idx) => (
                                        <tr key={`mant-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-mono font-semibold text-slate-800">
                                                    {alerta.placa}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-slate-100 text-slate-700">
                                                    {alerta.motivo}
                                                </span>
                                            </td>
                                            <td>
                                                {alerta.proximoMantenimientoFecha ? (
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4 text-slate-400" />
                                                        {formatDate(alerta.proximoMantenimientoFecha)}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td>
                                                {alerta.diasRestantes !== null && (
                                                    <span className={`badge ${getDiasClass(alerta.diasRestantes)}`}>
                                                        {getDiasText(alerta.diasRestantes)}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/vehiculos?id=${alerta.vehiculoId}`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Ver <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Choferes con Saldo Alto */}
            {
                alertas && shouldShow('pagos') && alertas.choferesConSaldoAlto.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <Users className="h-6 w-6 text-indigo-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Choferes con Saldo Pendiente Alto
                            </h2>
                            <span className="badge bg-indigo-100 text-indigo-700">
                                {alertas.choferesConSaldoAlto.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Chofer</th>
                                        <th className="text-right">Total Generado</th>
                                        <th className="text-right">Total Pagado</th>
                                        <th className="text-right">Saldo Pendiente</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.choferesConSaldoAlto.map((alerta, idx) => (
                                        <tr key={`chofer-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.nombre}
                                                </span>
                                            </td>
                                            <td className="text-right text-slate-600">
                                                {formatCurrency(alerta.totalGenerado)}
                                            </td>
                                            <td className="text-right text-emerald-600">
                                                {formatCurrency(alerta.totalPagado)}
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-rose-600">
                                                    {formatCurrency(alerta.saldoPendiente)}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/pagos-choferes?choferId=${alerta.choferId}`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Ver <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Pagos Mensuales Pendientes */}
            {
                alertas && shouldShow('pagos') && alertas.pagosMensualesPendientes && alertas.pagosMensualesPendientes.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="h-6 w-6 text-emerald-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Pagos Mensuales Pendientes
                            </h2>
                            <span className="badge bg-emerald-100 text-emerald-700">
                                {alertas.pagosMensualesPendientes.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Chofer</th>
                                        <th>Descripción</th>
                                        <th>Fecha Pago</th>
                                        <th className="text-right">Monto</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.pagosMensualesPendientes.map((alerta, idx) => (
                                        <tr key={`pago-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.nombreChofer}
                                                </span>
                                            </td>
                                            <td className="text-slate-600 text-sm">
                                                {alerta.descripcion}
                                            </td>
                                            <td className="text-slate-600">
                                                {formatDate(alerta.fechaPago)}
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-emerald-600">
                                                    {formatCurrency(alerta.monto)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${alerta.diasParaPago <= 0 ? 'bg-rose-100 text-rose-700' : alerta.diasParaPago <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {alerta.diasParaPago <= 0 ? 'HOY' : `${alerta.diasParaPago} días`}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/pagos-choferes`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Pagar <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Facturas Vencidas */}
            {
                alertas && shouldShow('facturas') && alertas.facturasVencidas && alertas.facturasVencidas.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <DollarSign className="h-6 w-6 text-red-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Facturas Vencidas
                            </h2>
                            <span className="badge bg-red-100 text-red-700">
                                {alertas.facturasVencidas.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Ruta</th>
                                        <th className="text-right">Tarifa</th>
                                        <th className="text-right">Pendiente</th>
                                        <th>Vencido</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.facturasVencidas.map((alerta, idx) => (
                                        <tr key={`factura-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.cliente}
                                                </span>
                                            </td>
                                            <td className="text-slate-600 text-sm">
                                                {alerta.ruta}
                                            </td>
                                            <td className="text-right text-slate-700">
                                                {formatCurrency(alerta.tarifa)}
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-rose-600">
                                                    {formatCurrency(alerta.saldoPendiente)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge bg-rose-100 text-rose-700">
                                                    {alerta.diasVencido} días
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/viajes?id=${alerta.viajeId}`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Cobrar <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Licencias por Vencer */}
            {
                alertas && shouldShow('licencias') && alertas.licenciasChoferPorVencer && alertas.licenciasChoferPorVencer.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.35s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <IdCard className="h-6 w-6 text-pink-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Licencias de Choferes por Vencer
                            </h2>
                            <span className="badge bg-pink-100 text-pink-700">
                                {alertas.licenciasChoferPorVencer.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Chofer</th>
                                        <th>Fecha Vencimiento</th>
                                        <th>Estado</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.licenciasChoferPorVencer.map((alerta, idx) => (
                                        <tr key={`licencia-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.nombre}
                                                </span>
                                            </td>
                                            <td className="text-slate-600">
                                                {formatDate(alerta.fechaVencimiento)}
                                            </td>
                                            <td>
                                                <span className={`badge ${alerta.diasRestantes <= 0 ? 'bg-rose-100 text-rose-700' : alerta.diasRestantes <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {alerta.diasRestantes <= 0 ? 'VENCIDA' : `${alerta.diasRestantes} días`}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/choferes`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Ver <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Viajes Próximos */}
            {
                alertas && shouldShow('viajes') && alertas.viajesProximos && alertas.viajesProximos.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <Truck className="h-6 w-6 text-cyan-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Viajes Próximos (48h)
                            </h2>
                            <span className="badge bg-cyan-100 text-cyan-700">
                                {alertas.viajesProximos.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Ruta</th>
                                        <th>Vehículo</th>
                                        <th>Chofer</th>
                                        <th>Cliente</th>
                                        <th>Sale en</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.viajesProximos.map((alerta, idx) => (
                                        <tr key={`viaje-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.origen} → {alerta.destino}
                                                </span>
                                            </td>
                                            <td className="text-slate-600">
                                                {alerta.placa}
                                            </td>
                                            <td className="text-slate-600">
                                                {alerta.chofer}
                                            </td>
                                            <td className="text-slate-600 text-sm">
                                                {alerta.cliente}
                                            </td>
                                            <td>
                                                <span className={`badge ${alerta.horasRestantes <= 6 ? 'bg-rose-100 text-rose-700' : alerta.horasRestantes <= 24 ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                    {alerta.horasRestantes}h
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/viajes`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Ver <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Sección: Pagos de Viajes Pendientes */}
            {
                alertas && shouldShow('pagos') && alertas.pagosViajesPendientes && alertas.pagosViajesPendientes.length > 0 && (
                    <div className="card animate-fadeInUp" style={{ animationDelay: '0.45s' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <Clock className="h-6 w-6 text-orange-500" />
                            <h2 className="text-lg font-bold text-slate-800">
                                Pagos de Viajes Pendientes
                            </h2>
                            <span className="badge bg-orange-100 text-orange-700">
                                {alertas.pagosViajesPendientes.length}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Chofer</th>
                                        <th>Ruta</th>
                                        <th className="text-right">Monto</th>
                                        <th>Días Pendiente</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alertas.pagosViajesPendientes.map((alerta, idx) => (
                                        <tr key={`pago-viaje-${idx}`} className="hover:bg-slate-50">
                                            <td>
                                                <span className="font-semibold text-slate-800">
                                                    {alerta.chofer}
                                                </span>
                                            </td>
                                            <td className="text-slate-600 text-sm">
                                                {alerta.ruta}
                                            </td>
                                            <td className="text-right">
                                                <span className="font-bold text-orange-600">
                                                    {formatCurrency(alerta.monto)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${alerta.diasPendiente >= 7 ? 'bg-rose-100 text-rose-700' : alerta.diasPendiente >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {alerta.diasPendiente} días
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    onClick={() => navigate(`/pagos-choferes`)}
                                                    className="btn btn-sm btn-ghost"
                                                >
                                                    Pagar <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Alertas;
