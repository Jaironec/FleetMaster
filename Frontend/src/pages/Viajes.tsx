import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { viajeService, gastoService, vehiculoService, choferService, clienteService, materialService } from '../services/api';
import type {
    Viaje as ViajeBase,
    GastoViaje,
    PagoChofer,
    TipoGasto,
    MetodoPago,
    Vehiculo,
    Chofer,
    Cliente,
    Material,
    EstadoViaje,
    EstadoConfig
} from '../types/api.types';
import type { FiltrosViaje } from '../types/filter.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import { useFormatters } from '../hooks/useFormatters';
import { ESTADOS_VIAJE } from '../types/api.types';
import toast from 'react-hot-toast';
import TableSkeleton from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import LocationInput, { calculateRoute } from '../components/LocationInput';
import FileUpload from '../components/FileUpload';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    MapPin,
    User,
    Briefcase,
    Package,
    DollarSign,
    Clock,
    ArrowRight,
    ArrowUpDown,
    FileText,
    Upload,
    X,
    Check,
    CheckCircle,
    Ban,
    Play,
    Truck,
    Eye,
    ChevronLeft,
    ChevronRight,
    Route,
    Zap
} from 'lucide-react';

// Tipos de gasto y métodos de pago tipados
const TIPOS_GASTO_OPTIONS: TipoGasto[] = ['COMBUSTIBLE', 'PEAJE', 'ALIMENTACION', 'HOSPEDAJE', 'MULTA', 'OTRO'];
const METODOS_PAGO_OPTIONS: MetodoPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

const TARIFA_POR_KM = 0.35; // Tarifa sugerida por kilómetro

// Interfaz extendida de Viaje con relaciones para la vista (sobrescribe relaciones opcionales del backend)
interface ViajeConRelaciones extends Omit<ViajeBase, 'vehiculo' | 'chofer' | 'cliente' | 'material'> {
    vehiculo?: { id: number; placa: string; marca: string; modelo: string };
    chofer?: { id: number; nombres: string; apellidos: string; telefono?: string };
    cliente?: { id: number; nombreRazonSocial: string };
    material?: { id: number; nombre: string };
    gastos?: GastoViaje[];
    pagos?: PagoChofer[];
    pagadoChofer?: number;
}

// Alias para uso en el componente
type Viaje = ViajeConRelaciones;

interface FormViaje {
    vehiculoId: string;
    choferId: string;
    clienteId: string;
    materialId: string;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaEstimada: string;
    kilometrosEstimados: string;
    tarifa: string;
    montoPagoChofer: string;
    diasCredito: string; // 0, 15, 30, 60 días de crédito
    observaciones: string;
}

interface FormGasto {
    tipoGasto: string;
    monto: string;
    fecha: string;
    metodoPago: string;
    descripcion: string;
}

export default function Viajes() {
    const { canWrite } = useAuth();
    const [searchParams] = useSearchParams();

    // Estados del componente
    const [viajes, setViajes] = useState<Viaje[]>([]);
    const [loading, setLoading] = useState(true);
    const [vista, setVista] = useState<'lista' | 'formulario' | 'detalle'>('lista');
    const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(null);
    const [editando, setEditando] = useState(false);
    const [resumenEconomico, setResumenEconomico] = useState<{ ingreso: number; gastos: number; ganancia: number } | null>(null);
    const [balanceChofer, setBalanceChofer] = useState<{ pactado: number; pagado: number; pendiente: number } | null>(null);

    // Datos para selects
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [choferes, setChoferes] = useState<Chofer[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [materiales, setMateriales] = useState<Material[]>([]);

    // Filtros
    const [filtros, setFiltros] = useState({
        estado: searchParams.get('estado') || '',
        vehiculoId: searchParams.get('vehiculoId') || '',
        choferId: searchParams.get('choferId') || '',
        clienteId: searchParams.get('clienteId') || '',
        estadoPagoCliente: '', // NUEVO: Filtro por estado de pago
        fechaDesde: '',
        fechaHasta: '',
    });

    // Búsqueda automática cuando cambian los filtros
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (vista === 'lista') cargarViajes();
        }, 300); // Debounce de 300ms
        return () => clearTimeout(timeout);
    }, [filtros]);

    // Formulario de viaje
    const [formViaje, setFormViaje] = useState<FormViaje>({
        vehiculoId: '',
        choferId: '',
        clienteId: '',
        materialId: '',
        origen: '',
        destino: '',
        fechaSalida: '',
        fechaLlegadaEstimada: '',
        kilometrosEstimados: '',
        tarifa: '',
        montoPagoChofer: '',
        diasCredito: '0',
        observaciones: '',
    });

    // Obtener chofer seleccionado para verificar modalidad de pago
    const choferSeleccionado = choferes.find(c => c.id === Number(formViaje.choferId));
    const mostrarMontoPagoChofer = choferSeleccionado?.modalidadPago === 'POR_VIAJE';

    // Coordenadas para cálculo de ruta
    const [origenCoords, setOrigenCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [destinoCoords, setDestinoCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [rutaCalculada, setRutaCalculada] = useState<{ distance: number; duration: number } | null>(null);
    const [calculandoRuta, setCalculandoRuta] = useState(false);

    // Helper: Calcular fecha de llegada estimada basada en salida + duración
    const calcularLlegadaEstimada = (fechaSalida: string, duracionMinutos: number): string => {
        const salida = new Date(fechaSalida);
        salida.setMinutes(salida.getMinutes() + duracionMinutos);
        const fecha = salida.toISOString().split('T')[0];
        const hora = salida.toTimeString().slice(0, 5);
        return `${fecha}T${hora}`;
    };

    // Helper: Actualizar fecha de salida y auto-calcular llegada
    const actualizarFechaSalida = (nuevaFechaSalida: string) => {
        const updates: Partial<FormViaje> = { fechaSalida: nuevaFechaSalida };

        // Si hay ruta calculada, auto-calcular llegada
        if (rutaCalculada && nuevaFechaSalida) {
            updates.fechaLlegadaEstimada = calcularLlegadaEstimada(nuevaFechaSalida, rutaCalculada.duration);
            updates.kilometrosEstimados = rutaCalculada.distance.toString();
        }

        setFormViaje(prev => ({ ...prev, ...updates }));
    };

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const nextStep = () => {
        // Validaciones por paso
        if (currentStep === 1) {
            if (!formViaje.clienteId || !formViaje.materialId || !formViaje.origen || !formViaje.destino || !formViaje.fechaSalida) {
                toast.error('Por favor complete todos los campos obligatorios de la ruta.');
                return;
            }
        } else if (currentStep === 2) {
            if (!formViaje.vehiculoId || !formViaje.choferId) {
                toast.error('Debe asignar un vehículo y un chofer.');
                return;
            }
        }
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Reset step on modal close or open
    useEffect(() => {
        if (vista === 'formulario') setCurrentStep(1);
    }, [vista]);

    // Calcular ruta cuando ambas coordenadas están disponibles
    useEffect(() => {
        if (origenCoords && destinoCoords) {
            setCalculandoRuta(true);
            calculateRoute(origenCoords, destinoCoords).then((result) => {
                setRutaCalculada(result);
                if (result) {
                    // Auto-llenar kilómetros estimados
                    setFormViaje(prev => {
                        const updates: Partial<FormViaje> = { kilometrosEstimados: result.distance.toString() };

                        // Si hay fecha de salida, calcular fecha de llegada automáticamente
                        if (prev.fechaSalida) {
                            updates.fechaLlegadaEstimada = calcularLlegadaEstimada(prev.fechaSalida, result.duration);
                        }

                        return { ...prev, ...updates };
                    });
                }
                setCalculandoRuta(false);
            });
        }
    }, [origenCoords, destinoCoords]);

    // Modal de gasto
    const [mostrarModalGasto, setMostrarModalGasto] = useState(false);
    const [formGasto, setFormGasto] = useState<FormGasto>({
        tipoGasto: 'COMBUSTIBLE',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'EFECTIVO',
        descripcion: '',
    });
    const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

    // Modal para completar viaje
    const [mostrarModalCompletar, setMostrarModalCompletar] = useState(false);
    const [datosComplecion, setDatosComplecion] = useState({
        kilometrosReales: '',
        fechaLlegadaReal: new Date().toISOString().slice(0, 16),
    });

    // Modal para ver imagen de comprobante
    const [imagenModalUrl, setImagenModalUrl] = useState<string | null>(null);

    // Cargar datos iniciales
    // Cargar datos iniciales
    useEffect(() => {
        cargarViajes();
        cargarDatosSelects();
    }, []);

    // Verificar si hay acción automática desde Dashboard
    useEffect(() => {
        if (searchParams.get('action') === 'new') {
            setVista('formulario');
        }
    }, [searchParams]);

    const cargarViajes = async () => {
        try {
            setLoading(true);
            const params: {
                estado?: string;
                vehiculoId?: number;
                choferId?: number;
                clienteId?: number;
                estadoPagoCliente?: string;
                fechaDesde?: string;
                fechaHasta?: string;
            } = {};
            if (filtros.estado) params.estado = filtros.estado;
            if (filtros.vehiculoId) params.vehiculoId = Number(filtros.vehiculoId);
            if (filtros.choferId) params.choferId = Number(filtros.choferId);
            if (filtros.clienteId) params.clienteId = Number(filtros.clienteId);
            if (filtros.estadoPagoCliente) params.estadoPagoCliente = filtros.estadoPagoCliente;
            if (filtros.fechaDesde) params.fechaDesde = filtros.fechaDesde;
            if (filtros.fechaHasta) params.fechaHasta = filtros.fechaHasta;

            const response = await viajeService.listar(params);
            setViajes(response.datos || []);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar viajes'));
        } finally {
            setLoading(false);
        }
    };

    const cargarDatosSelects = async () => {
        try {
            const [vRes, cRes, clRes, mRes] = await Promise.all([
                vehiculoService.listar({ estado: 'ACTIVO' }),
                choferService.listar({ estado: 'ACTIVO' }),
                clienteService.listar({ estado: 'ACTIVO' }),
                materialService.listar(),
            ]);
            setVehiculos(vRes.datos || []);
            setChoferes(cRes.datos || []);
            setClientes(clRes.datos || []);
            setMateriales(mRes.materiales || mRes.datos || []);
        } catch (error) {
            const err = error as ApiError;
            console.error('Error al cargar datos para selects:', err);
            if (!wasToastShown(err)) toast.error('Error al cargar datos para el formulario');
        }
    };

    const cargarDetalleViaje = async (id: number) => {
        try {
            setLoading(true);
            const response = await viajeService.obtener(id);
            if (response.datos) {
                setViajeSeleccionado(response.datos.viaje as Viaje);
                setResumenEconomico(response.datos.resumenEconomico as { ingreso: number; gastos: number; ganancia: number });
                setBalanceChofer(response.datos.balanceChofer as { pactado: number; pagado: number; pendiente: number });
            }
            setVista('detalle');
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar detalle del viaje'));
        } finally {
            setLoading(false);
        }
    };

    // Modal de creación/edición
    const [modalFormOpen, setModalFormOpen] = useState(false);

    // ... (keep existing state)

    const handleNuevoViaje = () => {
        setEditando(false);
        setFormViaje({
            vehiculoId: '',
            choferId: '',
            clienteId: '',
            materialId: '',
            origen: '',
            destino: '',
            fechaSalida: '',
            fechaLlegadaEstimada: '',
            kilometrosEstimados: '',
            tarifa: '',
            montoPagoChofer: '',
            diasCredito: '0',
            observaciones: '',
        });
        setModalFormOpen(true);
    };

    const handleGuardarViaje = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const datos: Partial<ViajeBase> & { montoPagoChofer?: number } = {
                vehiculoId: parseInt(formViaje.vehiculoId),
                choferId: parseInt(formViaje.choferId),
                clienteId: parseInt(formViaje.clienteId),
                materialId: parseInt(formViaje.materialId),
                origen: formViaje.origen,
                destino: formViaje.destino,
                fechaSalida: formViaje.fechaSalida,
                fechaLlegadaEstimada: formViaje.fechaLlegadaEstimada || undefined,
                kilometrosEstimados: formViaje.kilometrosEstimados ? parseInt(formViaje.kilometrosEstimados) : undefined,
                tarifa: parseFloat(formViaje.tarifa),
                observaciones: formViaje.observaciones || undefined,
            };

            // Solo incluir montoPagoChofer si tiene valor
            if (formViaje.montoPagoChofer) {
                datos.montoPagoChofer = parseFloat(formViaje.montoPagoChofer);
            }

            if (editando && viajeSeleccionado) {
                await viajeService.actualizar(viajeSeleccionado.id, datos);
                toast.success('Viaje actualizado exitosamente');
            } else {
                await viajeService.crear(datos);
                toast.success('Viaje creado exitosamente');
            }

            setModalFormOpen(false);
            cargarViajes();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al guardar viaje'));
        }
    };

    // ... (keep existing handlers)

    const handleCambiarEstado = async (nuevoEstado: string) => {
        if (!viajeSeleccionado) return;

        if (nuevoEstado === 'COMPLETADO') {
            setDatosComplecion({
                fechaLlegadaReal: new Date().toISOString().slice(0, 16),
                kilometrosReales: viajeSeleccionado.kilometrosEstimados ? String(viajeSeleccionado.kilometrosEstimados) : ''
            });
            setMostrarModalCompletar(true);
            return;
        }

        try {
            await viajeService.cambiarEstado(viajeSeleccionado.id, nuevoEstado);
            toast.success(`Estado del viaje actualizado`);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cambiar estado'));
        }
    };

    const handleCompletarViaje = async () => {
        if (!viajeSeleccionado) return;

        try {
            await viajeService.cambiarEstado(viajeSeleccionado.id, 'COMPLETADO', {
                fechaLlegadaReal: datosComplecion.fechaLlegadaReal,
                kilometrosReales: datosComplecion.kilometrosReales ? parseInt(datosComplecion.kilometrosReales) : undefined,
            });
            toast.success('Viaje completado exitosamente');
            setMostrarModalCompletar(false);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al completar viaje'));
        }
    };

    // Modal de pago del cliente
    const [mostrarModalPago, setMostrarModalPago] = useState(false);
    const [montoPago, setMontoPago] = useState('');

    const handleRegistrarPago = async () => {
        if (!viajeSeleccionado || !montoPago) return;
        try {
            await viajeService.registrarPago(viajeSeleccionado.id, parseFloat(montoPago));
            toast.success(`Pago de $${montoPago} registrado exitosamente`);
            setMostrarModalPago(false);
            setMontoPago('');
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al registrar pago'));
        }
    };

    const handleAgregarGasto = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!viajeSeleccionado) return;

        try {
            const formData = new FormData();
            formData.append('tipoGasto', formGasto.tipoGasto);
            formData.append('monto', formGasto.monto);
            formData.append('fecha', formGasto.fecha);
            formData.append('metodoPago', formGasto.metodoPago);
            if (formGasto.descripcion) formData.append('descripcion', formGasto.descripcion);
            if (archivoComprobante) formData.append('comprobante', archivoComprobante);

            await gastoService.crear(viajeSeleccionado.id, formData);
            toast.success('Gasto registrado exitosamente');
            setMostrarModalGasto(false);
            setFormGasto({
                tipoGasto: 'COMBUSTIBLE',
                monto: '',
                fecha: new Date().toISOString().split('T')[0],
                metodoPago: 'EFECTIVO',
                descripcion: '',
            });
            setArchivoComprobante(null);
            cargarDetalleViaje(viajeSeleccionado.id);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al registrar gasto'));
        }
    };

    // Hook de formatters memoizado
    const { formatearFecha, formatearMoneda } = useFormatters();

    // =========== VISTA LISTA ===========
    if (vista === 'lista') {
        return (
            <div>
                <ReadOnlyBanner />

                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Viajes</h2>
                        <p className="text-slate-500 text-sm mt-1">Planificación, seguimiento y control de transporte.</p>
                    </div>
                    {canWrite && (
                        <button onClick={handleNuevoViaje} className="btn btn-primary whitespace-nowrap h-11 shadow-lg shadow-indigo-500/30">
                            <Plus size={18} className="mr-2" /> Nuevo Viaje
                        </button>
                    )}
                </div>

                {/* Filtros / Toolbar */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                        <div className="relative">
                            <select
                                value={filtros.estado}
                                onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Estado: Todos</option>
                                {Object.entries(ESTADOS_VIAJE).map(([key, val]: [string, EstadoConfig]) => (
                                    <option key={key} value={key}>{val.label}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filtros.estadoPagoCliente}
                                onChange={(e) => setFiltros({ ...filtros, estadoPagoCliente: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Pago: Todos</option>
                                <option value="PENDIENTE">Pendiente de Cobro</option>
                                <option value="PAGADO">Pagado</option>
                            </select>
                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filtros.vehiculoId}
                                onChange={(e) => setFiltros({ ...filtros, vehiculoId: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Vehículo: Todos</option>
                                {vehiculos.map((v) => (
                                    <option key={v.id} value={v.id}>{v.placa} - {v.marca}</option>
                                ))}
                            </select>
                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filtros.choferId}
                                onChange={(e) => setFiltros({ ...filtros, choferId: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Chofer: Todos</option>
                                {choferes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>
                                ))}
                            </select>
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={filtros.clienteId}
                                onChange={(e) => setFiltros({ ...filtros, clienteId: e.target.value })}
                                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none appearance-none cursor-pointer"
                            >
                                <option value="">Cliente: Todos</option>
                                {clientes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>
                                ))}
                            </select>
                            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Desde</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                    value={filtros.fechaDesde}
                                    onChange={(e) => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                                />
                                <Calendar
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                />
                            </div>
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hasta</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                    value={filtros.fechaHasta}
                                    onChange={(e) => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                                />
                                <Calendar
                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors"
                                    onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                />
                            </div>
                        </div>
                        <button
                            onClick={() => setFiltros({ estado: '', vehiculoId: '', choferId: '', clienteId: '', estadoPagoCliente: '', fechaDesde: '', fechaHasta: '' })}
                            className="btn btn-secondary w-full md:w-auto h-[38px]"
                        >
                            <X size={16} className="mr-2" /> Limpiar Filtros
                        </button>
                    </div>
                </div>

                {/* Tabla de viajes */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                    {loading ? (
                        <div className="p-6">
                            <TableSkeleton rows={8} columns={8} />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                        <th className="px-6 py-4 font-bold text-slate-700">Ruta / Cliente</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Vehículo / Chofer</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Fecha Salida</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Tarifa</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Pagos</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                        <th className="px-6 py-4 font-bold text-slate-700">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viajes.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-slate-500">
                                                No se encontraron viajes registrados.
                                            </td>
                                        </tr>
                                    ) : (
                                        viajes.map((viaje) => {
                                            // Calcular estado de pago del cliente
                                            const tarifaNum = Number(viaje.tarifa);
                                            const pagadoCliente = Number(viaje.montoPagadoCliente || 0);
                                            const pendienteCliente = tarifaNum - pagadoCliente;

                                            // Calcular estado de pago al chofer
                                            const montoPagoChofer = Number(viaje.montoPagoChofer || 0);
                                            const pagadoChofer = Number(viaje.pagadoChofer || 0);
                                            const pendienteChofer = montoPagoChofer - pagadoChofer;
                                            // Solo mostrar deuda si hay monto pendiente por pagar
                                            const debeAlChofer = pendienteChofer > 0;

                                            return (
                                                <tr key={viaje.id} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1 text-slate-800 font-bold text-sm">
                                                                <MapPin size={14} className="text-indigo-500" />
                                                                {viaje.origen} <ArrowRight size={12} className="text-slate-400" /> {viaje.destino}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                                <Briefcase size={12} /> {viaje.cliente?.nombreRazonSocial ?? 'N/A'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1 text-slate-800 text-sm font-medium">
                                                                <Truck size={14} className="text-slate-400" /> {viaje.vehiculo?.placa ?? 'N/A'}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                                <User size={12} /> {viaje.chofer?.nombres ?? ''} {viaje.chofer?.apellidos ?? ''}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="flex items-center gap-2 text-slate-600 text-sm bg-slate-100 px-2 py-1 rounded-lg w-fit">
                                                            <Calendar size={14} className="text-slate-400" />
                                                            {new Date(viaje.fechaSalida).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="font-bold text-slate-800 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                                                            {formatearMoneda(viaje.tarifa)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="flex flex-col gap-1.5">
                                                            {/* Estado de pago del cliente */}
                                                            <div className="flex items-center gap-1.5" title={`Cliente: ${viaje.estadoPagoCliente || 'PENDIENTE'}`}>
                                                                <Briefcase size={12} className={
                                                                    viaje.estadoPagoCliente === 'PAGADO' ? 'text-emerald-500' :
                                                                        viaje.estadoPagoCliente === 'PARCIAL' ? 'text-amber-500' : 'text-rose-500'
                                                                } />
                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${viaje.estadoPagoCliente === 'PAGADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                                    viaje.estadoPagoCliente === 'PARCIAL' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                                                                    }`}>
                                                                    {viaje.estadoPagoCliente === 'PAGADO' ? 'Cobrado' :
                                                                        viaje.estadoPagoCliente === 'PARCIAL' ? `Parcial (${formatearMoneda(pendienteCliente)})` :
                                                                            `Pendiente`}
                                                                </span>
                                                            </div>
                                                            {/* Estado de pago al chofer */}
                                                            {montoPagoChofer > 0 && (
                                                                <div className="flex items-center gap-1.5" title={`Chofer: Pactado $${montoPagoChofer} / Pagado $${pagadoChofer}`}>
                                                                    <User size={12} className={debeAlChofer ? 'text-amber-500' : 'text-emerald-500'} />
                                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${debeAlChofer ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                                                        {debeAlChofer ? `Debe $${pendienteChofer.toFixed(0)}` : 'Pagado'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${viaje.estado === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                            viaje.estado === 'EN_CURSO' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                                viaje.estado === 'CANCELADO' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>
                                                            {ESTADOS_VIAJE[viaje.estado]?.label || viaje.estado}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button
                                                            onClick={() => cargarDetalleViaje(viaje.id)}
                                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                            title="Ver Detalle"
                                                        >
                                                            <Eye size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL FORMULARIO VIAJE (WIZARD) */}
                {modalFormOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content-lg max-h-[90vh] flex flex-col animate-scaleIn">
                            <div className="modal-header bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-6 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg text-indigo-600 shadow-sm border border-indigo-100">
                                        <Briefcase size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {editando ? 'Editar Viaje' : 'Nuevo Viaje'}
                                    </h3>
                                </div>
                                <button onClick={() => setModalFormOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Wizard Progress Bar - Fixed at top */}
                            <div className="px-10 pt-8 pb-4 shrink-0 bg-white z-10">
                                <div className="relative mb-6">
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-100 rounded-full -z-10"></div>
                                    <div
                                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-indigo-600 rounded-full -z-10 transition-all duration-500 ease-in-out shadow-sm"
                                        style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
                                    ></div>

                                    <div className="flex justify-between w-full">
                                        {[1, 2, 3].map((step) => (
                                            <div key={step} className={`flex flex-col items-center gap-2 relative transition-all duration-300 ${step <= currentStep ? 'opacity-100' : 'opacity-50'}`}>
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all duration-300 ring-[3px] 
                                                    ${step < currentStep
                                                            ? 'bg-indigo-600 text-white ring-indigo-100'
                                                            : step === currentStep
                                                                ? 'bg-white text-indigo-600 ring-indigo-600'
                                                                : 'bg-white text-slate-400 ring-slate-100'
                                                        }`}
                                                >
                                                    {step < currentStep ? <Check size={18} /> : step}
                                                </div>
                                                <span
                                                    className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors
                                                    ${step === currentStep
                                                            ? 'text-indigo-700 bg-indigo-50'
                                                            : 'text-slate-500'
                                                        }`}
                                                >
                                                    {step === 1 ? 'Ruta y Carga' : step === 2 ? 'Asignación' : 'Económico'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleGuardarViaje} className="flex flex-col flex-1 overflow-hidden">
                                <div className="modal-body overflow-y-auto flex-1 px-10 py-6">

                                    {/* PASO 1: CLIENTE, CARGA Y RUTA */}
                                    {currentStep === 1 && (
                                        <div className="space-y-8 animate-fadeIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="col-span-2">
                                                    <h4 className="text-sm font-black text-slate-800 uppercase mb-4 pb-2 border-b border-slate-100 flex items-center gap-2 tracking-wide">
                                                        <Briefcase size={18} className="text-indigo-500" /> Información del Cliente
                                                    </h4>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div>
                                                            <label className="form-label">Cliente *</label>
                                                            <select
                                                                className="form-select"
                                                                value={formViaje.clienteId}
                                                                onChange={(e) => setFormViaje({ ...formViaje, clienteId: e.target.value })}
                                                                required
                                                                autoFocus
                                                            >
                                                                <option value="">Seleccione...</option>
                                                                {clientes.map((c) => (
                                                                    <option key={c.id} value={c.id}>{c.nombreRazonSocial}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Tipo de Carga *</label>
                                                            <select
                                                                className="form-select"
                                                                value={formViaje.materialId}
                                                                onChange={(e) => setFormViaje({ ...formViaje, materialId: e.target.value })}
                                                                required
                                                            >
                                                                <option value="">Seleccione...</option>
                                                                {materiales.map((m) => (
                                                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <h4 className="text-sm font-black text-slate-800 uppercase mb-4 pb-2 border-b border-slate-100 flex items-center gap-2 tracking-wide">
                                                        <Route size={18} className="text-indigo-500" /> Detalles de Ruta
                                                    </h4>

                                                    {/* Route Card - Timeline Design */}
                                                    <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 p-6 mb-6">
                                                        <div className="flex gap-4">
                                                            {/* Timeline Visual */}
                                                            <div className="flex flex-col items-center py-2">
                                                                <div className="w-4 h-4 rounded-full bg-emerald-500 border-4 border-emerald-100 shadow-sm" />
                                                                <div className="w-0.5 flex-1 bg-gradient-to-b from-emerald-300 via-slate-300 to-rose-300 my-2" />
                                                                <div className="w-4 h-4 rounded-full bg-rose-500 border-4 border-rose-100 shadow-sm" />
                                                            </div>

                                                            {/* Inputs Container */}
                                                            <div className="flex-1 space-y-4">
                                                                {/* Origen */}
                                                                <div className="relative">
                                                                    <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600 uppercase tracking-widest writing-mode-vertical hidden md:block" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}>A</span>
                                                                    <LocationInput
                                                                        label="Origen *"
                                                                        value={formViaje.origen}
                                                                        placeholder="Ciudad de origen..."
                                                                        required
                                                                        onChange={(value, coords) => {
                                                                            setFormViaje({ ...formViaje, origen: value });
                                                                            if (coords) setOrigenCoords(coords);
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Swap Button */}
                                                                <div className="flex justify-center -my-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const tempOrigen = formViaje.origen;
                                                                            const tempOrigenCoords = origenCoords;
                                                                            setFormViaje({
                                                                                ...formViaje,
                                                                                origen: formViaje.destino,
                                                                                destino: tempOrigen
                                                                            });
                                                                            setOrigenCoords(destinoCoords);
                                                                            setDestinoCoords(tempOrigenCoords);
                                                                        }}
                                                                        className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all shadow-sm hover:shadow"
                                                                        title="Intercambiar origen y destino"
                                                                    >
                                                                        <ArrowUpDown size={14} className="group-hover:rotate-180 transition-transform duration-300" />
                                                                        <span className="hidden sm:inline">Invertir Ruta</span>
                                                                    </button>
                                                                </div>

                                                                {/* Destino */}
                                                                <div className="relative">
                                                                    <span className="absolute -left-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-600 uppercase tracking-widest hidden md:block" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}>B</span>
                                                                    <LocationInput
                                                                        label="Destino *"
                                                                        value={formViaje.destino}
                                                                        placeholder="Ciudad de destino..."
                                                                        required
                                                                        onChange={(value, coords) => {
                                                                            setFormViaje({ ...formViaje, destino: value });
                                                                            if (coords) setDestinoCoords(coords);
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Route Info Card - Optimized */}
                                                    {(calculandoRuta || rutaCalculada) && (
                                                        <div className="bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl p-1 mb-6 shadow-lg shadow-indigo-200/50">
                                                            <div className="bg-white rounded-xl p-5">
                                                                {calculandoRuta ? (
                                                                    <div className="flex items-center gap-3 text-indigo-700 justify-center py-3">
                                                                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                                                        <span className="font-semibold">Calculando ruta óptima...</span>
                                                                    </div>
                                                                ) : rutaCalculada && (
                                                                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                                                                        {/* Distancia */}
                                                                        <div className="text-center px-6">
                                                                            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-xl mb-2">
                                                                                <Route size={24} className="text-indigo-600" />
                                                                            </div>
                                                                            <p className="text-3xl font-black text-slate-800">{rutaCalculada.distance}</p>
                                                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Kilómetros</p>
                                                                        </div>
                                                                        {/* Tiempo */}
                                                                        <div className="text-center px-6">
                                                                            <div className="inline-flex items-center justify-center w-12 h-12 bg-violet-50 rounded-xl mb-2">
                                                                                <Clock size={24} className="text-violet-600" />
                                                                            </div>
                                                                            <p className="text-3xl font-black text-slate-800">
                                                                                {Math.floor(rutaCalculada.duration / 60)}h {rutaCalculada.duration % 60}m
                                                                            </p>
                                                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tiempo Estimado</p>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Programación - Fechas */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Salida */}
                                                        <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-200 transition-colors group">
                                                            <div className="flex items-center gap-2 mb-3">
                                                                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                                    <Play size={14} className="text-indigo-600 ml-0.5" />
                                                                </div>
                                                                <label className="form-label text-indigo-900 font-bold">Salida *</label>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <div className="relative">
                                                                    <input
                                                                        type="date"
                                                                        className="form-input pl-3 pr-8 bg-slate-50 text-sm h-10"
                                                                        value={formViaje.fechaSalida?.split('T')[0] || ''}
                                                                        onChange={(e) => {
                                                                            const time = formViaje.fechaSalida?.split('T')[1] || '08:00';
                                                                            actualizarFechaSalida(`${e.target.value}T${time}`);
                                                                        }}
                                                                        required
                                                                    />
                                                                    <Calendar
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                                    />
                                                                </div>
                                                                <div className="relative">
                                                                    <input
                                                                        type="time"
                                                                        className="form-input pl-3 pr-8 bg-slate-50 text-sm h-10"
                                                                        value={formViaje.fechaSalida?.split('T')[1] || ''}
                                                                        onChange={(e) => {
                                                                            const date = formViaje.fechaSalida?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                                            actualizarFechaSalida(`${date}T${e.target.value}`);
                                                                        }}
                                                                        required
                                                                    />
                                                                    <Clock
                                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Llegada */}
                                                        {!rutaCalculada ? (
                                                            <div className="bg-white p-4 rounded-xl border-2 border-slate-100 hover:border-emerald-200 transition-colors group">
                                                                <div className="flex items-center gap-2 mb-3">
                                                                    <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-50 transition-colors">
                                                                        <CheckCircle size={14} className="text-slate-400 group-hover:text-emerald-600" />
                                                                    </div>
                                                                    <label className="form-label text-slate-700">Llegada Est.</label>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="relative">
                                                                        <input
                                                                            type="date"
                                                                            className="form-input bg-slate-50 text-sm h-10 w-full pr-8"
                                                                            value={formViaje.fechaLlegadaEstimada?.split('T')[0] || ''}
                                                                            onChange={(e) => {
                                                                                const time = formViaje.fechaLlegadaEstimada?.split('T')[1] || '18:00';
                                                                                setFormViaje({ ...formViaje, fechaLlegadaEstimada: `${e.target.value}T${time}` });
                                                                            }}
                                                                            min={formViaje.fechaSalida?.split('T')[0] || undefined}
                                                                        />
                                                                        <Calendar
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-emerald-600 transition-colors"
                                                                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                                        />
                                                                    </div>
                                                                    <div className="relative">
                                                                        <input
                                                                            type="time"
                                                                            className="form-input bg-slate-50 text-sm h-10 w-full pr-8"
                                                                            value={formViaje.fechaLlegadaEstimada?.split('T')[1] || ''}
                                                                            onChange={(e) => {
                                                                                const date = formViaje.fechaLlegadaEstimada?.split('T')[0] || formViaje.fechaSalida?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                                                setFormViaje({ ...formViaje, fechaLlegadaEstimada: `${date}T${e.target.value}` });
                                                                            }}
                                                                        />
                                                                        <Clock
                                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-emerald-600 transition-colors"
                                                                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ) : formViaje.fechaLlegadaEstimada && (
                                                            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-xl border-2 border-emerald-200 flex flex-col justify-center items-center">
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <CheckCircle size={16} className="text-emerald-600" />
                                                                    <span className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Llegada Estimada</span>
                                                                </div>
                                                                <div className="text-emerald-800 font-black text-lg flex items-center gap-2">
                                                                    <Calendar size={16} />
                                                                    {new Date(formViaje.fechaLlegadaEstimada).toLocaleString('es-EC', {
                                                                        weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PASO 2: ASIGNACIÓN DE RECURSOS */}
                                    {currentStep === 2 && (
                                        <div className="space-y-8 animate-fadeIn">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                <div className="col-span-2">
                                                    <h4 className="text-sm font-black text-slate-800 uppercase mb-4 pb-2 border-b border-slate-100 flex items-center gap-2 tracking-wide">
                                                        <Truck size={18} className="text-indigo-500" /> Asignación de Recursos
                                                    </h4>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        {/* Selección Vehículo */}
                                                        <div className={`p-4 rounded-xl border transition-all ${formViaje.vehiculoId ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                                            <label className={`form-label mb-2 block ${formViaje.vehiculoId ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                                Vehículo *
                                                            </label>
                                                            <div className="relative">
                                                                <select
                                                                    className={`form-select pr-10 h-12 transition-all font-medium ${formViaje.vehiculoId ? 'border-emerald-300 bg-emerald-50 text-emerald-900 focus:ring-emerald-200' : ''}`}
                                                                    value={formViaje.vehiculoId}
                                                                    onChange={(e) => setFormViaje({ ...formViaje, vehiculoId: e.target.value })}
                                                                    required
                                                                    autoFocus
                                                                >
                                                                    <option value="">Seleccione vehículo...</option>
                                                                    {vehiculos.map((v) => (
                                                                        <option key={v.id} value={v.id}>{v.placa} - {v.marca} {v.modelo}</option>
                                                                    ))}
                                                                </select>
                                                                <Truck className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors ${formViaje.vehiculoId ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                            </div>
                                                            {formViaje.vehiculoId && (
                                                                <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
                                                                    <CheckCircle size={12} /> Vehículo listo para asignar
                                                                </p>
                                                            )}
                                                        </div>

                                                        {/* Selección Chofer */}
                                                        <div className={`p-4 rounded-xl border transition-all ${formViaje.choferId ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                                            <label className={`form-label mb-2 block ${formViaje.choferId ? 'text-emerald-700' : 'text-slate-700'}`}>
                                                                Conductor *
                                                            </label>
                                                            <div className="relative">
                                                                <select
                                                                    className={`form-select pr-10 h-12 transition-all font-medium ${formViaje.choferId ? 'border-emerald-300 bg-emerald-50 text-emerald-900 focus:ring-emerald-200' : ''}`}
                                                                    value={formViaje.choferId}
                                                                    onChange={(e) => {
                                                                        const nuevoChoferId = e.target.value;
                                                                        const chofer = choferes.find(c => c.id === Number(nuevoChoferId));
                                                                        setFormViaje({
                                                                            ...formViaje,
                                                                            choferId: nuevoChoferId,
                                                                            montoPagoChofer: chofer?.modalidadPago !== 'POR_VIAJE' ? '' : formViaje.montoPagoChofer
                                                                        });
                                                                    }}
                                                                    required
                                                                >
                                                                    <option value="">Seleccione conductor...</option>
                                                                    {choferes.map((c) => (
                                                                        <option key={c.id} value={c.id}>
                                                                            {c.nombres} {c.apellidos}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                                <User className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 pointer-events-none transition-colors ${formViaje.choferId ? 'text-emerald-500' : 'text-slate-400'}`} />
                                                            </div>
                                                            {choferSeleccionado && (
                                                                <div className="mt-2 text-xs bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-slate-600 flex items-center justify-between">
                                                                    <span className="font-semibold text-slate-700">Modalidad:</span>
                                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${choferSeleccionado.modalidadPago === 'POR_VIAJE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        {choferSeleccionado.modalidadPago === 'POR_VIAJE' ? 'Por Viaje' : 'Mensualizado'}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* PASO 3: ECONÓMICO Y FINALIZAR */}
                                    {currentStep === 3 && (
                                        <div className="space-y-8 animate-fadeIn">
                                            <div className="col-span-2">
                                                <h4 className="text-sm font-black text-slate-800 uppercase mb-4 pb-2 border-b border-slate-100 flex items-center gap-2 _tracking-wide">
                                                    <DollarSign size={18} className="text-indigo-500" /> Acuerdo Económico
                                                </h4>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div>
                                                        <label className="form-label text-slate-700 mb-2 block">Tarifa Cliente (USD) *</label>
                                                        <div className="relative group">
                                                            <input
                                                                type="number"
                                                                className="form-input pl-4 pr-8 text-xl font-bold text-slate-800 h-14 shadow-sm"
                                                                value={formViaje.tarifa}
                                                                onChange={(e) => setFormViaje({ ...formViaje, tarifa: e.target.value })}
                                                                required
                                                                placeholder=""
                                                                step="0.01"
                                                                autoFocus
                                                            />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 font-bold text-lg">$</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-2 font-medium">Valor total a facturar al cliente.</p>
                                                    </div>

                                                    {mostrarMontoPagoChofer ? (
                                                        <div>
                                                            <label className="form-label text-amber-800 mb-2 block">Pago a Chofer (USD) *</label>
                                                            <div className="relative group">
                                                                <input
                                                                    type="number"
                                                                    className="form-input pl-4 pr-8 bg-amber-50 border-amber-200 text-amber-900 font-bold h-14 shadow-sm focus:border-amber-400 focus:ring-amber-200"
                                                                    value={formViaje.montoPagoChofer}
                                                                    onChange={(e) => setFormViaje({ ...formViaje, montoPagoChofer: e.target.value })}
                                                                    required
                                                                    placeholder="0.00"
                                                                    step="0.01"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold text-lg">$</span>
                                                            </div>
                                                            <p className="text-xs text-amber-600 mt-2 font-medium">Este chofer cobra por viaje realizado.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 flex flex-col justify-center gap-2">
                                                            <div className="flex items-center gap-3">
                                                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                                                    <Briefcase size={20} />
                                                                </div>
                                                                <span className="text-blue-900 font-bold text-sm uppercase tracking-wide">Chofer Mensualizado</span>
                                                            </div>
                                                            <p className="text-sm text-blue-700 pl-11">No requiere registrar pago individual para este viaje.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Calculadora Rápida */}
                                                {mostrarMontoPagoChofer && formViaje.tarifa && formViaje.montoPagoChofer && (
                                                    <div className="mt-6 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <span className="text-slate-500 font-bold text-xs uppercase tracking-wider block mb-1">Margen Estimado</span>
                                                                <span className="text-slate-400 text-xs">Tarifa - Pago Chofer</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`text-3xl font-black ${(Number(formViaje.tarifa) - Number(formViaje.montoPagoChofer)) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                    ${((Number(formViaje.tarifa) || 0) - (Number(formViaje.montoPagoChofer) || 0)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="w-full bg-slate-200 rounded-full h-2 mt-4 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${(Number(formViaje.tarifa) - Number(formViaje.montoPagoChofer)) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                                                style={{ width: `${Math.min(Math.max((((Number(formViaje.tarifa) || 0) - (Number(formViaje.montoPagoChofer) || 0)) / Number(formViaje.tarifa)) * 100, 0), 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="mt-8">
                                                    <label className="form-label mb-2 block text-slate-700">Observaciones Generales</label>
                                                    <textarea
                                                        className="form-input min-h-[100px] resize-none"
                                                        value={formViaje.observaciones}
                                                        onChange={(e) => setFormViaje({ ...formViaje, observaciones: e.target.value })}
                                                        placeholder="Instrucciones especiales, condiciones de carga, notas para el conductor..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer shrink-0 flex justify-between bg-slate-50 border-t border-slate-200 p-5 z-20">
                                    <button
                                        type="button"
                                        onClick={currentStep === 1 ? () => setModalFormOpen(false) : prevStep}
                                        className="btn btn-secondary px-6"
                                    >
                                        {currentStep === 1 ? 'Cancelar' : 'Atrás'}
                                    </button>

                                    {currentStep < 3 ? (
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            className="btn btn-primary px-8 shadow-lg shadow-indigo-200"
                                        >
                                            Siguiente <ChevronRight size={18} className="ml-2" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="btn btn-primary px-10 shadow-lg shadow-indigo-200"
                                        >
                                            {editando ? 'Guardar Cambios' : 'Crear Viaje'} <Check size={18} className="ml-2" />
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // =========== VISTA DETALLE ===========
    if (vista === 'detalle' && viajeSeleccionado) {
        const estadoActual = viajeSeleccionado.estado;
        const puedeIniciar = estadoActual === 'PLANIFICADO';
        const puedeCompletar = estadoActual === 'EN_CURSO';
        const puedeCancelar = estadoActual === 'PLANIFICADO' || estadoActual === 'EN_CURSO';

        return (
            <div>
                {/* HEADERS Y ACCIONES */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 animate-fadeIn">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => { cargarViajes(); setVista('lista'); }}
                            className="bg-white p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all duration-200 border border-slate-200 hover:border-indigo-100"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Viaje #{viajeSeleccionado.id}</h2>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${viajeSeleccionado.estadoPagoCliente === 'PENDIENTE'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : viajeSeleccionado.estadoPagoCliente === 'PARCIAL'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : ESTADOS_VIAJE[estadoActual]?.class || 'badge-neutral'
                                    }`}>
                                    {viajeSeleccionado.estadoPagoCliente === 'PENDIENTE'
                                        ? 'POR COBRAR'
                                        : viajeSeleccionado.estadoPagoCliente === 'PARCIAL'
                                            ? 'PAGO PARCIAL'
                                            : ESTADOS_VIAJE[estadoActual]?.label || estadoActual}
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                                <span className="font-medium text-slate-700">{viajeSeleccionado.origen}</span>
                                <ArrowRight size={14} className="text-slate-400" />
                                <span className="font-medium text-slate-700">{viajeSeleccionado.destino}</span>
                            </p>
                        </div>
                    </div>
                    {canWrite && (
                        <div className="flex gap-2">
                            {puedeIniciar && (
                                <button onClick={() => handleCambiarEstado('EN_CURSO')} className="btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                    <Play size={16} className="mr-2" /> Iniciar Viaje
                                </button>
                            )}
                            {puedeCompletar && (
                                <button onClick={() => handleCambiarEstado('COMPLETADO')} className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200">
                                    <CheckCircle size={16} className="mr-2" /> Completar Viaje
                                </button>
                            )}
                            {puedeCancelar && (
                                <button onClick={() => handleCambiarEstado('CANCELADO')} className="btn bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300">
                                    <Ban size={16} className="mr-2" /> Cancelar
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna Izquierda: Información General */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Tarjeta Info Principal */}
                        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 uppercase mb-6 flex items-center gap-2 pb-3 border-b border-slate-50">
                                <FileText size={18} className="text-indigo-500" /> Detalles del Servicio
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                <div className="group">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Cliente</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Briefcase size={16} />
                                        </div>
                                        <p className="font-bold text-slate-800 text-base">{viajeSeleccionado.cliente?.nombreRazonSocial ?? 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="group">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Carga</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <Package size={16} />
                                        </div>
                                        <p className="font-bold text-slate-800 text-base">{viajeSeleccionado.material?.nombre ?? 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="group">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Vehículo Asignado</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <Truck size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{viajeSeleccionado.vehiculo?.placa ?? 'N/A'}</p>
                                            <p className="text-xs text-slate-500">{viajeSeleccionado.vehiculo?.marca ?? ''} {viajeSeleccionado.vehiculo?.modelo ?? ''}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="group">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Conductor</span>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{viajeSeleccionado.chofer?.nombres ?? ''} {viajeSeleccionado.chofer?.apellidos ?? ''}</p>
                                            <p className="text-xs text-slate-500">{viajeSeleccionado.chofer?.telefono || 'Sin teléfono'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Salida Programada</span>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                            <Calendar size={14} className="text-slate-400" />
                                            {formatearFecha(viajeSeleccionado.fechaSalida)}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Llegada Estimada</span>
                                        <div className="flex items-center gap-2 text-slate-700 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                            <Clock size={14} className="text-slate-400" />
                                            {formatearFecha(viajeSeleccionado.fechaLlegadaEstimada || '')}
                                        </div>
                                    </div>
                                </div>

                                {viajeSeleccionado.fechaLlegadaReal && (
                                    <div className="md:col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-100 mt-2 flex items-center justify-between">
                                        <div>
                                            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide block mb-1">Viaje Finalizado</span>
                                            <p className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                                                <CheckCircle size={16} />
                                                {formatearFecha(viajeSeleccionado.fechaLlegadaReal)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-emerald-600 text-xs font-bold uppercase tracking-wide block mb-1">Recorrido Real</span>
                                            <p className="font-bold text-emerald-900 text-xl">{viajeSeleccionado.kilometrosReales} <span className="text-sm font-normal text-emerald-700">km</span></p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tarjeta Gastos */}
                        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                                    <DollarSign size={18} className="text-amber-500" /> Gastos Operativos
                                </h3>
                                {canWrite && (estadoActual === 'PLANIFICADO' || estadoActual === 'EN_CURSO') && (
                                    <button
                                        onClick={() => setMostrarModalGasto(true)}
                                        className="btn btn-sm bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                                    >
                                        <Plus size={14} className="mr-1" />
                                        Agregar Gasto
                                    </button>
                                )}
                            </div>

                            {(viajeSeleccionado.gastos && viajeSeleccionado.gastos.length > 0) || (viajeSeleccionado.pagos && viajeSeleccionado.pagos.length > 0) ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                                <th className="font-bold text-left py-3 px-4">Concepto</th>
                                                <th className="font-bold text-left py-3 px-4">Fecha</th>
                                                <th className="font-bold text-left py-3 px-4">Monto</th>
                                                <th className="font-bold text-right py-3 px-4">Comp.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {viajeSeleccionado.gastos?.map((gasto: GastoViaje) => (
                                                <tr key={gasto.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-slate-700">{gasto.tipoGasto}</div>
                                                        <div className="text-xs text-slate-400 mt-0.5">{gasto.descripcion || gasto.metodoPago}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600">{new Date(gasto.fecha).toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 font-bold text-rose-600">{formatearMoneda(gasto.monto)}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        {gasto.comprobante ? (
                                                            <button
                                                                onClick={() => setImagenModalUrl(gasto.comprobante?.url || '')}
                                                                className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                                            >
                                                                <FileText size={12} /> Ver
                                                            </button>
                                                        ) : <span className="text-slate-300">-</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Renderizar PAGOS (Pagos Chofer) como gastos */}
                                            {viajeSeleccionado.pagos?.map((pago: PagoChofer) => (
                                                <tr key={`pago-${pago.id}`} className={`transition-colors ${pago.estado === 'PAGADO' ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'bg-slate-50 opacity-75 hover:opacity-100'}`}>
                                                    <td className="py-3 px-4">
                                                        <div className="font-bold text-amber-900">PAGO CHOFER</div>
                                                        <div className="text-xs text-amber-700/70 mt-0.5">{pago.descripcion || 'Pago de nómina'}</div>
                                                    </td>
                                                    <td className="py-3 px-4 text-amber-800">{new Date(pago.fecha).toLocaleDateString()}</td>
                                                    <td className="py-3 px-4 font-bold text-rose-600">{formatearMoneda(pago.monto)}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${pago.estado === 'PAGADO'
                                                            ? 'text-emerald-700 bg-emerald-100/50 border-emerald-100'
                                                            : 'text-amber-700 bg-amber-100/50 border-amber-100'}`}>
                                                            {pago.estado || 'PENDIENTE'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-slate-50 border-t border-slate-200">
                                            <tr>
                                                <td colSpan={2} className="py-3 px-4 font-bold text-slate-700 text-right">Total Ejecutado:</td>
                                                <td className="py-3 px-4 font-bold text-rose-600 text-base">
                                                    {formatearMoneda(
                                                        (viajeSeleccionado.gastos?.reduce((acc: number, g: GastoViaje) => acc + Number(g.monto), 0) || 0) +
                                                        (viajeSeleccionado.pagos?.reduce((acc: number, p: PagoChofer) => p.estado === 'PAGADO' ? acc + Number(p.monto) : acc, 0) || 0)
                                                    )}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <div className="bg-white p-3 rounded-full inline-block mb-3 shadow-sm">
                                        <DollarSign size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 font-medium">No hay gastos registrados</p>
                                    <p className="text-slate-400 text-sm mt-1">Registra gastos operativos o pagos al chofer aquí.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Derecha: Resumen Económico */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100 sticky top-6">
                            <h3 className="text-sm font-bold text-slate-800 uppercase mb-6 text-center tracking-wider">Resumen Económico</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-100 transition-colors">
                                    <span className="text-slate-600 text-sm font-bold group-hover:text-indigo-600 transition-colors">Ingresos Estimados</span>
                                    <span className="text-2xl font-bold text-slate-800">{formatearMoneda(viajeSeleccionado.tarifa)}</span>
                                </div>

                                {/* PAGO CLIENTE STATUS */}
                                <div className={`flex flex-col p-5 rounded-xl border-2 transition-all ${viajeSeleccionado.estadoPagoCliente === 'PAGADO'
                                    ? 'bg-emerald-50 border-emerald-100'
                                    : viajeSeleccionado.estadoPagoCliente === 'PARCIAL'
                                        ? 'bg-blue-50 border-blue-100'
                                        : 'bg-white border-amber-100 shadow-sm'
                                    }`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-xs font-bold uppercase tracking-wider ${viajeSeleccionado.estadoPagoCliente === 'PAGADO' ? 'text-emerald-700'
                                            : viajeSeleccionado.estadoPagoCliente === 'PARCIAL' ? 'text-blue-700'
                                                : 'text-amber-600'
                                            }`}>
                                            Estado de Cobro
                                        </span>
                                        <span className={`font-bold text-sm px-2 py-0.5 rounded-md ${viajeSeleccionado.estadoPagoCliente === 'PAGADO' ? 'bg-emerald-100 text-emerald-800'
                                            : viajeSeleccionado.estadoPagoCliente === 'PARCIAL' ? 'bg-blue-100 text-blue-800'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            {viajeSeleccionado.estadoPagoCliente || 'PENDIENTE'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-medium">Pagado</span>
                                            <span className="font-bold text-emerald-600">
                                                {formatearMoneda(viajeSeleccionado.montoPagadoCliente || 0)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm pt-2 border-t border-dashed border-slate-200">
                                            <span className="text-slate-500 font-medium">Pendiente</span>
                                            <span className="font-bold text-amber-600">
                                                {formatearMoneda(viajeSeleccionado.tarifa - (viajeSeleccionado.montoPagadoCliente || 0))}
                                            </span>
                                        </div>
                                    </div>

                                    {canWrite && viajeSeleccionado.estadoPagoCliente !== 'PAGADO' && (
                                        <button
                                            onClick={() => setMostrarModalPago(true)}
                                            className="mt-4 w-full btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200/50 h-10"
                                        >
                                            Registrar Pago
                                        </button>
                                    )}
                                </div>

                                <div className="flex justify-between items-center p-4 bg-rose-50 rounded-xl border border-rose-100">
                                    <span className="text-rose-800 text-sm font-bold">Total Gastos</span>
                                    <span className="text-rose-700 font-bold text-lg">
                                        - {formatearMoneda(resumenEconomico?.gastos || 0)}
                                    </span>
                                </div>

                                <div className="border-t-2 border-slate-100 pt-5 mt-2">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-slate-800 font-bold text-sm uppercase tracking-wider">Margen Operativo</span>
                                        <span className={`font-black text-3xl leading-none ${(resumenEconomico?.ganancia || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatearMoneda(resumenEconomico?.ganancia || 0)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-3 mt-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out ${(resumenEconomico?.ganancia || 0) >= 0 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-rose-500'}`}
                                            style={{
                                                width: `${Math.min(Math.max(
                                                    ((resumenEconomico?.ganancia || 0) / viajeSeleccionado.tarifa) * 100,
                                                    0), 100)}%`
                                            }}
                                        ></div>
                                    </div>
                                    <p className="text-xs text-right text-slate-400 mt-2 font-medium">
                                        Rentabilidad: <span className={(resumenEconomico?.ganancia || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                                            {((resumenEconomico?.ganancia || 0) / viajeSeleccionado.tarifa * 100).toFixed(1)}%
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {viajeSeleccionado.observaciones && (
                            <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 shadow-sm">
                                <h3 className="text-xs font-bold text-amber-700 uppercase mb-2 flex items-center gap-2">
                                    <FileText size={14} /> Observaciones
                                </h3>
                                <p className="text-sm text-amber-900 leading-relaxed font-medium">{viajeSeleccionado.observaciones}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Agregar Gasto */}
                {mostrarModalGasto && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-scaleIn">
                            <div className="modal-header bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 p-6 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="bg-white p-2 rounded-lg text-amber-500 shadow-sm border border-amber-100">
                                        <DollarSign size={24} />
                                    </div>
                                    Registrar Nuevo Gasto
                                </h3>
                                <button onClick={() => { setMostrarModalGasto(false); setFormGasto({ tipoGasto: 'COMBUSTIBLE', monto: '', fecha: new Date().toISOString().split('T')[0], metodoPago: 'EFECTIVO', descripcion: '' }); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAgregarGasto}>
                                <div className="modal-body grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="form-label">Tipo de Gasto</label>
                                        <select
                                            className="form-select"
                                            value={formGasto.tipoGasto}
                                            onChange={(e) => setFormGasto({ ...formGasto, tipoGasto: e.target.value })}
                                            required
                                        >
                                            {TIPOS_GASTO_OPTIONS.map((type: TipoGasto) => <option key={type} value={type}>{type}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Fecha</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                className="form-input pr-10 pl-4"
                                                value={formGasto.fecha}
                                                onChange={(e) => setFormGasto({ ...formGasto, fecha: e.target.value })}
                                                required
                                            />
                                            <Calendar
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 cursor-pointer hover:text-amber-600 transition-colors"
                                                onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Monto (USD)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input pr-10 pl-4 font-bold text-slate-700"
                                                value={formGasto.monto}
                                                onChange={(e) => setFormGasto({ ...formGasto, monto: e.target.value })}
                                                required
                                                placeholder="0.00"
                                            />
                                            <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Método Pago</label>
                                        <select
                                            className="form-select"
                                            value={formGasto.metodoPago}
                                            onChange={(e) => setFormGasto({ ...formGasto, metodoPago: e.target.value })}
                                        >
                                            {METODOS_PAGO_OPTIONS.map((m: MetodoPago) => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="form-label">Descripción</label>
                                        <input
                                            className="form-input"
                                            value={formGasto.descripcion}
                                            onChange={(e) => setFormGasto({ ...formGasto, descripcion: e.target.value })}
                                            placeholder="Detalle opcional..."
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <FileUpload
                                            file={archivoComprobante}
                                            onChange={(file) => setArchivoComprobante(file)}
                                            label="Comprobante (Imagen)"
                                            accept="image/*"
                                            hint="Imagen del comprobante"
                                            size="sm"
                                            showPreview
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
                                    <button type="button" onClick={() => { setMostrarModalGasto(false); setFormGasto({ tipoGasto: 'COMBUSTIBLE', monto: '', fecha: new Date().toISOString().split('T')[0], metodoPago: 'EFECTIVO', descripcion: '' }); }} className="btn btn-secondary px-6 rounded-xl">Cancelar</button>
                                    <button type="submit" className="btn btn-primary bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-none text-white shadow-lg shadow-amber-200 px-6 rounded-xl font-bold">Registrar Gasto</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal Completar Viaje */}
                {mostrarModalCompletar && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-scaleIn">
                            <div className="modal-header bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-6 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="bg-white p-2 rounded-lg text-emerald-500 shadow-sm border border-emerald-100">
                                        <CheckCircle size={24} />
                                    </div>
                                    Finalizar Viaje
                                </h3>
                                <button onClick={() => { setMostrarModalCompletar(false); setDatosComplecion({ kilometrosReales: '', fechaLlegadaReal: new Date().toISOString().slice(0, 16) }); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 mb-6 text-sm">
                                    Ingrese los datos reales de llegada para cerrar el viaje y calcular la rentabilidad final.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="form-label">Fecha LLegada Real *</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                className="form-input pr-10 pl-4"
                                                value={datosComplecion.fechaLlegadaReal}
                                                onChange={(e) => setDatosComplecion({ ...datosComplecion, fechaLlegadaReal: e.target.value })}
                                                required
                                            />
                                            <Calendar
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 cursor-pointer hover:text-emerald-600 transition-colors"
                                                onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Kilómetros Reales *</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="form-input pl-4 pr-16 font-bold text-slate-800"
                                                value={datosComplecion.kilometrosReales}
                                                onChange={(e) => setDatosComplecion({ ...datosComplecion, kilometrosReales: e.target.value })}
                                                placeholder={viajeSeleccionado?.kilometrosEstimados?.toString() || "0"}
                                                required
                                            />
                                            <span className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">KM</span>
                                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">Estimado: ~{viajeSeleccionado?.kilometrosEstimados} km</p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
                                <button onClick={() => { setMostrarModalCompletar(false); setDatosComplecion({ kilometrosReales: '', fechaLlegadaReal: new Date().toISOString().slice(0, 16) }); }} className="btn btn-secondary px-6 rounded-xl">Cancelar</button>
                                <button
                                    onClick={handleCompletarViaje}
                                    className="btn bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-6 rounded-xl font-bold"
                                    disabled={!datosComplecion.kilometrosReales || !datosComplecion.fechaLlegadaReal}
                                >
                                    Confirmar Finalización
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Registrar Pago Cliente */}
                {mostrarModalPago && (
                    <div className="modal-overlay">
                        <div className="modal-content animate-scaleIn">
                            <div className="modal-header bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-6 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="bg-white p-2 rounded-lg text-indigo-500 shadow-sm border border-indigo-100">
                                        <DollarSign size={24} />
                                    </div>
                                    Registrar Cobro
                                </h3>
                                <button onClick={() => { setMostrarModalPago(false); setMontoPago(''); }} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors"><X size={24} /></button>
                            </div>
                            <div className="p-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-500 font-medium">Total Facturado:</span>
                                        <span className="text-lg font-bold text-slate-800">{formatearMoneda(viajeSeleccionado.tarifa)}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-500 font-medium">Ya Pagado:</span>
                                        <span className="text-base font-bold text-emerald-600">{formatearMoneda(viajeSeleccionado.montoPagadoCliente || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                        <span className="text-sm text-slate-700 font-bold">Saldo Pendiente:</span>
                                        <span className="text-xl font-black text-indigo-600">
                                            {formatearMoneda(viajeSeleccionado.tarifa - (viajeSeleccionado.montoPagadoCliente || 0))}
                                        </span>
                                    </div>
                                </div>

                                <label className="form-label">Monto a Cobrar (USD) *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-input pl-4 pr-10 text-xl font-bold text-indigo-900 h-14"
                                        value={montoPago}
                                        onChange={(e) => setMontoPago(e.target.value)}
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 pointer-events-none" />
                                </div>
                                <p className="text-xs text-slate-400 mt-2 text-center">
                                    El estado cambiará automáticamente según el monto ingresado.
                                </p>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-3">
                                <button onClick={() => { setMostrarModalPago(false); setMontoPago(''); }} className="btn btn-secondary px-6 rounded-xl">Cancelar</button>
                                <button
                                    onClick={handleRegistrarPago}
                                    className="btn btn-primary bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-lg shadow-indigo-200 px-6 rounded-xl font-bold"
                                    disabled={!montoPago || parseFloat(montoPago) <= 0}
                                >
                                    Registrar Pago
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Visualizar Comprobante */}
                {imagenModalUrl && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn" onClick={() => setImagenModalUrl(null)}>
                        <div className="relative max-w-4xl max-h-[90vh] w-full">
                            <button
                                onClick={() => setImagenModalUrl(null)}
                                className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
                            >
                                <X size={32} />
                            </button>
                            <img
                                src={imagenModalUrl}
                                alt="Comprobante"
                                className="w-full h-full object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
}
