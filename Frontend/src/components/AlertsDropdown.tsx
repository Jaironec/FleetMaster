import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { alertasService } from '../services/api';
import {
    Bell,
    FileWarning,
    Wrench,
    Users,
    FileText,
    X,
    ChevronRight,
    AlertTriangle,
    DollarSign,
    IdCard,
    Truck,
    Clock
} from 'lucide-react';
import { ApiError } from '../types/error.types';

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
    motivo: string; // 'FECHA' | 'KILOMETRAJE' | 'PENDIENTE'
    proximoMantenimientoFecha: string | null;
    diasRestantes: number | null;
    kmRestantes?: number;
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

export default function AlertsDropdown() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [alertas, setAlertas] = useState<AlertasData | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cargar alertas al montar el componente (para mostrar el contador)
    useEffect(() => {
        cargarAlertas();
        // Actualizar cada 5 minutos
        const interval = setInterval(cargarAlertas, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const cargarAlertas = async () => {
        try {
            setLoading(true);
            const response = await alertasService.obtener();
            if (response.datos) {
                setAlertas(response.datos as unknown as AlertasData);
            }
        } catch (error) {
            const err = error as ApiError;
            console.error('Error cargando alertas:', err);
        } finally {
            setLoading(false);
        }
    };

    const totalAlertas = alertas?.resumen?.total || 0;

    const handleNavigate = (path: string) => {
        setIsOpen(false);
        navigate(path);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all relative"
            >
                <Bell className="h-5 w-5" />
                {totalAlertas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-rose-500 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white">
                        {totalAlertas > 9 ? '9+' : totalAlertas}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 flex items-center justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2">
                            <Bell size={16} />
                            Alertas del Sistema
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-96 overflow-y-auto">
                        {loading ? (
                            <div className="p-8 flex items-center justify-center">
                                <div className="spinner"></div>
                            </div>
                        ) : !alertas || totalAlertas === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="text-slate-600 font-medium">Todo en orden</p>
                                <p className="text-slate-400 text-sm">No hay alertas pendientes</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {/* Documentos Vencidos */}
                                {alertas.vehiculosDocumentosPorVencer.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 uppercase mb-2">
                                            <FileWarning size={14} />
                                            Documentos por vencer ({alertas.vehiculosDocumentosPorVencer.length})
                                        </div>
                                        {alertas.vehiculosDocumentosPorVencer.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/vehiculos`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div>
                                                    <span className="font-semibold text-slate-800">{a.placa}</span>
                                                    <span className="text-slate-500 mx-2">•</span>
                                                    <span className="text-rose-600 font-medium">{a.tipoDocumento}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.diasRestantes <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {a.diasRestantes <= 0 ? 'VENCIDO' : `${a.diasRestantes} días`}
                                                </span>
                                            </button>
                                        ))}
                                        {alertas.vehiculosDocumentosPorVencer.length > 3 && (
                                            <button
                                                onClick={() => handleNavigate('/vehiculos')}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-1 px-3"
                                            >
                                                Ver todos <ChevronRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Mantenimiento */}
                                {alertas.vehiculosMantenimientoPendiente.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase mb-2">
                                            <Wrench size={14} />
                                            Mantenimiento pendiente ({alertas.vehiculosMantenimientoPendiente.length})
                                        </div>
                                        {alertas.vehiculosMantenimientoPendiente.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/mantenimientos`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div>
                                                    <span className="font-semibold text-slate-800">{a.placa}</span>
                                                </div>
                                                <span className="text-xs font-medium text-amber-700">
                                                    {a.motivo === 'PENDIENTE'
                                                        ? '⚠️ Programado'
                                                        : a.motivo === 'KILOMETRAJE'
                                                            ? `${(a.kmRestantes ?? 0) <= 0 ? 'Pasó' : 'Faltan'} ${Math.abs(a.kmRestantes ?? 0)} km`
                                                            : `${(a.diasRestantes ?? 0) <= 0 ? 'Vencido' : `${a.diasRestantes} días`}`
                                                    }
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Choferes con saldo */}
                                {alertas.choferesConSaldoAlto.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase mb-2">
                                            <Users size={14} />
                                            Saldo pendiente choferes ({alertas.choferesConSaldoAlto.length})
                                        </div>
                                        {alertas.choferesConSaldoAlto.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/pagos-choferes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 flex items-center justify-between group transition-colors"
                                            >
                                                <span className="font-medium text-slate-800">{a.nombre}</span>
                                                <span className="text-sm font-bold text-blue-600">${a.saldoPendiente.toFixed(0)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Pagos Mensuales Pendientes */}
                                {alertas.pagosMensualesPendientes && alertas.pagosMensualesPendientes.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 uppercase mb-2">
                                            <DollarSign size={14} />
                                            Pagos mensuales pendientes ({alertas.pagosMensualesPendientes.length})
                                        </div>
                                        {alertas.pagosMensualesPendientes.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/pagos-choferes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="truncate flex-1">
                                                    <span className="font-medium text-slate-800">{a.nombreChofer}</span>
                                                    <span className="text-slate-400 text-xs ml-2">{a.descripcion}</span>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-sm font-bold text-emerald-600">${a.monto.toFixed(0)}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.diasParaPago <= 0 ? 'bg-rose-100 text-rose-700' : a.diasParaPago <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {a.diasParaPago <= 0 ? 'HOY' : `${a.diasParaPago}d`}
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Facturas vencidas */}
                                {alertas.facturasVencidas.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-purple-600 uppercase mb-2">
                                            <FileText size={14} />
                                            Cobros pendientes ({alertas.facturasVencidas.length})
                                        </div>
                                        {alertas.facturasVencidas.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/viajes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="truncate flex-1">
                                                    <span className="font-medium text-slate-800">{a.cliente}</span>
                                                    <span className="text-slate-400 text-xs ml-2">{a.ruta}</span>
                                                </div>
                                                <span className="text-xs font-bold text-purple-600 ml-2">
                                                    ${a.saldoPendiente.toFixed(0)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Licencias por vencer */}
                                {alertas.licenciasChoferPorVencer && alertas.licenciasChoferPorVencer.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-pink-600 uppercase mb-2">
                                            <IdCard size={14} />
                                            Licencias por vencer ({alertas.licenciasChoferPorVencer.length})
                                        </div>
                                        {alertas.licenciasChoferPorVencer.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/choferes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-pink-50 flex items-center justify-between group transition-colors"
                                            >
                                                <span className="font-medium text-slate-800">{a.nombre}</span>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.diasRestantes <= 0 ? 'bg-rose-100 text-rose-700' : a.diasRestantes <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {a.diasRestantes <= 0 ? 'VENCIDA' : `${a.diasRestantes}d`}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Viajes próximos */}
                                {alertas.viajesProximos && alertas.viajesProximos.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 uppercase mb-2">
                                            <Truck size={14} />
                                            Viajes próximos ({alertas.viajesProximos.length})
                                        </div>
                                        {alertas.viajesProximos.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/viajes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-cyan-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="truncate flex-1">
                                                    <span className="font-medium text-slate-800">{a.origen} → {a.destino}</span>
                                                    <span className="text-slate-400 text-xs ml-2">{a.placa}</span>
                                                </div>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.horasRestantes <= 6 ? 'bg-rose-100 text-rose-700' : a.horasRestantes <= 24 ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'}`}>
                                                    {a.horasRestantes}h
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Pagos de viajes pendientes */}
                                {alertas.pagosViajesPendientes && alertas.pagosViajesPendientes.length > 0 && (
                                    <div className="p-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 uppercase mb-2">
                                            <Clock size={14} />
                                            Pagos viajes pendientes ({alertas.pagosViajesPendientes.length})
                                        </div>
                                        {alertas.pagosViajesPendientes.slice(0, 3).map((a, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleNavigate(`/pagos-choferes`)}
                                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-orange-50 flex items-center justify-between group transition-colors"
                                            >
                                                <div className="truncate flex-1">
                                                    <span className="font-medium text-slate-800">{a.chofer}</span>
                                                    <span className="text-slate-400 text-xs ml-2">{a.ruta}</span>
                                                </div>
                                                <div className="flex items-center gap-2 ml-2">
                                                    <span className="text-sm font-bold text-orange-600">${a.monto.toFixed(0)}</span>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.diasPendiente >= 7 ? 'bg-rose-100 text-rose-700' : a.diasPendiente >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {a.diasPendiente}d
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {totalAlertas > 0 && (
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => { cargarAlertas(); }}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                Actualizar alertas
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
