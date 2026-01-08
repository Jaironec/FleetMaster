import { useState, useEffect } from 'react';
import { materialService } from '../services/api';
import { toast } from 'react-hot-toast';
import type { Material } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import {
    Plus, Search, Edit2, Trash2, X, Package, AlertTriangle, Scale, CheckSquare
} from 'lucide-react';

const Materiales = () => {
    const { canWrite } = useAuth();
    const [materiales, setMateriales] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [seleccionado, setSeleccionado] = useState<Material | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<number | null>(null);

    const formInicial = { nombre: '', unidadMedida: '', esPeligroso: false, descripcion: '' };
    const [formData, setFormData] = useState(formInicial);

    useEffect(() => { cargarMateriales(); }, [busqueda]);

    const cargarMateriales = async () => {
        try {
            setLoading(true);
            const data = await materialService.listar(busqueda ? { busqueda } : undefined);
            setMateriales(data.materiales || data.datos || []);
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar materiales'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (modoEdicion && seleccionado) {
                await materialService.actualizar(seleccionado.id, formData);
                toast.success('Material actualizado');
            } else {
                await materialService.crear(formData);
                toast.success('Material creado');
            }
            setModalOpen(false);
            cargarMateriales();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al guardar'));
        }
    };

    const confirmarEliminacion = (id: number) => {
        setMaterialToDelete(id);
        setShowDeleteModal(true);
    };

    const eliminar = async () => {
        if (!materialToDelete) return;
        try {
            await materialService.eliminar(materialToDelete);
            toast.success('Eliminado');
            cargarMateriales();
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al eliminar'));
        } finally {
            setMaterialToDelete(null);
        }
    };

    const abrirModal = (item?: Material) => {
        if (item) {
            setModoEdicion(true);
            setSeleccionado(item);
            setFormData({
                nombre: item.nombre,
                unidadMedida: item.unidadMedida,
                esPeligroso: item.esPeligroso,
                descripcion: item.descripcion || ''
            });
        } else {
            setModoEdicion(false);
            setSeleccionado(null);
            setFormData(formInicial);
        }
        setModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            {/* Header & Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Catálogo de Materiales</h1>
                    <p className="text-slate-500 mt-2 text-lg">Define los tipos de carga y sus características.</p>
                </div>

                <div className="flex flex-col md:flex-row gap-3 items-center w-full md:w-auto">
                    <div className="w-full md:w-96 relative">
                        <input
                            type="text"
                            placeholder="Buscar material..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
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
                            <span className="font-bold">Agregar Material</span>
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <TableSkeleton rows={5} columns={4} />
            ) : materiales.length === 0 ? (
                <EmptyState
                    type={busqueda ? 'search' : 'materiales'}
                    onAction={busqueda ? () => setBusqueda('') : () => abrirModal()}
                    showAction={Boolean(busqueda) || canWrite}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Nombre</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Unidad</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Tipo Carga</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {materiales.map((m) => (
                                    <tr key={m.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100"><Package className="h-4 w-4 text-amber-600" /></div>
                                                <div>
                                                    <span className="font-bold text-slate-800 text-base">{m.nombre}</span>
                                                    {m.descripcion && <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{m.descripcion}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4"><span className="font-mono text-xs bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 lowercase border border-slate-200 font-bold">{m.unidadMedida}</span></td>
                                        <td className="px-6 py-4">
                                            {m.esPeligroso ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-100">
                                                    <AlertTriangle className="h-3 w-3 mr-1.5" /> Peligroso
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                    Estándar
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {canWrite && (
                                                <div className="flex justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200">
                                                    <button onClick={() => abrirModal(m)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 rounded-lg transition-all shadow-sm" title="Editar">
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => confirmarEliminacion(m.id)} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 rounded-lg transition-all shadow-sm" title="Eliminar">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
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
                    <div className="modal-content bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all">
                        <div className={modoEdicion ? 'modal-header-edit' : 'modal-header-create'}>
                            <div className="flex items-center gap-3">
                                <div className={modoEdicion ? 'modal-icon-edit' : 'modal-icon-create'}>
                                    {modoEdicion ? <Edit2 className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{modoEdicion ? 'Editar Material' : 'Nuevo Material'}</h3>
                                    <p className="text-sm text-slate-500">{modoEdicion ? 'Modifica los detalles del material' : 'Registra un nuevo tipo de carga'}</p>
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
                            <div className="modal-body p-8 space-y-5">
                                <div className="form-group">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Nombre del Material <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            required
                                            className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            placeholder="Ej. Cemento, Arena, etc."
                                        />
                                        <Package className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Unidad de Medida <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <input
                                            required
                                            className="form-input w-full pr-10 pl-4 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl lowercase"
                                            placeholder="Ej. litros, kg, toneladas"
                                            value={formData.unidadMedida}
                                            onChange={e => setFormData({ ...formData, unidadMedida: e.target.value })}
                                        />
                                        <Scale className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                    </div>
                                </div>

                                <div
                                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${formData.esPeligroso ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                                    onClick={() => setFormData({ ...formData, esPeligroso: !formData.esPeligroso })}
                                >
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${formData.esPeligroso ? 'bg-red-500 border-red-500 text-white' : 'border-slate-300 bg-white'}`}>
                                        {formData.esPeligroso && <CheckSquare className="w-4 h-4" />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold text-sm ${formData.esPeligroso ? 'text-red-700' : 'text-slate-700'}`}>Material Peligroso</p>
                                        <p className="text-xs text-slate-500">Marca esta casilla si el material requiere manejo especial o permisos.</p>
                                    </div>
                                    {formData.esPeligroso && <AlertTriangle className="h-5 w-5 text-red-500" />}
                                </div>

                                <div className="form-group">
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Descripción (Opcional)</label>
                                    <textarea
                                        className="form-input w-full p-4 bg-slate-50 border-slate-200 focus:bg-white rounded-xl resize-none"
                                        rows={3}
                                        value={formData.descripcion}
                                        onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                        placeholder="Detalles adicionales sobre el material..."
                                    />
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
                                    {modoEdicion ? 'Guardar Cambios' : 'Guardar Material'}
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
                onConfirm={eliminar}
                title="Eliminar Material"
                message="¿Estás seguro de que deseas eliminar este material? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
            />
        </div>
    );
};

export default Materiales;
