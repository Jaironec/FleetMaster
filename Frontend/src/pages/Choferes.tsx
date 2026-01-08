import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { choferService } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import type { Chofer, CrearChoferDTO, EstadoChofer, ModalidadPago, MetodoPago } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import ConfirmModal from '../components/ConfirmModal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import {
    Plus,
    Search,
    Edit2,
    Filter,
    Trash2,
    Eye,
    X,
    User,
    Phone,
    CreditCard,
    Truck,
    Mail,
    FileText,
    Building,
    Banknote,
    DollarSign
} from 'lucide-react';

const Choferes = () => {
    const { canWrite } = useAuth();
    const location = useLocation();
    const [choferes, setChoferes] = useState<Chofer[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [choferSeleccionado, setChoferSeleccionado] = useState<Chofer | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [choferToDelete, setChoferToDelete] = useState<number | null>(null);
    const navigate = useNavigate();

    const formInicial = {
        nombres: '', apellidos: '', documentoId: '',
        telefono: '', correo: '', estado: 'ACTIVO',
        fechaVencimientoLicencia: '',
        modalidadPago: 'POR_VIAJE', metodoPago: 'EFECTIVO',
        banco: '', numeroCuenta: '', sueldoMensual: 0,
        fechaContratacion: '', pagoQuincenal: false
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarChoferes(); }, [filtros]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('action') === 'new') {
            abrirModal();
        }
    }, [location.search]);

    const cargarChoferes = async () => {
        try {
            setLoading(true);
            const response = await choferService.listar({
                busqueda: filtros.busqueda || undefined,
                estado: filtros.estado || undefined
            });
            setChoferes(response.datos || []);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar choferes'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const datos: CrearChoferDTO = {
                nombres: formData.nombres,
                apellidos: formData.apellidos,
                documentoId: formData.documentoId,
                telefono: formData.telefono || undefined,
                correo: formData.correo || undefined,
                estado: formData.estado as EstadoChofer,
                fechaVencimientoLicencia: formData.fechaVencimientoLicencia || undefined,
                modalidadPago: formData.modalidadPago as ModalidadPago,
                metodoPago: formData.metodoPago as MetodoPago,
                banco: formData.banco || undefined,
                numeroCuenta: formData.numeroCuenta || undefined,
                sueldoMensual: Number(formData.sueldoMensual) || undefined,
                fechaContratacion: formData.fechaContratacion || undefined,
                pagoQuincenal: formData.pagoQuincenal
            };

            if (modoEdicion && choferSeleccionado) {
                await choferService.actualizar(choferSeleccionado.id, datos);
                toast.success('Chofer actualizado');
            } else {
                await choferService.crear(datos);
                toast.success('Chofer creado');
            }
            setModalOpen(false);
            cargarChoferes();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al guardar'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setChoferToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarChofer = async () => {
        if (!choferToDelete) return;
        try {
            await choferService.eliminar(choferToDelete);
            toast.success('Chofer eliminado');
            cargarChoferes();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al eliminar'));
        } finally {
            setChoferToDelete(null);
        }
    };

    const abrirModal = (chofer?: Chofer) => {
        if (chofer) {
            setModoEdicion(true);
            setChoferSeleccionado(chofer);
            // Normalizar campos opcionales para evitar undefined
            setFormData({
                nombres: chofer.nombres,
                apellidos: chofer.apellidos,
                documentoId: chofer.documentoId,
                telefono: chofer.telefono || '',
                correo: chofer.correo || '',
                estado: chofer.estado,
                fechaVencimientoLicencia: chofer.fechaVencimientoLicencia || '',
                modalidadPago: chofer.modalidadPago,
                metodoPago: chofer.metodoPago,
                banco: chofer.banco || '',
                numeroCuenta: chofer.numeroCuenta || '',
                sueldoMensual: chofer.sueldoMensual || 0,
                fechaContratacion: chofer.fechaContratacion ? new Date(chofer.fechaContratacion).toISOString().split('T')[0] : '',
                pagoQuincenal: chofer.pagoQuincenal
            });
        } else {
            setModoEdicion(false);
            setChoferSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            {/* Header & Actions Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gestión de Choferes</h1>
                    <p className="text-slate-500 mt-2 text-lg">Administra el equipo de conductores y sus pagos.</p>
                </div>
                {canWrite && (
                    <button
                        onClick={() => abrirModal()}
                        className="btn btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 px-6 py-3 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Chofer</span>
                    </button>
                )}
            </div>

            {/* Filtros / Action Toolbar */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="w-full md:w-96 relative">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o documento..."
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
                        <option value="INACTIVO">Inactivo</option>
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                </div>
            </div>

            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : choferes.length === 0 ? (
                <EmptyState
                    type={filtros.busqueda ? 'search' : 'choferes'}
                    onAction={filtros.busqueda ? () => setFiltros({ busqueda: '', estado: '' }) : () => abrirModal()}
                    showAction={Boolean(filtros.busqueda) || canWrite}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Chofer</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Documento</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Contacto</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Pago</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {choferes.map((c: any) => (
                                    <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-base">{c.nombres} {c.apellidos}</p>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Conductor</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200 font-bold">{c.documentoId}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                {c.telefono && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                                        <Phone className="h-3 w-3 text-slate-400" />
                                                        <span className="font-medium">{c.telefono}</span>
                                                    </div>
                                                )}
                                                {c.correo && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                                        <Mail className="h-3 w-3 text-slate-400" />
                                                        <span className="truncate max-w-[150px]" title={c.correo}>{c.correo}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                    {c.modalidadPago.replace('_', ' ')}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                                                    <CreditCard className="h-3 w-3 text-slate-400" />
                                                    <span className="font-medium">{c.metodoPago}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${c.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${c.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                                                {c.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                                                <button onClick={() => navigate(`/choferes/${c.id}`)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm" title="Ver Detalle Económico">
                                                    <Eye className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => navigate(`/viajes?choferId=${c.id}`)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 rounded-lg transition-all shadow-sm" title="Ver Viajes">
                                                    <Truck className="h-4 w-4" />
                                                </button>
                                                {canWrite && (
                                                    <>
                                                        <button onClick={() => abrirModal(c)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-all shadow-sm" title="Editar">
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button onClick={() => confirmarEliminacion(c.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all shadow-sm" title="Eliminar">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Table Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Mostrando <strong>{choferes.length}</strong> chofer(es)</span>
                        <span>Última actualización: {new Date().toLocaleTimeString('es-EC')}</span>
                    </div>
                </div>
            )}

            {
                modalOpen && (
                    <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                        <div className="modal-content bg-white w-full max-w-3xl rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                            <div className={modoEdicion ? 'modal-header-edit' : 'modal-header-create'}>
                                <div className="flex items-center gap-3">
                                    <div className={modoEdicion ? 'modal-icon-edit' : 'modal-icon-create'}>
                                        {modoEdicion ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800">{modoEdicion ? 'Editar Chofer' : 'Registrar Nuevo Chofer'}</h3>
                                        <p className="text-sm text-slate-500">{modoEdicion ? 'Modifica los datos del conductor' : 'Ingresa la información personal y de pago'}</p>
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
                                        {/* Sección: Información Personal */}
                                        <div className="md:col-span-2 pb-2 border-b border-slate-100 mb-2">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <User className="w-4 h-4" /> Información Personal
                                            </h4>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombres <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    placeholder="Ej. Juan Carlos"
                                                    value={formData.nombres}
                                                    onChange={e => setFormData({ ...formData, nombres: e.target.value })}
                                                />
                                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Apellidos <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    placeholder="Ej. Pérez López"
                                                    value={formData.apellidos}
                                                    onChange={e => setFormData({ ...formData, apellidos: e.target.value })}
                                                />
                                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Documento ID <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-mono"
                                                    placeholder="1712345678"
                                                    value={formData.documentoId}
                                                    onChange={e => setFormData({ ...formData, documentoId: e.target.value })}
                                                />
                                                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
                                            <div className="relative">
                                                <input
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    placeholder="0991234567"
                                                    value={formData.telefono}
                                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                                />
                                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo (Opcional)</label>
                                            <div className="relative">
                                                <input
                                                    type="email"
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    placeholder="ejemplo@correo.com"
                                                    value={formData.correo}
                                                    onChange={e => setFormData({ ...formData, correo: e.target.value })}
                                                />
                                                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
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
                                                    <option value="INACTIVO">Inactivo</option>
                                                </select>
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▼</span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Vencimiento Licencia</label>
                                            <div className="relative">
                                                <input
                                                    type="date"
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl cursor-pointer"
                                                    value={formData.fechaVencimientoLicencia ? formData.fechaVencimientoLicencia.split('T')[0] : ''}
                                                    onChange={e => setFormData({ ...formData, fechaVencimientoLicencia: e.target.value })}
                                                />
                                                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">El sistema alertará 30 días antes del vencimiento</p>
                                        </div>

                                        {/* Sección: Información de Pago */}
                                        <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                                                <Banknote className="w-4 h-4" /> Información Financiera
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="form-group">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Modalidad de Pago</label>
                                                    <div className="relative">
                                                        <select
                                                            className="form-select w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl appearance-none"
                                                            value={formData.modalidadPago}
                                                            onChange={e => setFormData({ ...formData, modalidadPago: e.target.value })}
                                                        >
                                                            <option value="POR_VIAJE">Por Viaje (Comisión/Flete)</option>
                                                            <option value="MENSUAL">Sueldo Mensual</option>
                                                        </select>
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▼</span>
                                                    </div>
                                                </div>

                                                <div className="form-group">
                                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Método de Pago</label>
                                                    <div className="relative">
                                                        <select
                                                            className="form-select w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl appearance-none"
                                                            value={formData.metodoPago}
                                                            onChange={e => setFormData({ ...formData, metodoPago: e.target.value })}
                                                        >
                                                            <option value="EFECTIVO">Efectivo</option>
                                                            <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                                        </select>
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">▼</span>
                                                    </div>
                                                </div>

                                                {formData.metodoPago === 'TRANSFERENCIA' && (
                                                    <>
                                                        <div className="form-group">
                                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Banco</label>
                                                            <div className="relative">
                                                                <input
                                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                                    placeholder="Ej. Pichincha"
                                                                    value={formData.banco}
                                                                    onChange={e => setFormData({ ...formData, banco: e.target.value })}
                                                                />
                                                                <Building className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">N° Cuenta</label>
                                                            <div className="relative">
                                                                <input
                                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-mono"
                                                                    placeholder="2200123123"
                                                                    value={formData.numeroCuenta}
                                                                    onChange={e => setFormData({ ...formData, numeroCuenta: e.target.value })}
                                                                />
                                                                <Banknote className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}

                                                {formData.modalidadPago === 'MENSUAL' && (
                                                    <>
                                                        <div className="form-group">
                                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                                                Sueldo Mensual <span className="text-rose-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    step="0.01"
                                                                    required
                                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-bold text-emerald-600"
                                                                    value={formData.sueldoMensual || ''}
                                                                    onChange={e => setFormData({ ...formData, sueldoMensual: parseFloat(e.target.value) || 0 })}
                                                                    placeholder="Ej: 500.00"
                                                                />
                                                                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 pointer-events-none" />
                                                            </div>
                                                        </div>

                                                        <div className="form-group">
                                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                                                Fecha de Contratación <span className="text-rose-500">*</span>
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl cursor-pointer"
                                                                    value={formData.fechaContratacion || ''}
                                                                    onChange={e => setFormData({ ...formData, fechaContratacion: e.target.value })}
                                                                />
                                                                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1">El pago se generará 3 días antes de este día cada mes</p>
                                                        </div>

                                                        <div className="form-group md:col-span-2">
                                                            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-4 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                                    checked={formData.pagoQuincenal || false}
                                                                    onChange={e => setFormData({ ...formData, pagoQuincenal: e.target.checked })}
                                                                />
                                                                <div>
                                                                    <span className="text-sm font-bold text-slate-700">Pago Quincenal</span>
                                                                    <p className="text-xs text-slate-500">Se generará un pago adicional el día 15 de cada mes (50% del sueldo)</p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
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
                                        {modoEdicion ? 'Guardar Cambios' : 'Guardar Chofer'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal de confirmación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarChofer}
                title="Eliminar Chofer"
                message="¿Estás seguro de que deseas eliminar este chofer? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div >
    );
};

export default Choferes;
