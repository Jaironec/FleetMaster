import { useState, useEffect, useRef, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { mantenimientoService, vehiculoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import { Plus, X, Upload, FileText, Trash2, Calendar, Play, CheckCircle, XCircle, Wrench } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { toast } from 'react-hot-toast';
import type { Mantenimiento, Vehiculo, FiltrosMantenimiento, EstadoMantenimiento, TipoMantenimiento } from '../types/api.types';
import { ApiError as GlobalApiError, wasToastShown, getErrorMessage } from '../types/error.types';

const Mantenimientos = () => {
    const { usuario, canWrite } = useAuth();
    const location = useLocation();
    const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showIniciarModal, setShowIniciarModal] = useState(false);
    const [showCompletarModal, setShowCompletarModal] = useState(false);
    const [selectedMantenimiento, setSelectedMantenimiento] = useState<Mantenimiento | null>(null);
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [filtros, setFiltros] = useState({
        vehiculoId: '',
        fechaDesde: '',
        fechaHasta: '',
        tipo: '',
        estado: ''
    });

    const [formData, setFormData] = useState({
        vehiculoId: '',
        descripcion: '',
        taller: '',
        fecha: new Date().toISOString().split('T')[0],
        kilometrajeAlMomento: ''
    });

    const [iniciarForm, setIniciarForm] = useState({ taller: '' });
    const [completarForm, setCompletarForm] = useState({
        taller: '',
        costoManoObra: '',
        costoRepuestos: '',
        descripcion: '',
        kilometrajeAlMomento: '',
        proximoKilometraje: '',
        archivo: null as File | null
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const completarFileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        cargarDatos();
        cargarVehiculos();

        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            setShowModal(true);
        }
    }, [location.search]);

    useEffect(() => {
        cargarDatos();
    }, [filtros]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            // Convertir vehiculoId a número antes de enviar
            const params: FiltrosMantenimiento = {};
            if (filtros.vehiculoId) params.vehiculoId = Number(filtros.vehiculoId);
            if (filtros.estado) params.estado = filtros.estado as EstadoMantenimiento;
            if (filtros.tipo) params.tipo = filtros.tipo as TipoMantenimiento;

            const data = await mantenimientoService.listar(params);
            setMantenimientos(data.datos || []);
        } catch (error) {
            const err = error as GlobalApiError;
            console.error('Error cargando mantenimientos', err);
        } finally {
            setLoading(false);
        }
    };

    const cargarVehiculos = async () => {
        try {
            const data = await vehiculoService.listar({});
            setVehiculos(data.datos || []);
        } catch (error) {
            const err = error as GlobalApiError;
            console.error('Error cargando vehículos:', err);
        }
    };

    const handleVehiculoChange = (vehiculoId: string) => {
        const vehiculo = vehiculos.find(v => v.id === parseInt(vehiculoId));

        if (vehiculo) {
            setFormData(prev => ({
                ...prev,
                vehiculoId,
                kilometrajeAlMomento: vehiculo.kilometrajeActual?.toString() || '',
                descripcion: prev.descripcion || 'Mantenimiento correctivo'
            }));
        } else {
            setFormData(prev => ({ ...prev, vehiculoId }));
        }
    };

    const resetFormData = () => {
        setFormData({
            vehiculoId: '',
            descripcion: '',
            taller: '',
            fecha: new Date().toISOString().split('T')[0],
            kilometrajeAlMomento: ''
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.taller) {
                toast.error('El taller es obligatorio');
                return;
            }

            const form = new FormData();
            form.append('vehiculoId', formData.vehiculoId);
            form.append('tipo', 'CORRECTIVO');
            form.append('descripcion', formData.descripcion);
            form.append('fecha', formData.fecha);
            form.append('taller', formData.taller);

            if (formData.kilometrajeAlMomento) {
                form.append('kilometrajeAlMomento', formData.kilometrajeAlMomento);
            }

            await mantenimientoService.crear(form);
            toast.success('Mantenimiento correctivo iniciado - Vehículo en taller');
            setShowModal(false);
            resetFormData();
            cargarDatos();
            cargarVehiculos();
        } catch (error) {
            const err = error as GlobalApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al registrar'));
        }
    };

    const handleIniciar = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedMantenimiento) return;

        try {
            await mantenimientoService.iniciar(selectedMantenimiento.id, iniciarForm.taller);
            toast.success('Mantenimiento iniciado - Vehículo en taller');
            setShowIniciarModal(false);
            setSelectedMantenimiento(null);
            setIniciarForm({ taller: '' });
            cargarDatos();
            cargarVehiculos();
        } catch (error) {
            const err = error as GlobalApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al iniciar'));
        }
    };

    const handleCompletar = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedMantenimiento) return;

        try {
            const form = new FormData();
            form.append('taller', completarForm.taller || selectedMantenimiento.taller || '');
            form.append('costoManoObra', completarForm.costoManoObra || '0');
            form.append('costoRepuestos', completarForm.costoRepuestos || '0');
            if (completarForm.descripcion) form.append('descripcion', completarForm.descripcion);
            if (completarForm.kilometrajeAlMomento) form.append('kilometrajeAlMomento', completarForm.kilometrajeAlMomento);
            if (completarForm.proximoKilometraje) form.append('proximoKilometraje', completarForm.proximoKilometraje);
            if (completarForm.archivo) form.append('archivo', completarForm.archivo);

            await mantenimientoService.completar(selectedMantenimiento.id, form);
            toast.success('Mantenimiento completado - Vehículo disponible');
            setShowCompletarModal(false);
            setSelectedMantenimiento(null);
            setCompletarForm({ taller: '', costoManoObra: '', costoRepuestos: '', descripcion: '', kilometrajeAlMomento: '', proximoKilometraje: '', archivo: null });
            cargarDatos();
            cargarVehiculos();
        } catch (error) {
            const err = error as GlobalApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al completar'));
        }
    };

    const handleCancelar = async (m: Mantenimiento) => {
        if (!window.confirm('¿Cancelar este mantenimiento programado?')) return;
        try {
            await mantenimientoService.cancelar(m.id);
            toast.success('Mantenimiento cancelado');
            cargarDatos();
        } catch (error) {
            const err = error as GlobalApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cancelar'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('¿Eliminar mantenimiento?')) return;
        try {
            await mantenimientoService.eliminar(id);
            toast.success('Eliminado correctamente');
            cargarDatos();
        } catch (error) {
            const err = error as GlobalApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al eliminar'));
        }
    };

    const abrirIniciarModal = (m: Mantenimiento) => {
        setSelectedMantenimiento(m);
        setIniciarForm({ taller: '' });
        setShowIniciarModal(true);
    };

    const abrirCompletarModal = (m: Mantenimiento) => {
        setSelectedMantenimiento(m);
        setCompletarForm({
            taller: m.taller || '',
            costoManoObra: '',
            costoRepuestos: '',
            descripcion: m.descripcion || '',
            kilometrajeAlMomento: m.kilometrajeAlMomento?.toString() || '',
            proximoKilometraje: '',
            archivo: null
        });
        setShowCompletarModal(true);
    };

    const getEstadoBadge = (estado: string) => {
        switch (estado) {
            case 'PENDIENTE':
                return <span className="badge badge-warning">⏳ Pendiente</span>;
            case 'EN_CURSO':
                return <span className="badge badge-info">🔧 En Taller</span>;
            case 'COMPLETADO':
                return <span className="badge badge-success">✅ Completado</span>;
            case 'CANCELADO':
                return <span className="badge badge-neutral">❌ Cancelado</span>;
            default:
                return <span className="badge">{estado}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Mantenimientos</h1>
                    <p className="text-slate-500 mt-2 text-lg">Control preventivo y correctivo de la flota.</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 px-6 py-3 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Wrench className="w-5 h-5" />
                        <span className="font-semibold">Nuevo Correctivo</span>
                    </button>
                )}
            </div>

            {/* Filtros / Action Toolbar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Vehículo</label>
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.vehiculoId}
                            onChange={e => setFiltros({ ...filtros, vehiculoId: e.target.value })}
                        >
                            <option value="">Todos los Vehículos</option>
                            {vehiculos?.map(v => <option key={v.id} value={v.id}>{v.placa} - {v.modelo}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Tipo</label>
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.tipo}
                            onChange={e => setFiltros({ ...filtros, tipo: e.target.value })}
                        >
                            <option value="">Todos</option>
                            <option value="PREVENTIVO">🛡️ Preventivo</option>
                            <option value="CORRECTIVO">🔧 Correctivo</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Estado</label>
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.estado}
                            onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                        >
                            <option value="">Todos</option>
                            <option value="PENDIENTE">⏳ Pendiente</option>
                            <option value="EN_CURSO">🔧 En Taller</option>
                            <option value="COMPLETADO">✅ Completado</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Desde</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.fechaDesde}
                            onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">Hasta</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.fechaHasta}
                            onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : mantenimientos.length === 0 ? (
                <EmptyState
                    type="mantenimientos"
                    onAction={() => setShowModal(true)}
                    showAction={true}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Fecha / Vehículo</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Tipo Mantenimiento</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Estado Actual</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Detalles Taller</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Costo Final</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 w-32 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {mantenimientos?.map((m) => (
                                    <tr key={m.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                                    <Calendar size={12} />
                                                    {new Date(m.fecha).toLocaleDateString()}
                                                </div>
                                                <span className="font-bold text-slate-800 text-base">{m.vehiculo?.placa}</span>
                                                <span className="text-xs text-slate-500">{m.vehiculo?.marca} {m.vehiculo?.modelo}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${m.tipo === 'PREVENTIVO' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {m.tipo === 'PREVENTIVO' ? '🛡️ Preventivo' : '🔧 Correctivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getEstadoBadge(m.estado)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col max-w-[250px]">
                                                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                                    <Wrench size={14} className="text-slate-400" />
                                                    {m.taller || '—'}
                                                </span>
                                                {m.descripcion && (
                                                    <span className="text-xs text-slate-500 mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded border border-slate-100">
                                                        {m.descripcion}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {m.estado === 'COMPLETADO' ? (
                                                <span className="font-bold text-slate-800 text-lg">
                                                    ${Number(m.costoTotal).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-sm italic">Pendiente</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 bg-white md:bg-transparent rounded-lg p-1 shadow-sm md:shadow-none border md:border-none border-slate-100">
                                                {/* Acciones según estado */}
                                                {m.estado === 'PENDIENTE' && (
                                                    <>
                                                        <button
                                                            onClick={() => abrirIniciarModal(m)}
                                                            className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                                                            title="Iniciar trabajo (Llevar al taller)"
                                                        >
                                                            <Play className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => abrirCompletarModal(m)}
                                                            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                                                            title="Completar directamente"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleCancelar(m)}
                                                            className="p-2 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors"
                                                            title="Cancelar Mantenimiento"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {m.estado === 'EN_CURSO' && (
                                                    <button
                                                        onClick={() => abrirCompletarModal(m)}
                                                        className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors w-full flex items-center justify-center gap-1"
                                                        title="Finalizar y Registrar Costos"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {m.comprobante && (
                                                    <a
                                                        href={m.comprobante.url}
                                                        target="_blank"
                                                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
                                                        title="Ver Comprobante"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </a>
                                                )}
                                                {usuario?.rol === 'ADMIN' && (m.estado === 'COMPLETADO' || m.estado === 'CANCELADO') && (
                                                    <button
                                                        onClick={() => handleDelete(m.id)}
                                                        className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"
                                                        title="Eliminar Registro"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Crear Mantenimiento Correctivo */}
            {showModal && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className="modal-header-edit">
                            <div className="flex items-center gap-3">
                                <div className="modal-icon-edit">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Registrar Correctivo</h3>
                                    <p className="text-sm text-slate-500">Ingreso de vehículo al taller por falla</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setShowModal(false); resetFormData(); }}
                                className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body p-6 space-y-5">
                                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-3">
                                    <div className="mt-0.5 text-amber-500">
                                        <Wrench className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm text-amber-800 leading-relaxed">
                                        Al registrar este correctivo, el estado del vehículo cambiará automáticamente a <strong>EN MANTENIMIENTO</strong> y no estará disponible para viajes.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Vehículo Afectado <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl text-slate-700 font-medium"
                                                value={formData.vehiculoId}
                                                onChange={e => handleVehiculoChange(e.target.value)}
                                            >
                                                <option value="">Seleccionar vehículo...</option>
                                                {vehiculos?.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.placa} - {v.modelo}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Taller Asignado <span className="text-rose-500">*</span></label>
                                        <input
                                            required
                                            type="text"
                                            className="form-input w-full bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                            value={formData.taller}
                                            onChange={e => setFormData({ ...formData, taller: e.target.value })}
                                            placeholder="Nombre del taller o mecánico"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Fecha Ingreso</label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    type="date"
                                                    className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    value={formData.fecha}
                                                    onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                                                />
                                                <Calendar
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-amber-600 transition-colors"
                                                    onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Km Actual</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-medium"
                                                    value={formData.kilometrajeAlMomento}
                                                    onChange={e => setFormData({ ...formData, kilometrajeAlMomento: e.target.value })}
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-wider">KM</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción del Problema</label>
                                        <textarea
                                            className="form-textarea w-full bg-slate-50 border-slate-200 focus:bg-white rounded-xl resize-none"
                                            rows={3}
                                            value={formData.descripcion}
                                            onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                            placeholder="Detalle los síntomas o fallas reportadas..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetFormData(); }}
                                    className="btn btn-secondary px-6 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-200 px-8 rounded-xl font-bold flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
                                >
                                    <Wrench className="w-5 h-5" /> Registrar Ingreso
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Iniciar Mantenimiento (Para Preventivos Pendientes) */}
            {showIniciarModal && selectedMantenimiento && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scaleIn overflow-hidden">
                        <div className="modal-header-create">
                            <div className="flex items-center gap-3">
                                <div className="modal-icon-create">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">Iniciar Mantenimiento</h3>
                            </div>
                            <button onClick={() => setShowIniciarModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleIniciar}>
                            <div className="modal-body p-6 space-y-6">
                                <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col items-center text-center gap-2">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                                        <Wrench className="w-6 h-6" />
                                    </div>
                                    <h4 className="font-bold text-indigo-900 text-lg">{selectedMantenimiento.vehiculo?.placa}</h4>
                                    <p className="text-sm text-indigo-700">
                                        Se cambiará el estado del vehículo a <strong>EN MANTENIMIENTO</strong>.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Taller Asignado <span className="text-rose-500">*</span></label>
                                    <input
                                        required
                                        type="text"
                                        className="form-input w-full bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                        value={iniciarForm.taller}
                                        onChange={e => setIniciarForm({ taller: e.target.value })}
                                        placeholder="Ingrese nombre del taller..."
                                    />
                                </div>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3">
                                <button type="button" onClick={() => setShowIniciarModal(false)} className="btn btn-secondary px-6 rounded-xl font-medium">Cancelar</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-200 px-8 rounded-xl font-bold flex items-center gap-2"
                                >
                                    <Play className="w-5 h-5" /> Confirmar Inicio
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Completar Mantenimiento */}
            {showCompletarModal && selectedMantenimiento && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className="modal-header-success">
                            <div className="flex items-center gap-3">
                                <div className="modal-icon-success">
                                    <CheckCircle className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Finalizar Mantenimiento</h3>
                                    <p className="text-sm text-slate-500">Registro de costos y liberación del vehículo</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCompletarModal(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleCompletar}>
                            <div className="modal-body p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col items-center text-center">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-white px-3 py-1 rounded-full text-xs font-bold text-emerald-600 border border-emerald-100 shadow-sm">
                                            {selectedMantenimiento.vehiculo?.placa}
                                        </span>
                                        <span className="text-slate-400 text-sm">➔</span>
                                        <span className="bg-emerald-100 px-3 py-1 rounded-full text-xs font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                                            DISPONIBLE / EN RUTA
                                        </span>
                                    </div>
                                    <p className="text-sm text-emerald-800 font-medium">
                                        El vehículo volverá a estar operativo tras completar este registro.
                                    </p>
                                </div>

                                <div className="space-y-4 md:col-span-2">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Taller Realizador <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="text"
                                                className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={completarForm.taller}
                                                onChange={e => setCompletarForm({ ...completarForm, taller: e.target.value })}
                                            />
                                            <Wrench className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Mano de Obra ($) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-bold text-slate-700"
                                                value={completarForm.costoManoObra}
                                                onChange={e => setCompletarForm({ ...completarForm, costoManoObra: e.target.value })}
                                                placeholder="0.00"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Refacciones ($) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-bold text-slate-700"
                                                value={completarForm.costoRepuestos}
                                                onChange={e => setCompletarForm({ ...completarForm, costoRepuestos: e.target.value })}
                                                placeholder="0.00"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Km Final del Vehículo</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-medium"
                                                value={completarForm.kilometrajeAlMomento}
                                                onChange={e => setCompletarForm({ ...completarForm, kilometrajeAlMomento: e.target.value })}
                                                placeholder="Lectura actual del odómetro"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-wider">KM</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Próximo Mantenimiento (Km)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-medium"
                                                value={completarForm.proximoKilometraje}
                                                onChange={e => setCompletarForm({ ...completarForm, proximoKilometraje: e.target.value })}
                                                placeholder="Opcional"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-wider">KM</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción del Trabajo Realizado</label>
                                        <textarea
                                            className="form-textarea w-full bg-slate-50 border-slate-200 focus:bg-white rounded-xl resize-none"
                                            rows={2}
                                            value={completarForm.descripcion}
                                            onChange={e => setCompletarForm({ ...completarForm, descripcion: e.target.value })}
                                            placeholder="Detalle de las reparaciones, repuestos cambiados, etc."
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <FileUpload
                                        file={completarForm.archivo}
                                        onChange={(file) => setCompletarForm({ ...completarForm, archivo: file })}
                                        label="Comprobante / Factura"
                                        accept="image/*,application/pdf"
                                        hint="PDF o Imagen"
                                        showPreview
                                    />
                                </div>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3 z-10 relative">
                                <button type="button" onClick={() => setShowCompletarModal(false)} className="btn btn-secondary px-6 rounded-xl font-medium">Cancelar</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-8 rounded-xl font-bold flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
                                >
                                    <CheckCircle className="w-5 h-5" /> Completar Mantenimiento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Mantenimientos;
