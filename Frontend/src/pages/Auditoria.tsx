import { useState, useEffect } from 'react';
import { auditoriaService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { Link } from 'react-router-dom';
import type { RegistroAuditoria } from '../types/api.types';
import {
    Clock,
    Shield,
    X,
    FileText,
    Search,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Filter,
    Lock
} from 'lucide-react';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';



interface Filtros {
    entidad: string;
    accion: string;
    desde: string;
    hasta: string;
}

interface Paginacion {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const Auditoria = () => {
    const { isAuditor } = useAuth();
    const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [entidades, setEntidades] = useState<string[]>([]);
    const [filtros, setFiltros] = useState<Filtros>({
        entidad: '',
        accion: '',
        desde: '',
        hasta: ''
    });
    const [paginacion, setPaginacion] = useState<Paginacion>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [modalOpen, setModalOpen] = useState(false);
    const [seleccionado, setSeleccionado] = useState<RegistroAuditoria | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    useEffect(() => {
        if (isAuditor) {
            cargarEntidades();
            cargarAuditoria();
        }
    }, [paginacion.page, isAuditor]);

    const cargarEntidades = async () => {
        try {
            const response = await auditoriaService.obtenerEntidades();
            if (response?.datos?.entidades && Array.isArray(response.datos.entidades)) {
                setEntidades(response.datos.entidades);
            }
        } catch (error) {
            console.error('Error al cargar entidades', error);
        }
    };

    const cargarAuditoria = async () => {
        try {
            setLoading(true);
            const params: Record<string, string | number> = {
                page: paginacion.page,
                limit: paginacion.limit
            };
            if (filtros.entidad) params.entidad = filtros.entidad;
            if (filtros.accion) params.accion = filtros.accion;
            if (filtros.desde) params.desde = filtros.desde;
            if (filtros.hasta) params.hasta = filtros.hasta;

            const response = await auditoriaService.listar(params);
            setRegistros(response.datos || []);
            setPaginacion(prev => ({
                ...prev,
                total: response.paginacion?.total || 0,
                totalPages: response.paginacion?.totalPaginas || 0
            }));
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar auditoría'));
        }
        finally { setLoading(false); }
    };

    const buscar = () => {
        setPaginacion(prev => ({ ...prev, page: 1 }));
        cargarAuditoria();
    };

    const verDetalle = async (registro: RegistroAuditoria) => {
        try {
            setLoadingDetalle(true);
            setModalOpen(true);
            const response = await auditoriaService.obtenerDetalle(registro.id);
            if (response.datos?.registro) {
                setSeleccionado(response.datos.registro);
            }
        } catch (error) {
            const err = error as ApiError;
            if (!wasToastShown(err)) toast.error(getErrorMessage(err, 'Error al cargar detalle'));
            setModalOpen(false);
        } finally {
            setLoadingDetalle(false);
        }
    };

    const irPagina = (nuevaPagina: number) => {
        if (nuevaPagina >= 1 && nuevaPagina <= paginacion.totalPages) {
            setPaginacion(prev => ({ ...prev, page: nuevaPagina }));
        }
    };

    const limpiarFiltros = () => {
        setFiltros({ entidad: '', accion: '', desde: '', hasta: '' });
        setPaginacion(prev => ({ ...prev, page: 1 }));
    };

    if (!isAuditor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
                <div className="bg-slate-100 p-6 rounded-full mb-6">
                    <Lock className="w-16 h-16 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso Restringido</h2>
                <p className="text-slate-500 max-w-md mb-8">
                    El módulo de auditoría es exclusivo para usuarios con rol de Auditor.
                    No tienes permisos para ver esta información.
                </p>
                <Link to="/" className="btn btn-primary bg-indigo-600 text-white px-6 py-2 rounded-xl">
                    Volver al Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="page-header bg-white p-8 rounded-3xl border border-slate-100 shadow-sm mb-8 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <Shield className="h-5 w-5 text-indigo-600" />
                        <span className="text-sm font-bold tracking-wider uppercase text-indigo-500">Centro de Control</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight mb-2 text-slate-800">
                        Registro de Auditoría
                    </h2>
                    <p className="text-slate-500 text-lg max-w-2xl">
                        Monitoreo completo de todas las acciones críticas, cambios y accesos realizados en el sistema en tiempo real.
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-5 w-5 text-indigo-500" />
                    <h3 className="font-bold text-slate-700">Filtros Avanzados</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl text-slate-700 font-medium"
                            value={filtros.entidad}
                            onChange={e => setFiltros({ ...filtros, entidad: e.target.value })}
                        >
                            <option value="">Todas las Entidades</option>
                            {entidades.length > 0 ? (
                                entidades.map(entidad => (
                                    <option key={entidad} value={entidad}>{entidad}</option>
                                ))
                            ) : (
                                <>
                                    <option value="Vehiculo">Vehiculo</option>
                                    <option value="Chofer">Chofer</option>
                                    <option value="Viaje">Viaje</option>
                                    <option value="Cliente">Cliente</option>
                                    <option value="Material">Material</option>
                                </>
                            )}
                        </select>
                    </div>

                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl text-slate-700 font-medium"
                            value={filtros.accion}
                            onChange={e => setFiltros({ ...filtros, accion: e.target.value })}
                        >
                            <option value="">Todas las Acciones</option>
                            <option value="CREAR">Creación</option>
                            <option value="EDITAR">Edición</option>
                            <option value="ELIMINAR">Eliminación</option>
                        </select>
                    </div>

                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                            placeholder="Desde"
                            value={filtros.desde}
                            onChange={e => setFiltros({ ...filtros, desde: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>

                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11 rounded-xl"
                            placeholder="Hasta"
                            value={filtros.hasta}
                            onChange={e => setFiltros({ ...filtros, hasta: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-indigo-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button onClick={buscar} className="btn btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 rounded-xl flex-1 flex items-center justify-center gap-2 font-bold transition-all hover:-translate-y-0.5">
                            <Search className="h-4 w-4" /> Buscar
                        </button>
                        <button onClick={limpiarFiltros} className="btn btn-ghost bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl px-3 transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                {loading ? <div className="p-10"><TableSkeleton rows={10} columns={5} /></div> : (
                    <>
                        <table className="w-full text-sm data-table">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Fecha / Hora</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Usuario</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Acción</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Entidad</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {registros.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                                    <Shield size={32} />
                                                </div>
                                                <p className="text-slate-800 font-semibold text-lg">No hay registros de auditoría</p>
                                                <p className="text-slate-500">Intenta con otros filtros de búsqueda.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    registros.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                                                    <span className="font-mono text-xs font-medium">
                                                        {new Date(r.fechaHora).toLocaleString('es-EC')}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                                                        {r.usuario?.nombreUsuario.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <span className="font-bold text-slate-700">
                                                        {r.usuario?.nombreUsuario || 'Sistema'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${r.accion === 'CREAR' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    r.accion === 'EDITAR' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                        'bg-rose-50 text-rose-700 border-rose-100'
                                                    }`}>
                                                    {r.accion}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">
                                                    {r.entidad} #{r.entidadId}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => verDetalle(r)}
                                                    className="btn p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors group"
                                                    title="Ver cambios"
                                                >
                                                    <FileText className="h-4 w-4 group-hover:scale-110 transition-transform" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Paginación */}
                        {paginacion.totalPages > 1 && (
                            <div className="table-footer flex items-center justify-between p-4 bg-slate-50 border-t border-slate-100">
                                <span className="text-sm text-slate-500">
                                    Mostrando {((paginacion.page - 1) * paginacion.limit) + 1} - {Math.min(paginacion.page * paginacion.limit, paginacion.total)} de {paginacion.total} registros
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => irPagina(paginacion.page - 1)}
                                        disabled={paginacion.page === 1}
                                        className="btn btn-sm btn-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Anterior
                                    </button>
                                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                                        {paginacion.page} / {paginacion.totalPages}
                                    </span>
                                    <button
                                        onClick={() => irPagina(paginacion.page + 1)}
                                        disabled={paginacion.page === paginacion.totalPages}
                                        className="btn btn-sm btn-white border border-slate-200 disabled:opacity-50 hover:bg-slate-50"
                                    >
                                        Siguiente <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Modal de Detalle */}
            {modalOpen && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4" onClick={() => setModalOpen(false)}>
                    <div className="modal-content bg-white w-full max-w-4xl rounded-2xl shadow-2xl animate-scaleIn overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="modal-header bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-indigo-100 p-6 flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <div className="bg-white p-2 rounded-lg text-indigo-500 shadow-sm border border-indigo-100">
                                    <Shield className="h-6 w-6" />
                                </div>
                                Detalle de Auditoría
                            </h3>
                            <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {loadingDetalle ? (
                            <div className="p-20 flex justify-center items-center gap-3">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-slate-500 font-medium">Cargando detalles...</span>
                            </div>
                        ) : seleccionado ? (
                            <div className="flex-1 overflow-y-auto">
                                {/* Info del registro */}
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Fecha</span>
                                        <p className="font-bold text-slate-800">{new Date(seleccionado.fechaHora).toLocaleString('es-EC')}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Usuario</span>
                                        <p className="font-bold text-slate-800">{seleccionado.usuario?.nombreCompleto || 'Sistema'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Acción</span>
                                        <p><span className={`px-2 py-0.5 rounded text-xs font-bold ${seleccionado.accion === 'CREAR' ? 'bg-emerald-100 text-emerald-800' :
                                            seleccionado.accion === 'EDITAR' ? 'bg-blue-100 text-blue-800' :
                                                'bg-rose-100 text-rose-800'
                                            }`}>{seleccionado.accion}</span></p>
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Entidad</span>
                                        <p className="font-bold text-indigo-600">{seleccionado.entidad} #{seleccionado.entidadId}</p>
                                    </div>
                                </div>

                                {/* Datos Antes/Después */}
                                <div className="modal-body p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                                    <div className="flex flex-col h-full">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-200"></span>
                                            Datos Anteriores
                                        </h4>
                                        {seleccionado.datosAnteriores ? (
                                            <div className="flex-1 bg-rose-50/50 rounded-xl border border-rose-100 p-4 relative group hover:bg-rose-50 transition-colors">
                                                <pre className="text-xs text-rose-900 font-mono whitespace-pre-wrap overflow-x-auto">
                                                    {JSON.stringify(seleccionado.datosAnteriores, null, 2)}
                                                </pre>
                                            </div>
                                        ) : (
                                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-8 flex items-center justify-center text-center">
                                                <p className="text-sm text-slate-400 italic">
                                                    No hay datos previos<br />(Es una creación)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col h-full">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                                            Datos Nuevos
                                        </h4>
                                        {seleccionado.datosNuevos ? (
                                            <div className="flex-1 bg-emerald-50/50 rounded-xl border border-emerald-100 p-4 relative group hover:bg-emerald-50 transition-colors">
                                                <pre className="text-xs text-emerald-900 font-mono whitespace-pre-wrap overflow-x-auto">
                                                    {JSON.stringify(seleccionado.datosNuevos, null, 2)}
                                                </pre>
                                            </div>
                                        ) : (
                                            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-8 flex items-center justify-center text-center">
                                                <p className="text-sm text-slate-400 italic">
                                                    No hay datos nuevos<br />(Es una eliminación)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 flex justify-between font-mono shrink-0">
                                    <span>IP: {seleccionado.ipAddress === '::1' ? '127.0.0.1 (Localhost)' : (seleccionado.ipAddress || 'Desconocida')}</span>
                                    <span>ID Registro: {seleccionado.id}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Auditoria;
