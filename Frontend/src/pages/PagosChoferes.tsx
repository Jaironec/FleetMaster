import { useState, useEffect, useRef, FormEvent } from 'react';
import { pagoChoferService, choferService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/LoadingSkeleton';
import { ReadOnlyBanner } from '../components/ReadOnlyBanner';
import EmptyState from '../components/EmptyState';
import { Plus, X, Upload, FileText, Trash2, Banknote, Calendar, DollarSign, CheckCircle, Eye, Image, XCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import { toast } from 'react-hot-toast';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';

// Tipo para viajes pendientes de pago
interface ViajePendiente {
    id: number;
    origen: string;
    destino: string;
    fechaSalida: string;
    montoPagoChofer: number;
    pendiente?: number;
    fechaLlegadaReal?: string;
    totalPagado?: number;
}

interface Chofer {
    id: number;
    nombres: string;
    apellidos: string;
    documentoId: string;
    banco?: string;
    numeroCuenta?: string;
    modalidadPago?: 'POR_VIAJE' | 'MENSUAL';
}

interface PagoChofer {
    id: number;
    choferId: number;
    chofer?: Chofer;
    monto: number;
    fecha: string;
    metodoPago: string;
    descripcion?: string;
    estado?: 'PENDIENTE' | 'PAGADO';
    fechaPagoReal?: string;
    comprobante?: {
        url: string;
        nombreArchivoOriginal: string;
    };
}

const PagosChoferes = () => {
    const { usuario, canWrite } = useAuth();
    const [pagos, setPagos] = useState<PagoChofer[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modoVer, setModoVer] = useState(false);
    const [choferes, setChoferes] = useState<Chofer[]>([]);
    const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoChofer | null>(null);
    const [comprobantePreview, setComprobantePreview] = useState<{ url: string; nombre: string } | null>(null);

    // Filtros
    const [filtros, setFiltros] = useState({
        choferId: '',
        fechaDesde: '',
        fechaHasta: '',
        estado: ''
    });

    const initialFormState = {
        choferId: '',
        monto: '',
        fecha: new Date().toISOString().split('T')[0],
        metodoPago: 'EFECTIVO',
        descripcion: '',
        viajeId: '',
        banco: '',
        numeroCuenta: '',
        archivo: null as File | null
    };

    const [formData, setFormData] = useState(initialFormState);

    const [viajesPendientes, setViajesPendientes] = useState<ViajePendiente[]>([]);

    const handleChoferChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const choferSeleccionado = choferes.find(c => c.id === Number(id));

        setFormData(prev => ({
            ...prev,
            choferId: id,
            viajeId: '',
            monto: '',
            descripcion: '',
            banco: choferSeleccionado?.banco || '',
            numeroCuenta: choferSeleccionado?.numeroCuenta || ''
        }));
        setViajesPendientes([]);

        if (!id) return;

        // Check if modalidaPago is POR_VIAJE. Assuming it's in the data.
        if (choferSeleccionado && choferSeleccionado.modalidadPago === 'POR_VIAJE') {
            try {
                const res = await choferService.obtenerViajesPendientes(Number(id));
                // API returns { exito: true, viajes: [...] }
                if (res.exito && res.viajes) {
                    setViajesPendientes(res.viajes);
                }
            } catch (error) {
                const err = error as ApiError;
                console.error("Error cargando viajes pendientes", err);
                // No mostrar toast crítico aquí, es carga secundaria
            }
        }
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        cargarDatos();
        cargarChoferes();
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [filtros]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            // Convertir choferId a número antes de enviar
            const params: {
                choferId?: number;
                fechaDesde?: string;
                fechaHasta?: string;
                estado?: string;
            } = {
                ...filtros,
                choferId: filtros.choferId ? Number(filtros.choferId) : undefined
            };
            const data = await pagoChoferService.listar(params as Parameters<typeof pagoChoferService.listar>[0]);
            setPagos(data.datos || []);
        } catch (error) {
            const err = error as ApiError;
            console.error('Error cargando pagos:', err);
            if (!wasToastShown(err)) toast.error('Error al cargar pagos');
        } finally {
            setLoading(false);
        }
    };

    const cargarChoferes = async () => {
        try {
            const data = await choferService.listar({});
            setChoferes(data.datos || []);
        } catch (error) {
            const err = error as ApiError;
            console.error('Error cargando choferes:', err);
            // No mostrar toast crítico si falla lista de choferes en filtro
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        // DEBUG: Verificar si hay archivo
        console.log('[DEBUG handleSubmit] formData.archivo:', formData.archivo ? { name: formData.archivo.name, size: formData.archivo.size } : 'NO ARCHIVO');
        try {
            const form = new FormData();
            form.append('choferId', formData.choferId);
            form.append('monto', formData.monto);
            form.append('fecha', formData.fecha);
            form.append('metodoPago', formData.metodoPago);
            form.append('descripcion', formData.descripcion);
            if (formData.banco) form.append('banco', formData.banco);
            if (formData.numeroCuenta) form.append('numeroCuenta', formData.numeroCuenta);

            if (formData.archivo) {
                form.append('archivo', formData.archivo);
            }
            if (formData.viajeId) {
                form.append('viajeId', formData.viajeId);
            }

            if (pagoSeleccionado) {
                await pagoChoferService.marcarPagado(pagoSeleccionado.id, form);
                toast.success('Pago procesado correctamente');
            } else {
                await pagoChoferService.crear(form);
                toast.success('Pago registrado correctamente');
            }

            cerrarModal();
            cargarDatos();
        } catch (error) {
            const err = error as ApiError;
            // Solo mostrar toast si el interceptor no lo hizo ya
            if (!wasToastShown(err)) {
                toast.error(getErrorMessage(err, 'Error al registrar pago'));
            }
        }
    };

    const handlePagar = (pago: PagoChofer) => {
        setPagoSeleccionado(pago);
        setFormData({
            ...initialFormState,
            choferId: pago.choferId.toString(),
            monto: Number(pago.monto).toString(), // Monto pendiente total
            fecha: new Date().toISOString().split('T')[0],
            descripcion: pago.descripcion || '',
            // Preservar datos bancarios si existen en el chofer (se carga en handleChoferChange? no aqui)
        });
        setShowModal(true);
    };

    const handleVerDetalle = (pago: PagoChofer) => {
        setPagoSeleccionado(pago);
        setModoVer(true);
        setFormData({
            ...initialFormState,
            choferId: pago.choferId.toString(),
            monto: Number(pago.monto).toString(),
            fecha: pago.fecha ? new Date(pago.fecha).toLocaleDateString('en-CA') : '',
            metodoPago: pago.metodoPago,
            descripcion: pago.descripcion || '',
        });
        setShowModal(true);
    };

    const cerrarModal = () => {
        setShowModal(false);
        setModoVer(false);
        setFormData(initialFormState);
        setPagoSeleccionado(null);
    };

    return (
        <div className="space-y-6">
            <ReadOnlyBanner />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pagos a Choferes</h1>
                    <p className="text-slate-500 mt-1">Registro y control de pagos de nómina y anticipos</p>
                </div>
                {canWrite && (
                    <button onClick={() => setShowModal(true)} className="btn btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-6 py-2.5 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all">
                        <Plus className="w-5 h-5" />
                        <span className="font-bold">Nuevo Pago</span>
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Chofer</label>
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.choferId}
                            onChange={e => setFiltros({ ...filtros, choferId: e.target.value })}
                        >
                            <option value="">Todos los Choferes</option>
                            {choferes?.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Desde</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.fechaDesde}
                            onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-emerald-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Hasta</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.fechaHasta}
                            onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                        />
                        <Calendar
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 cursor-pointer hover:text-emerald-600 transition-colors"
                            onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                        />
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Estado</label>
                    <div className="relative">
                        <select
                            className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-11"
                            value={filtros.estado}
                            onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                        >
                            <option value="">Todos</option>
                            <option value="PENDIENTE">⏳ Pendientes</option>
                            <option value="PAGADO">✅ Pagados</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <TableSkeleton rows={5} columns={6} />
            ) : pagos.length === 0 ? (
                <EmptyState
                    type="pagos"
                    onAction={() => setShowModal(true)}
                    showAction={true}
                />
            ) : (
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100 text-left">
                                    <th className="px-6 py-4 font-bold text-slate-700">Fecha</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Chofer</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Estado</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 hidden lg:table-cell">Descripción</th>
                                    <th className="px-6 py-4 font-bold text-slate-700">Monto</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 hidden md:table-cell">Comprobante</th>
                                    <th className="px-6 py-4 font-bold text-slate-700 text-right w-32">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagos?.map((p) => (
                                    <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors">
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-slate-400" />
                                                {new Date(p.fecha).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{p.chofer?.nombres} {p.chofer?.apellidos}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${p.estado === 'PAGADO'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 ${p.estado === 'PAGADO' ? 'bg-emerald-500' : 'bg-amber-500'
                                                    }`}></div>
                                                {p.estado || 'PENDIENTE'}
                                            </span>
                                            {p.fechaPagoReal && (
                                                <p className="text-[10px] text-slate-400 mt-1">
                                                    Pagado: {new Date(p.fechaPagoReal).toLocaleDateString()}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate hidden lg:table-cell" title={p.descripcion}>{p.descripcion || '-'}</td>
                                        <td className="px-6 py-4 font-black text-emerald-600 text-lg whitespace-nowrap">${Number(p.monto).toFixed(2)}</td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <button
                                                onClick={() => {
                                                    if (p.comprobante?.url) {
                                                        setComprobantePreview({
                                                            url: p.comprobante.url,
                                                            nombre: p.comprobante.nombreArchivoOriginal || 'Comprobante'
                                                        });
                                                    } else {
                                                        toast('No hay comprobante adjunto', { icon: '📎' });
                                                    }
                                                }}
                                                className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-lg w-fit transition-colors ${p.comprobante
                                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                    : 'text-slate-400 bg-slate-50 cursor-default'
                                                    }`}
                                            >
                                                {p.comprobante ? (
                                                    <><Image className="w-3 h-3" /> Ver Imagen</>
                                                ) : (
                                                    <><XCircle className="w-3 h-3" /> Sin Adjunto</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">

                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleVerDetalle(p)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Ver Detalle"
                                                >
                                                    <Eye size={20} />
                                                </button>
                                                {canWrite && p.estado !== 'PAGADO' && (
                                                    <button
                                                        onClick={() => handlePagar(p)}
                                                        className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-emerald-100 shadow-sm"
                                                        title="Procesar Pago"
                                                    >
                                                        <Banknote className="w-5 h-5" />
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

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4">
                    <div className="modal-content bg-white w-full max-w-lg rounded-2xl shadow-2xl animate-scaleIn overflow-hidden">
                        <div className="modal-header bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-6 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm border border-emerald-100">
                                    <Banknote size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800">
                                    {modoVer ? 'Detalles del Pago' : (pagoSeleccionado ? 'Procesar Pago Pendiente' : 'Registrar Nuevo Pago')}
                                </h3>
                            </div>
                            <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50 transition-colors"><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body p-6">
                                {modoVer && pagoSeleccionado ? (
                                    <div className="space-y-6">
                                        <div>
                                            <h5 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-2 mb-4">Información del Pago</h5>
                                            <ul className="grid grid-cols-2 gap-x-6 gap-y-4">
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500">Fecha</span>
                                                    <span className="font-medium text-slate-800">{new Date(pagoSeleccionado.fecha).toLocaleDateString()}</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500">Monto</span>
                                                    <span className="font-bold text-emerald-600">${Number(pagoSeleccionado.monto).toFixed(2)}</span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500">Estado</span>
                                                    <span className={`font-bold ${pagoSeleccionado.estado === 'PAGADO' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                        {pagoSeleccionado.estado || 'PENDIENTE'}
                                                    </span>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500">Método de Pago</span>
                                                    <span className="font-medium text-slate-800">{pagoSeleccionado.metodoPago}</span>
                                                </li>
                                                {pagoSeleccionado.fechaPagoReal && (
                                                    <li className="flex flex-col">
                                                        <span className="text-xs text-slate-500">Fecha Pago Real</span>
                                                        <span className="font-medium text-slate-800">{new Date(pagoSeleccionado.fechaPagoReal).toLocaleDateString()}</span>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>

                                        <div>
                                            <h5 className="text-xs font-bold text-slate-500 uppercase border-b border-slate-100 pb-2 mb-4">Detalles Adicionales</h5>
                                            <ul className="space-y-4">
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500 mb-1">Chofer</span>
                                                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                                                            {pagoSeleccionado.chofer?.nombres?.charAt(0) || '?'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-700 text-sm">{pagoSeleccionado.chofer?.nombres} {pagoSeleccionado.chofer?.apellidos}</p>
                                                            <p className="text-xs text-slate-400">{pagoSeleccionado.chofer?.documentoId}</p>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li className="flex flex-col">
                                                    <span className="text-xs text-slate-500 mb-1">Descripción / Nota</span>
                                                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                                        {pagoSeleccionado.descripcion || 'Sin descripción'}
                                                    </p>
                                                </li>
                                                {pagoSeleccionado.comprobante && (
                                                    <li className="flex flex-col">
                                                        <span className="text-xs text-slate-500 mb-2">Comprobante Adjunto</span>
                                                        <a
                                                            href={pagoSeleccionado.comprobante.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors group"
                                                        >
                                                            <div className="bg-white p-2 rounded-lg text-indigo-500 shadow-sm group-hover:text-indigo-600">
                                                                <FileText size={20} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-indigo-900 text-sm">Ver Documento</p>
                                                                <p className="text-xs text-indigo-600/70">Clic para abrir</p>
                                                            </div>
                                                        </a>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* FORM CONTROLS (Existing) */}
                                        <div>
                                            <label className="form-label font-bold text-slate-700 mb-1.5 block">Chofer *</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    className={`form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl text-slate-700 font-medium pl-4 pr-10 ${pagoSeleccionado ? 'opacity-70 bg-slate-100 cursor-not-allowed' : ''}`}
                                                    value={formData.choferId}
                                                    onChange={handleChoferChange}
                                                    disabled={!!pagoSeleccionado}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {choferes?.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {viajesPendientes.length > 0 && (
                                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                                <label className="text-sm font-bold text-indigo-800 block mb-2">Pagar Viaje Específico</label>
                                                <select
                                                    className="form-select w-full border-indigo-200 focus:border-indigo-400 h-11 rounded-lg text-sm"
                                                    value={formData.viajeId || ''}
                                                    onChange={e => {
                                                        const vId = e.target.value;
                                                        const viaje = viajesPendientes.find((v) => v.id.toString() === vId);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            viajeId: vId,
                                                            monto: viaje ? (viaje.pendiente || viaje.montoPagoChofer).toString() : prev.monto,
                                                            descripcion: viaje ? `Pago viaje ${viaje.origen} - ${viaje.destino}` : ''
                                                        }));
                                                    }}
                                                >
                                                    <option value="">-- Pago General / Anticipo --</option>
                                                    {viajesPendientes.map((v) => (
                                                        <option key={v.id} value={v.id}>
                                                            {v.fechaLlegadaReal ? new Date(v.fechaLlegadaReal).toLocaleDateString() : '---'} | {v.origen} - {v.destino} | Debe: ${v.pendiente?.toFixed(2) || v.montoPagoChofer}
                                                        </option>
                                                    ))}
                                                </select>
                                                {formData.viajeId && (() => {
                                                    const viajeSelec = viajesPendientes.find((v) => v.id.toString() === formData.viajeId);
                                                    if (!viajeSelec) return null;
                                                    const montoAPagar = Number(formData.monto || 0);
                                                    const quedara = (viajeSelec.pendiente || 0) - montoAPagar;
                                                    return (
                                                        <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-100 text-xs space-y-1.5 shadow-sm">
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500 font-medium">Pactado:</span>
                                                                <span className="font-bold text-slate-800">${viajeSelec.montoPagoChofer?.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-slate-500 font-medium">Ya pagado:</span>
                                                                <span className="font-bold text-emerald-600">${viajeSelec.totalPagado?.toFixed(2) || '0.00'}</span>
                                                            </div>
                                                            <div className="flex justify-between border-t border-slate-100 pt-1.5">
                                                                <span className="text-slate-600 font-bold">Pendiente actual:</span>
                                                                <span className="font-bold text-amber-600">${viajeSelec.pendiente?.toFixed(2)}</span>
                                                            </div>
                                                            {quedara > 0 && (
                                                                <div className="flex justify-between border-t border-amber-100 pt-2 bg-amber-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                                                                    <span className="text-amber-700 font-bold">Quedará debiendo:</span>
                                                                    <span className="font-black text-amber-700">${quedara.toFixed(2)}</span>
                                                                </div>
                                                            )}
                                                            {quedara <= 0 && montoAPagar > 0 && (
                                                                <div className="flex justify-between border-t border-emerald-100 pt-2 bg-emerald-50 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
                                                                    <span className="text-emerald-700 font-bold flex items-center gap-1"><CheckCircle size={14} /> Viaje quedará pagado</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="form-label font-bold text-slate-700 mb-1.5 block">Monto *</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl font-bold text-slate-700"
                                                        value={formData.monto}
                                                        onChange={e => setFormData({ ...formData, monto: e.target.value })}
                                                    />
                                                    <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="form-label font-bold text-slate-700 mb-1.5 block">Fecha *</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        type="date"
                                                        className="form-input w-full pl-4 pr-10 bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                        value={formData.fecha}
                                                        onChange={e => setFormData({ ...formData, fecha: e.target.value })}
                                                    />
                                                    <Calendar
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 cursor-pointer hover:text-emerald-600 transition-colors"
                                                        onClick={(e) => (e.currentTarget.previousSibling as HTMLInputElement)?.showPicker()}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label font-bold text-slate-700 mb-1.5 block">Método de Pago</label>
                                            <select
                                                className="form-select w-full bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
                                                value={formData.metodoPago}
                                                onChange={e => setFormData({ ...formData, metodoPago: e.target.value })}
                                            >
                                                <option value="EFECTIVO">Efectivo</option>
                                                <option value="TRANSFERENCIA">Transferencia</option>
                                                <option value="CHEQUE">Cheque</option>
                                            </select>
                                        </div>

                                        {formData.metodoPago === 'TRANSFERENCIA' && (
                                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                                                <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                                    <Banknote size={16} /> Datos Bancarios del Chofer
                                                </h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="form-label text-blue-800 text-xs font-bold uppercase">Banco</label>
                                                        <input
                                                            type="text"
                                                            className="form-input border-blue-200 bg-white h-10 text-sm"
                                                            placeholder="Ej: Pichincha"
                                                            value={formData.banco}
                                                            onChange={e => setFormData({ ...formData, banco: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="form-label text-blue-800 text-xs font-bold uppercase">No. Cuenta</label>
                                                        <input
                                                            type="text"
                                                            className="form-input border-blue-200 bg-white h-10 text-sm"
                                                            placeholder="Ej: 220..."
                                                            value={formData.numeroCuenta}
                                                            onChange={e => setFormData({ ...formData, numeroCuenta: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="form-label font-bold text-slate-700 mb-1.5 block">Descripción / Nota</label>
                                            <textarea
                                                className="form-textarea w-full bg-slate-50 border-slate-200 focus:bg-white rounded-xl resize-none p-3"
                                                rows={2}
                                                value={formData.descripcion}
                                                onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                                placeholder="Detalles adicionales del pago..."
                                            />
                                        </div>
                                        <FileUpload
                                            file={formData.archivo}
                                            onChange={(file) => setFormData({ ...formData, archivo: file })}
                                            label="Comprobante"
                                            accept="image/*,application/pdf"
                                            hint="PDF o Imagen"
                                            size="sm"
                                            showPreview
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-slate-50 border-t border-slate-100 p-5 flex justify-end gap-3 rounded-b-2xl">
                                <button type="button" onClick={cerrarModal} className="btn btn-secondary px-6 rounded-xl font-medium">Cancelar</button>
                                {modoVer ? (
                                    <button type="button" onClick={cerrarModal} className="btn btn-primary px-8 rounded-xl font-bold">Cerrar</button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="btn btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-8 rounded-xl font-bold flex items-center gap-2 transform hover:-translate-y-0.5 transition-all"
                                    >
                                        <Banknote className="w-5 h-5" /> {pagoSeleccionado ? 'Procesar Pago' : 'Guardar Pago'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Vista Previa Comprobante */}
            {comprobantePreview && (
                <div
                    className="modal-overlay backdrop-blur-sm bg-slate-900/80 z-[60] fixed inset-0 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setComprobantePreview(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] overflow-hidden animate-scaleIn"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header-info">
                            <div className="flex items-center gap-3">
                                <div className="modal-icon-info">
                                    <Image className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Comprobante de Pago</h3>
                                    <p className="text-sm text-slate-500 truncate max-w-xs">{comprobantePreview.nombre}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setComprobantePreview(null)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-4 bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-auto">
                            {comprobantePreview.url.toLowerCase().endsWith('.pdf') ? (
                                <div className="text-center p-8">
                                    <FileText className="w-16 h-16 text-rose-500 mx-auto mb-4" />
                                    <p className="text-slate-600 mb-4">Este archivo es un PDF</p>
                                    <a
                                        href={comprobantePreview.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="btn btn-primary"
                                    >
                                        Abrir PDF en nueva pestaña
                                    </a>
                                </div>
                            ) : (
                                <img
                                    src={comprobantePreview.url}
                                    alt="Comprobante"
                                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
                                />
                            )}
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <a
                                href={comprobantePreview.url}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                            >
                                Abrir en Nueva Pestaña
                            </a>
                            <button
                                onClick={() => setComprobantePreview(null)}
                                className="btn btn-primary"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagosChoferes;
