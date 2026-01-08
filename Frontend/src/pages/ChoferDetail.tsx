import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { choferService, pagoChoferService } from '../services/api';
import type { Chofer, PagoChofer } from '../types/api.types';
import { ApiError, wasToastShown, getErrorMessage } from '../types/error.types';
import { ArrowLeft, User, Phone, Mail, DollarSign, Wallet, Calendar, FileText } from 'lucide-react';

interface ResumenChofer {
    totalGenerado: number;
    totalPagado: number;
    saldoPendiente: number;
}

const ChoferDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [chofer, setChofer] = useState<Chofer | null>(null);
    const [resumen, setResumen] = useState<ResumenChofer | null>(null);
    const [pagos, setPagos] = useState<PagoChofer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            cargarDatos();
        }
    }, [id]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const choferData = await choferService.obtener(Number(id));
            setChofer(choferData.chofer || choferData.datos || choferData);

            const resumenData = await pagoChoferService.obtenerResumen(Number(id));
            setResumen(resumenData.datos);

            const pagosData = await pagoChoferService.listar({ choferId: Number(id) });
            setPagos(pagosData.datos || []);
        } catch (error) {
            const err = error as ApiError;
            console.error('Error al cargar datos chofer:', err);
            if (!wasToastShown(err)) {
                // Si falla la carga principal, redirigir o mostrar error en pantalla quizás sea mejor,
                // pero por ahora estandarizamos el toast
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Cargando...</div>;
    if (!chofer) return <div className="p-10 text-center">Chofer no encontrado</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/choferes')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{chofer.nombres} {chofer.apellidos}</h1>
                    <p className="text-slate-500 text-sm flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${chofer.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {chofer.estado}
                        </span>
                        • {chofer.documentoId}
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Personal Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-500" /> Información Personal
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center gap-3 text-slate-600">
                            <Phone className="w-4 h-4" /> <span>{chofer.telefono || 'No registrado'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600">
                            <Mail className="w-4 h-4" /> <span>{chofer.correo || 'No registrado'}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-100 mt-2">
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Pago</p>
                            <p className="font-medium text-slate-700">{chofer.modalidadPago} - {chofer.metodoPago}</p>
                            {chofer.metodoPago === 'TRANSFERENCIA' && (
                                <p className="text-xs text-slate-500 mt-1">{chofer.banco} - {chofer.numeroCuenta}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Economic Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 md:col-span-2">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-6">
                        <Wallet className="w-4 h-4 text-emerald-500" /> Resumen Económico
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-500 mb-1">Total Generado</p>
                            <p className="text-2xl font-bold text-slate-800">${Number(resumen?.totalGenerado || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-500 mb-1">Total Pagado</p>
                            <p className="text-2xl font-bold text-emerald-600">${Number(resumen?.totalPagado || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-500 mb-1">Saldo Pendiente</p>
                            <p className={`text-2xl font-bold ${Number(resumen?.saldoPendiente) > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                ${Math.max(0, Number(resumen?.saldoPendiente || 0)).toFixed(2)}
                            </p>
                            {Number(resumen?.saldoPendiente) < 0 && (
                                <p className="text-xs text-emerald-600 mt-1 font-medium">
                                    + ${Math.abs(Number(resumen?.saldoPendiente)).toFixed(2)} a favor
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-500" /> Pagos Efectuados
                    </h3>
                    <button
                        onClick={() => navigate(`/pagos-choferes?choferId=${id}`)}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Ver todos →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-left">
                                <th className="px-6 py-3 font-semibold text-slate-600">Fecha</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Monto</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Método</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Descripción</th>
                                <th className="px-6 py-3 font-semibold text-slate-600">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No hay pagos registrados
                                    </td>
                                </tr>
                            ) : (
                                pagos.slice(0, 10).map((pago) => (
                                    <tr key={pago.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-4">{new Date(pago.fecha).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-bold text-emerald-600">${Number(pago.monto).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs">{pago.metodoPago}</span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{pago.descripcion || '-'}</td>
                                        <td className="px-6 py-4">
                                            {pago.comprobante ? (
                                                <a
                                                    href={pago.comprobante.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-1 text-indigo-600 text-xs hover:underline"
                                                >
                                                    <FileText className="w-3 h-3" /> Ver
                                                </a>
                                            ) : (
                                                <span className="text-slate-400 text-xs">No adjunto</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Links to related actions */}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => navigate(`/viajes?choferId=${id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium border border-indigo-100"
                >
                    <FileText className="w-4 h-4" /> Ver Historial de Viajes
                </button>
                <button
                    onClick={() => navigate(`/pagos-choferes?choferId=${id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-100"
                >
                    <DollarSign className="w-4 h-4" /> Ver Historial de Pagos
                </button>
                <button
                    onClick={() => navigate(`/reportes?tab=CHOFERES&id=${id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium border border-indigo-100"
                >
                    <FileText className="w-4 h-4" /> Ver Reporte Financiero
                </button>
            </div>
        </div>
    );
};

export default ChoferDetail;
