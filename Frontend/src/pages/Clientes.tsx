import { useState, useEffect } from 'react';
import { clienteService } from '../services/api';
import { toast } from 'react-hot-toast';
import type { Cliente, EstadoCliente } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Edit2, Trash2, X, BriefcaseBusiness, MapPin, Truck, BarChart3,
    Phone, Mail, FileText
} from 'lucide-react';

const Clientes = () => {
    const { canWrite } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: '' });
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [clienteToDelete, setClienteToDelete] = useState<number | null>(null);
    const navigate = useNavigate();

    const formInicial = {
        nombreRazonSocial: '', documentoId: '',
        telefono: '', correo: '', direccion: '', sector: '', estado: 'ACTIVO'
    };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarClientes(); }, [filtros]);

    const cargarClientes = async () => {
        try {
            setLoading(true);
            const data = await clienteService.listar(filtros.busqueda ? { busqueda: filtros.busqueda } : undefined);
            setClientes(data.datos || []);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar clientes'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && clienteSeleccionado) {
                await clienteService.actualizar(clienteSeleccionado.id, {
                    ...formData,
                    estado: formData.estado as EstadoCliente
                });
                toast.success('Cliente actualizado');
            } else {
                await clienteService.crear({
                    ...formData,
                    estado: formData.estado as EstadoCliente
                });
                toast.success('Cliente creado');
            }
            setModalOpen(false);
            cargarClientes();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al guardar'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setClienteToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminarCliente = async () => {
        if (!clienteToDelete) return;
        try {
            await clienteService.eliminar(clienteToDelete);
            toast.success('Cliente eliminado');
            cargarClientes();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al eliminar'));
        } finally {
            setClienteToDelete(null);
        }
    };

    const abrirModal = (cliente?: Cliente) => {
        if (cliente) {
            setModoEdicion(true);
            setClienteSeleccionado(cliente);
            setFormData({
                nombreRazonSocial: cliente.nombreRazonSocial,
                documentoId: cliente.documentoId,
                telefono: cliente.telefono || '',
                correo: cliente.correo || '',
                direccion: cliente.direccion || '',
                sector: cliente.sector || '',
                estado: cliente.estado || 'ACTIVO'
            });
        } else {
            setModoEdicion(false);
            setClienteSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            {/* Page Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cartera de Clientes</h1>
                    <p className="text-slate-500 mt-2 text-lg">Gestiona información de tus clientes y puntos de llegada.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    {/* Search Toolbar */}
                    <div className="w-full md:w-96 relative">
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o RUC..."
                            value={filtros.busqueda}
                            onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                            className="form-input w-full pr-10 pl-4 bg-white border-slate-200 focus:bg-white h-12 rounded-xl shadow-sm"
                        />
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                    </div>

                    {canWrite && (
                        <button
                            onClick={() => abrirModal()}
                            className="btn btn-primary bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-indigo-200 px-6 py-3 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all duration-200 whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-bold">Nuevo Cliente</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <TableSkeleton rows={5} columns={5} />
            ) : clientes.length === 0 ? (
                <EmptyState
                    type={filtros.busqueda ? 'search' : 'clientes'}
                    onAction={filtros.busqueda ? () => setFiltros({ busqueda: '', estado: '' }) : () => abrirModal()}
                    showAction={Boolean(filtros.busqueda) || canWrite}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Cliente / Razón Social</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Documento</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Ubicación</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clientes.map((c) => (
                                    <tr key={c.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100"><BriefcaseBusiness className="h-4 w-4 text-indigo-600" /></div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-base">{c.nombreRazonSocial}</p>
                                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                                                        <MapPin className="h-3 w-3" />
                                                        {c.sector || 'Sector no especificado'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200 font-bold">{c.documentoId}</span></td>
                                        <td className="px-6 py-4">
                                            {c.direccion ? (
                                                <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-[200px]" title={c.direccion}>
                                                    <MapPin className="h-3 w-3 mt-0.5 text-slate-400 shrink-0" /> <span className="truncate">{c.direccion}</span>
                                                </div>
                                            ) : <span className="text-xs text-slate-400 italic">No registrada</span>}
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
                                                <button onClick={() => navigate(`/viajes?clienteId=${c.id}`)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-lg transition-all shadow-sm" title="Ver Viajes">
                                                    <Truck className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => navigate(`/reportes?tab=CLIENTES&id=${c.id}`)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 rounded-lg transition-all shadow-sm" title="Ver Reporte">
                                                    <BarChart3 className="h-4 w-4" />
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
                </div>
            )}

            {modalOpen && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className={modoEdicion ? 'modal-header-edit' : 'modal-header-create'}>
                            <div className="flex items-center gap-3">
                                <div className={modoEdicion ? 'modal-icon-edit' : 'modal-icon-create'}>
                                    {modoEdicion ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{modoEdicion ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
                                    <p className="text-sm text-slate-500">{modoEdicion ? 'Modifica los datos de la empresa' : 'Ingresa la información comercial'}</p>
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
                                <div className="grid grid-cols-1 gap-6">
                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre / Razón Social <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                required
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={formData.nombreRazonSocial}
                                                onChange={e => setFormData({ ...formData, nombreRazonSocial: e.target.value })}
                                                placeholder="Ej. Empresa ABC S.A."
                                            />
                                            <BriefcaseBusiness className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Documento ID <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <input
                                                    required
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-mono"
                                                    value={formData.documentoId}
                                                    onChange={e => setFormData({ ...formData, documentoId: e.target.value })}
                                                    placeholder="RUC o Cédula"
                                                />
                                                <FileText className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Teléfono</label>
                                            <div className="relative">
                                                <input
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    value={formData.telefono}
                                                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                                    placeholder="099..."
                                                />
                                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Correo Electrónico</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={formData.correo}
                                                onChange={e => setFormData({ ...formData, correo: e.target.value })}
                                                placeholder="contacto@empresa.com"
                                            />
                                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Dirección</label>
                                        <div className="relative">
                                            <input
                                                className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={formData.direccion}
                                                onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                                                placeholder="Av. Principal y Calle Secundaria"
                                            />
                                            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="form-group">
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Sector</label>
                                            <div className="relative">
                                                <input
                                                    className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                    value={formData.sector}
                                                    onChange={e => setFormData({ ...formData, sector: e.target.value })}
                                                    placeholder="Ej. Norte, Centro"
                                                />
                                                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
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
                                    {modoEdicion ? 'Guardar Cambios' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de confirmación */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={eliminarCliente}
                title="Eliminar Cliente"
                message="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Clientes;
