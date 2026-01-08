import { useState, useEffect } from 'react';
import { reportesService } from '../services/api';
import toast from 'react-hot-toast';
import { Search, Download, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { formatearMoneda } from '../utils/formatos';

import { ApiError } from '../types/error.types';

interface CarteraItem {
    cliente: {
        id: number;
        nombreRazonSocial: string;
    };
    totalDeuda: number;
    porVencer: number;
    vencido1_30: number;
    vencido31_60: number;
    vencido61_90: number;
    vencido90Mas: number;
    viajesCount: number;
}

const ReporteCartera = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<CarteraItem[]>([]);
    const [filtroCliente, setFiltroCliente] = useState('');

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const respuesta = await reportesService.cartera();
            if (respuesta.exito) {
                setData(respuesta.datos);
            } else {
                toast.error(respuesta.mensaje || 'Error al cargar reporte de cartera');
            }
        } catch (error) {
            const err = error as ApiError;
            console.error(err);
            toast.error('Error de conexión al cargar cartera');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    // Totales Generales
    const totales = data.reduce((acc, item) => ({
        totalDeuda: acc.totalDeuda + item.totalDeuda,
        porVencer: acc.porVencer + item.porVencer,
        vencido1_30: acc.vencido1_30 + item.vencido1_30,
        vencido31_60: acc.vencido31_60 + item.vencido31_60,
        vencido61_90: acc.vencido61_90 + item.vencido61_90,
        vencido90Mas: acc.vencido90Mas + item.vencido90Mas
    }), { totalDeuda: 0, porVencer: 0, vencido1_30: 0, vencido31_60: 0, vencido61_90: 0, vencido90Mas: 0 });

    const datosFiltrados = data.filter(item =>
        item.cliente.nombreRazonSocial.toLowerCase().includes(filtroCliente.toLowerCase())
    );

    const exportarCSV = () => {
        const headers = ['Cliente,Total Deuda,Por Vencer,1-30 Días,31-60 Días,61-90 Días,90+ Días'];
        const rows = data.map(item => [
            `"${item.cliente.nombreRazonSocial}"`,
            item.totalDeuda,
            item.porVencer,
            item.vencido1_30,
            item.vencido31_60,
            item.vencido61_90,
            item.vencido90Mas
        ].join(','));

        const csvContent = headers.concat(rows).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `reporte_cartera_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="text-indigo-600" /> Cartera de Clientes
                    </h2>
                    <p className="text-sm text-slate-500">Estado de cuentas por cobrar y vencimientos</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={cargarDatos}
                        className="btn btn-secondary bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 shadow-sm px-4 rounded-xl flex items-center gap-2"
                    >
                        Actualizar
                    </button>
                    <button
                        onClick={exportarCSV}
                        className="btn btn-primary bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-200 px-6 rounded-xl flex items-center gap-2 transform hover:-translate-y-0.5 transition-all font-bold"
                    >
                        <Download size={18} /> Exportar CSV
                    </button>
                </div>
            </div>

            {/* Resumen de Totales - Tarjetas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100 animate-scaleIn delay-75">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Por Cobrar</p>
                    <p className="text-3xl font-black text-slate-800 mt-2 tracking-tight">{formatearMoneda(totales.totalDeuda)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100 animate-scaleIn delay-100">
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Al Día (Sin Vencer)</p>
                    <p className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">{formatearMoneda(totales.porVencer)}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100 animate-scaleIn delay-150">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-wide">Vencido (1-60 días)</p>
                    <p className="text-3xl font-black text-amber-600 mt-2 tracking-tight">
                        {formatearMoneda(totales.vencido1_30 + totales.vencido31_60)}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100 animate-scaleIn delay-200">
                    <p className="text-xs font-bold text-rose-600 uppercase tracking-wide">Crítico (&gt; 60 días)</p>
                    <p className="text-3xl font-black text-rose-600 mt-2 tracking-tight">
                        {formatearMoneda(totales.vencido61_90 + totales.vencido90Mas)}
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all focus:bg-white"
                        value={filtroCliente}
                        onChange={(e) => setFiltroCliente(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabla Detallada */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4 text-right">Total Deuda</th>
                                <th className="px-6 py-4 text-right text-emerald-600">Por Vencer</th>
                                <th className="px-6 py-4 text-right text-amber-600">1-30 Días</th>
                                <th className="px-6 py-4 text-right text-orange-600">31-60 Días</th>
                                <th className="px-6 py-4 text-right text-rose-600">61-90 Días</th>
                                <th className="px-6 py-4 text-right text-rose-800 font-black">90+ Días</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                            <p className="text-slate-500">Cargando datos de cartera...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : datosFiltrados.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-12 text-slate-500 font-medium">No hay datos para mostrar</td></tr>
                            ) : (
                                datosFiltrados.map((item, index) => (
                                    <tr key={item.cliente.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{item.cliente.nombreRazonSocial}</div>
                                            <div className="text-xs text-slate-400 mt-0.5 font-medium">{item.viajesCount} viajes pendientes</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-slate-800 text-base">
                                            {formatearMoneda(item.totalDeuda)}
                                        </td>
                                        <td className="px-6 py-4 text-right text-emerald-600 font-bold">
                                            {item.porVencer > 0 ? formatearMoneda(item.porVencer) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right text-amber-600 font-medium">
                                            {item.vencido1_30 > 0 ? formatearMoneda(item.vencido1_30) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right text-orange-600 font-medium">
                                            {item.vencido31_60 > 0 ? formatearMoneda(item.vencido31_60) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right text-rose-600 font-bold">
                                            {item.vencido61_90 > 0 ? formatearMoneda(item.vencido61_90) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right text-rose-800 font-black bg-rose-50/50">
                                            {item.vencido90Mas > 0 ? (
                                                <span className="flex items-center justify-end gap-1">
                                                    {formatearMoneda(item.vencido90Mas)}
                                                    <AlertCircle size={14} className="text-rose-600" />
                                                </span>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {/* Footer Totales */}
                        {!loading && datosFiltrados.length > 0 && (
                            <tfoot className="bg-slate-50/80 font-bold text-slate-700 border-t border-slate-200">
                                <tr>
                                    <td className="px-6 py-5 text-right uppercase tracking-wider text-xs">TOTALES:</td>
                                    <td className="px-6 py-5 text-right font-black text-lg">{formatearMoneda(totales.totalDeuda)}</td>
                                    <td className="px-6 py-5 text-right text-emerald-600">{formatearMoneda(totales.porVencer)}</td>
                                    <td className="px-6 py-5 text-right text-amber-600">{formatearMoneda(totales.vencido1_30)}</td>
                                    <td className="px-6 py-5 text-right text-orange-600">{formatearMoneda(totales.vencido31_60)}</td>
                                    <td className="px-6 py-5 text-right text-rose-600">{formatearMoneda(totales.vencido61_90)}</td>
                                    <td className="px-6 py-5 text-right text-rose-800 font-black">{formatearMoneda(totales.vencido90Mas)}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReporteCartera;
