import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vehiculoService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import type { Vehiculo, CrearVehiculoDTO, EstadoVehiculo } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import ConfirmModal from '../components/ConfirmModal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import {
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    Eye,
    X,
    CheckCircle,
    AlertTriangle,
    Calendar,
    Truck,
    Activity
} from 'lucide-react';

const Vehiculos = () => {
    const { canWrite } = useAuth();
    const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
    const [detalleOpen, setDetalleOpen] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [vehiculoToDelete, setVehiculoToDelete] = useState<number | null>(null);
    const navigate = useNavigate();

    // Formulario inicial
    const formInicial = {
        placa: '', marca: '', modelo: '', anio: new Date().getFullYear(),
        tipo: '', capacidad: '', estado: 'ACTIVO', kilometrajeActual: 0 as string | number,
        observaciones: '',
        fechaUltimoMantenimiento: '', fechaProximoMantenimiento: '',
        fechaVencimientoSoat: '', fechaVencimientoSeguro: '', fechaVencimientoMatricula: ''
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => {
        cargarVehiculos();
    }, [filtros]);

    const cargarVehiculos = async () => {
        try {
            setLoading(true);
            const response = await vehiculoService.listar({
                busqueda: filtros.busqueda || undefined,
                estado: (filtros.estado as EstadoVehiculo) || undefined
            });
            setVehiculos(response.datos || []);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar vehículos'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const datos: CrearVehiculoDTO = {
                placa: formData.placa,
                marca: formData.marca,
                modelo: formData.modelo,
                anio: Number(formData.anio),
                tipo: formData.tipo,
                capacidad: formData.capacidad,
                estado: formData.estado as EstadoVehiculo,
                kilometrajeActual: Number(formData.kilometrajeActual),
                fechaVencimientoSoat: formData.fechaVencimientoSoat || undefined,
                fechaVencimientoSeguro: formData.fechaVencimientoSeguro || undefined,
                fechaVencimientoMatricula: formData.fechaVencimientoMatricula || undefined,
                observaciones: formData.observaciones || undefined
            };

            if (modoEdicion && vehiculoSeleccionado) {
                await vehiculoService.actualizar(vehiculoSeleccionado.id, datos);
                toast.success('Vehículo actualizado');
            } else {
                await vehiculoService.crear(datos);
                toast.success('Vehículo creado');
            }
            setModalOpen(false);
            cargarVehiculos();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al guardar'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setVehiculoToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarVehiculo = async () => {
        if (!vehiculoToDelete) return;
        try {
            await vehiculoService.eliminar(vehiculoToDelete);
            toast.success('Vehículo eliminado');
            cargarVehiculos();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al eliminar'));
        } finally {
            setVehiculoToDelete(null);
        }
    };

    const abrirModal = (vehiculo?: Vehiculo) => {
        if (vehiculo) {
            setModoEdicion(true);
            setVehiculoSeleccionado(vehiculo);
            // Normalizar campos opcionales para evitar undefined
            setFormData({
                placa: vehiculo.placa,
                marca: vehiculo.marca,
                modelo: vehiculo.modelo,
                anio: vehiculo.anio,
                tipo: vehiculo.tipo,
                capacidad: vehiculo.capacidad,
                estado: vehiculo.estado,
                kilometrajeActual: vehiculo.kilometrajeActual,
                observaciones: vehiculo.observaciones || '',
                fechaUltimoMantenimiento: vehiculo.fechaUltimoMantenimiento?.split('T')[0] || '',
                fechaProximoMantenimiento: vehiculo.fechaProximoMantenimiento?.split('T')[0] || '',
                fechaVencimientoSoat: vehiculo.fechaVencimientoSoat?.split('T')[0] || '',
                fechaVencimientoSeguro: vehiculo.fechaVencimientoSeguro?.split('T')[0] || '',
                fechaVencimientoMatricula: vehiculo.fechaVencimientoMatricula?.split('T')[0] || ''
            });
        } else {
            setModoEdicion(false);
            setVehiculoSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    const abrirDetalle = (vehiculo: any) => {
        setVehiculoSeleccionado(vehiculo);
        setDetalleOpen(true);
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            {/* Header & Actions Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Vehículos</h1>
                    <p className="text-slate-500 mt-2 text-lg">Administra la flota de transporte de la empresa.</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => abrirModal()}
                        className="btn btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 px-6 py-3 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Vehículo</span>
                    </button>
                )}
            </div>

            {/* Filtros / Action Toolbar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-96 relative">
                    <input
                        type="text"
                        placeholder="Buscar placa, marca o modelo..."
                        value={filtros.busqueda}
                        onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                        className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>

                <div className="w-full md:w-64 relative">
                    <select
                        className="form-select w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl appearance-none"
                        value={filtros.estado}
                        onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                    >
                        <option value="">Todos los Estados</option>
                        <option value="ACTIVO">Activo</option>
                        <option value="EN_RUTA">En Ruta</option>
                        <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                        <option value="INACTIVO">Inactivo</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>
            </div>

            {/* Tabla */}
            {loading ? (
                <TableSkeleton rows={5} columns={5} />
            ) : vehiculos.length === 0 ? (
                <EmptyState
                    type={filtros.busqueda ? 'search' : 'vehiculos'}
                    onAction={filtros.busqueda ? () => setFiltros({ busqueda: '', estado: '' }) : () => abrirModal()}
                    showAction={Boolean(filtros.busqueda) || canWrite}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Placa</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Vehículo</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Tipo/Capacidad</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Documentos</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {vehiculos.map((v: any) => {
                                    // Verificar estado de documentos
                                    const hoy = new Date();
                                    const dias30 = 30 * 24 * 60 * 60 * 1000;

                                    const soatVencido = v.fechaVencimientoSoat && new Date(v.fechaVencimientoSoat) < hoy;
                                    const soatPorVencer = v.fechaVencimientoSoat && new Date(v.fechaVencimientoSoat) < new Date(hoy.getTime() + dias30) && !soatVencido;

                                    const seguroVencido = v.fechaVencimientoSeguro && new Date(v.fechaVencimientoSeguro) < hoy;
                                    const seguroPorVencer = v.fechaVencimientoSeguro && new Date(v.fechaVencimientoSeguro) < new Date(hoy.getTime() + dias30) && !seguroVencido;

                                    const matriculaVencida = v.fechaVencimientoMatricula && new Date(v.fechaVencimientoMatricula) < hoy;
                                    const matriculaPorVencer = v.fechaVencimientoMatricula && new Date(v.fechaVencimientoMatricula) < new Date(hoy.getTime() + dias30) && !matriculaVencida;

                                    return (
                                        <tr key={v.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                        <Truck className="h-4 w-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-800 font-mono text-base">{v.placa}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold text-sm">{v.marca} {v.modelo}</span>
                                                    <span className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded-full w-fit mt-1 font-medium">{v.anio}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="capitalize text-sm font-semibold text-slate-700">{v.tipo}</span>
                                                    <span className="text-xs text-slate-500">{v.capacidad}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${v.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    v.estado === 'EN_RUTA' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        v.estado === 'EN_MANTENIMIENTO' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full mr-2 ${v.estado === 'ACTIVO' ? 'bg-emerald-500' :
                                                        v.estado === 'EN_RUTA' ? 'bg-blue-500' :
                                                            v.estado === 'EN_MANTENIMIENTO' ? 'bg-amber-500' : 'bg-slate-400'
                                                        }`}></div>
                                                    {v.estado.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {/* SOAT */}
                                                    <span className={`cursor-help text-[10px] font-bold px-2 py-1 rounded-md border ${soatVencido ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        soatPorVencer ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`} title={`SOAT: ${v.fechaVencimientoSoat ? new Date(v.fechaVencimientoSoat).toLocaleDateString() : 'Sin fecha'}`}>
                                                        {soatVencido ? '⚠️ SOAT' : soatPorVencer ? '⏰ SOAT' : '✓ SOAT'}
                                                    </span>
                                                    {/* Seguro */}
                                                    <span className={`cursor-help text-[10px] font-bold px-2 py-1 rounded-md border ${seguroVencido ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        seguroPorVencer ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`} title={`Seguro: ${v.fechaVencimientoSeguro ? new Date(v.fechaVencimientoSeguro).toLocaleDateString() : 'Sin fecha'}`}>
                                                        {seguroVencido ? '⚠️ SEG' : seguroPorVencer ? '⏰ SEG' : '✓ SEG'}
                                                    </span>
                                                    {/* Matrícula */}
                                                    <span className={`cursor-help text-[10px] font-bold px-2 py-1 rounded-md border ${matriculaVencida ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        matriculaPorVencer ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                            'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`} title={`Matrícula: ${v.fechaVencimientoMatricula ? new Date(v.fechaVencimientoMatricula).toLocaleDateString() : 'Sin fecha'}`}>
                                                        {matriculaVencida ? '⚠️ MAT' : matriculaPorVencer ? '⏰ MAT' : '✓ MAT'}
                                                    </span>
                                                    {/* Mantenimiento por Km */}
                                                    <span className={`cursor-help text-[10px] font-bold px-2 py-1 rounded-md border ${v.mantenimientoVencido ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                        v.tieneMantenimientoPendiente ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            v.necesitaMantenimiento ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                                'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        }`} title={`Km actual: ${v.kilometrajeActual?.toLocaleString() || 0} | Próximo mant: ${v.proximoMantenimientoKm?.toLocaleString() || 5000} km`}>
                                                        {v.mantenimientoVencido ? `🔧 -${Math.abs(v.kmParaProximoMant || 0).toLocaleString()}` :
                                                            v.tieneMantenimientoPendiente ? '🔧 PENDIENTE' :
                                                                v.necesitaMantenimiento ? `🔧 ${v.kmParaProximoMant?.toLocaleString()} km` :
                                                                    '✓ MANT'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                                                    <button onClick={() => abrirDetalle(v)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm" title="Ver detalles">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    {canWrite && (
                                                        <>
                                                            <button onClick={() => abrirModal(v)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-all shadow-sm" title="Editar">
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button onClick={() => confirmarEliminacion(v.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all shadow-sm" title="Eliminar">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal Formulario */}
            {modalOpen && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-3xl rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className={modoEdicion ? 'modal-header-edit' : 'modal-header-create'}>
                            <div className="flex items-center gap-3">
                                <div className={modoEdicion ? 'modal-icon-edit' : 'modal-icon-create'}>
                                    {modoEdicion ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{modoEdicion ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}</h3>
                                    <p className="text-sm text-slate-500">{modoEdicion ? 'Modifica los datos del vehículo existente' : 'Ingresa la información para dar de alta'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setModalOpen(false); setFormData(formInicial); }}
                                className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="modal-body p-8 max-h-[70vh] overflow-y-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Sección: Información Básica */}
                                    <div className="md:col-span-2 pb-2 border-b border-slate-100 mb-2">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                            <Truck className="w-4 h-4" /> Información del Vehículo
                                        </h4>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Placa <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-mono"
                                                placeholder="AAA-1234"
                                                value={formData.placa}
                                                onChange={e => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 rounded text-slate-500 font-bold text-xs pointer-events-none">EC</div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Marca <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                placeholder="Ej. Chevrolet"
                                                value={formData.marca}
                                                onChange={e => setFormData({ ...formData, marca: e.target.value })}
                                            />
                                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Modelo <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                placeholder="Ej. NHR"
                                                value={formData.modelo}
                                                onChange={e => setFormData({ ...formData, modelo: e.target.value })}
                                            />
                                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Año <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                type="number"
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={formData.anio}
                                                onChange={e => setFormData({ ...formData, anio: parseInt(e.target.value) || 0 })}
                                            />
                                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Tipo <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                placeholder="Ej. Camión, Tracto"
                                                value={formData.tipo}
                                                onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                            />
                                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Capacidad <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                placeholder="Ej. 30 Toneladas"
                                                value={formData.capacidad}
                                                onChange={e => setFormData({ ...formData, capacidad: e.target.value })}
                                            />
                                            <Activity className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Estado</label>
                                        <div className="relative">
                                            <select
                                                className="form-select w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl appearance-none"
                                                value={formData.estado}
                                                onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                            >
                                                <option value="ACTIVO">Activo</option>
                                                <option value="EN_RUTA">En Ruta</option>
                                                <option value="EN_MANTENIMIENTO">En Mantenimiento</option>
                                                <option value="INACTIVO">Inactivo</option>
                                            </select>
                                            <Activity className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Km Actual</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                className="form-input w-full pr-16 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-bold"
                                                value={formData.kilometrajeActual}
                                                onChange={e => setFormData({ ...formData, kilometrajeActual: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">KM</span>
                                        </div>
                                    </div>

                                    {/* Sección: Vencimientos */}
                                    <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                                            <Calendar className="w-4 h-4" /> Vencimientos y Documentación
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="form-group">
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Vencimiento SOAT</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                        value={formData.fechaVencimientoSoat}
                                                        onChange={e => setFormData({ ...formData, fechaVencimientoSoat: e.target.value })}
                                                    />
                                                    <Calendar
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Vencimiento Seguro</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                        value={formData.fechaVencimientoSeguro}
                                                        onChange={e => setFormData({ ...formData, fechaVencimientoSeguro: e.target.value })}
                                                    />
                                                    <Calendar
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Vencimiento Matrícula</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                        value={formData.fechaVencimientoMatricula}
                                                        onChange={e => setFormData({ ...formData, fechaVencimientoMatricula: e.target.value })}
                                                    />
                                                    <Calendar
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="block text-sm font-bold text-slate-700 mb-1.5">Próximo Mantenimiento (Fecha)</label>
                                                <div className="relative">
                                                    <input
                                                        type="date"
                                                        className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                        value={formData.fechaProximoMantenimiento}
                                                        onChange={e => setFormData({ ...formData, fechaProximoMantenimiento: e.target.value })}
                                                    />
                                                    <Calendar
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-indigo-600 transition-colors"
                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 form-group pt-4">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Observaciones</label>
                                        <textarea
                                            className="form-textarea w-full bg-slate-50 border-slate-200 focus:bg-white rounded-xl resize-none"
                                            rows={3}
                                            value={formData.observaciones}
                                            onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                                            placeholder="Notas adicionales sobre el vehículo..."
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3 z-10 relative">
                                <button
                                    type="button"
                                    onClick={() => { setModalOpen(false); setFormData(formInicial); }}
                                    className="btn btn-secondary px-6 rounded-xl font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`btn btn-primary bg-gradient-to-r text-white shadow-lg px-8 rounded-xl font-bold flex items-center gap-2 transform hover:-translate-y-0.5 transition-all ${modoEdicion
                                        ? 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-200'
                                        : 'from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
                                        }`}
                                >
                                    {modoEdicion ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {modoEdicion ? 'Guardar Cambios' : 'Crear Vehículo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detalle */}
            {detalleOpen && vehiculoSeleccionado && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className="modal-header bg-gradient-to-r from-slate-50 to-indigo-50 border-b border-indigo-100 p-6 flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                    <Truck className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{vehiculoSeleccionado.placa}</h3>
                                    <p className="text-sm text-slate-500">{vehiculoSeleccionado.marca} {vehiculoSeleccionado.modelo} ({vehiculoSeleccionado.anio})</p>
                                </div>
                            </div>
                            <button onClick={() => setDetalleOpen(false)} className="text-slate-400 hover:text-rose-500 hover:bg-white/50 rounded-full p-2 transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="modal-body p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-3 flex items-center gap-1"><Activity className="w-3 h-3" /> General</h4>
                                    <ul className="space-y-3">
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">Tipo</span>
                                            <span className="font-medium text-slate-800">{vehiculoSeleccionado.tipo}</span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">Capacidad</span>
                                            <span className="font-medium text-slate-800">{vehiculoSeleccionado.capacidad}</span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">Kilometraje</span>
                                            <span className="font-bold text-indigo-600 text-lg">{vehiculoSeleccionado.kilometrajeActual?.toLocaleString()} <span className="text-sm font-normal">km</span></span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="border-l border-slate-100 pl-6">
                                    <h4 className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-3 flex items-center gap-1"><Calendar className="w-3 h-3" /> Vencimientos</h4>
                                    <ul className="space-y-3">
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">SOAT</span>
                                            <span className={`font-medium ${!vehiculoSeleccionado.fechaVencimientoSoat ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {vehiculoSeleccionado.fechaVencimientoSoat ? new Date(vehiculoSeleccionado.fechaVencimientoSoat).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">Seguro</span>
                                            <span className={`font-medium ${!vehiculoSeleccionado.fechaVencimientoSeguro ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {vehiculoSeleccionado.fechaVencimientoSeguro ? new Date(vehiculoSeleccionado.fechaVencimientoSeguro).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                        <li className="flex flex-col">
                                            <span className="text-xs text-slate-500">Matrícula</span>
                                            <span className={`font-medium ${!vehiculoSeleccionado.fechaVencimientoMatricula ? 'text-slate-400' : 'text-slate-800'}`}>
                                                {vehiculoSeleccionado.fechaVencimientoMatricula ? new Date(vehiculoSeleccionado.fechaVencimientoMatricula).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            {vehiculoSeleccionado.observaciones && (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h5 className="text-xs font-bold text-slate-500 uppercase mb-1">Notas</h5>
                                    <p className="text-sm text-slate-600 italic">{vehiculoSeleccionado.observaciones}</p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        setDetalleOpen(false);
                                        navigate(`/viajes?vehiculoId=${vehiculoSeleccionado.id}`);
                                    }}
                                    className="flex-1 btn btn-secondary text-xs flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all font-bold"
                                >
                                    Ver Historial Viajes
                                </button>
                                <button
                                    onClick={() => {
                                        setDetalleOpen(false);
                                        navigate(`/mantenimientos?vehiculoId=${vehiculoSeleccionado.id}`);
                                    }}
                                    className="flex-1 btn btn-secondary text-xs flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all font-bold"
                                >
                                    Ver Mantenimientos
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarVehiculo}
                title="Eliminar Vehículo"
                message={`¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer y se registrará en la auditoría del sistema.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Vehiculos;
