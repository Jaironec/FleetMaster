// EmptyState - Professional empty state component with illustrations and CTAs
import { FC, ReactNode } from 'react';
import {
    Truck,
    Users,
    BriefcaseBusiness,
    Package,
    MapPin,
    Wrench,
    Banknote,
    FileText,
    Plus,
    Search
} from 'lucide-react';

interface EmptyStateProps {
    type: 'vehiculos' | 'choferes' | 'clientes' | 'materiales' | 'viajes' | 'mantenimientos' | 'pagos' | 'reportes' | 'search' | 'generic';
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    showAction?: boolean;
}

const illustrations: Record<string, { icon: any; gradient: string; bgColor: string }> = {
    vehiculos: { icon: Truck, gradient: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
    choferes: { icon: Users, gradient: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-50' },
    clientes: { icon: BriefcaseBusiness, gradient: 'from-violet-500 to-violet-600', bgColor: 'bg-violet-50' },
    materiales: { icon: Package, gradient: 'from-amber-500 to-amber-600', bgColor: 'bg-amber-50' },
    viajes: { icon: MapPin, gradient: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50' },
    mantenimientos: { icon: Wrench, gradient: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50' },
    pagos: { icon: Banknote, gradient: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
    reportes: { icon: FileText, gradient: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50' },
    search: { icon: Search, gradient: 'from-slate-400 to-slate-500', bgColor: 'bg-slate-50' },
    generic: { icon: Package, gradient: 'from-slate-400 to-slate-500', bgColor: 'bg-slate-50' }
};

const defaultContent: Record<string, { title: string; description: string; actionLabel: string }> = {
    vehiculos: {
        title: 'No hay vehículos registrados',
        description: 'Comienza agregando tu primer vehículo a la flota para gestionar sus viajes y mantenimientos.',
        actionLabel: 'Agregar Vehículo'
    },
    choferes: {
        title: 'No hay choferes registrados',
        description: 'Registra a tu equipo de conductores para asignarles viajes y gestionar sus pagos.',
        actionLabel: 'Agregar Chofer'
    },
    clientes: {
        title: 'No hay clientes registrados',
        description: 'Agrega los datos de tus clientes para asociarlos a los viajes y llevar un control de facturación.',
        actionLabel: 'Agregar Cliente'
    },
    materiales: {
        title: 'No hay materiales registrados',
        description: 'Define los tipos de materiales que transportas para clasificar mejor tus viajes.',
        actionLabel: 'Agregar Material'
    },
    viajes: {
        title: 'No hay viajes registrados',
        description: 'Registra viajes para llevar un control de ingresos, gastos y rentabilidad de tu operación.',
        actionLabel: 'Nuevo Viaje'
    },
    mantenimientos: {
        title: 'No hay mantenimientos registrados',
        description: 'Registra los mantenimientos de tus vehículos para llevar un historial y control de costos.',
        actionLabel: 'Registrar Mantenimiento'
    },
    pagos: {
        title: 'No hay pagos registrados',
        description: 'Registra los pagos realizados a tus choferes para llevar un control financiero.',
        actionLabel: 'Registrar Pago'
    },
    reportes: {
        title: 'Sin datos para el reporte',
        description: 'No hay información disponible para generar este reporte con los filtros seleccionados.',
        actionLabel: 'Cambiar Filtros'
    },
    search: {
        title: 'Sin resultados',
        description: 'No se encontraron registros que coincidan con tu búsqueda. Intenta con otros términos.',
        actionLabel: 'Limpiar Búsqueda'
    },
    generic: {
        title: 'No hay datos',
        description: 'No hay información disponible para mostrar en este momento.',
        actionLabel: 'Agregar'
    }
};

const EmptyState: FC<EmptyStateProps> = ({
    type,
    title,
    description,
    actionLabel,
    onAction,
    showAction = true
}) => {
    const illustration = illustrations[type] || illustrations.generic;
    const content = defaultContent[type] || defaultContent.generic;
    const Icon = illustration.icon;

    return (
        <div className="empty-state">
            {/* Animated Illustration */}
            <div className={`relative inline-flex items-center justify-center w-32 h-32 ${illustration.bgColor} rounded-3xl mb-6`}>
                {/* Background decoration */}
                <div className={`absolute inset-0 bg-gradient-to-br ${illustration.gradient} opacity-10 rounded-3xl`}></div>

                {/* Floating circles decoration */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full shadow-md animate-bounce-subtle" style={{ animationDelay: '0s' }}></div>
                <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-white rounded-full shadow-md animate-bounce-subtle" style={{ animationDelay: '0.3s' }}></div>

                {/* Icon */}
                <div className={`relative bg-gradient-to-br ${illustration.gradient} p-5 rounded-2xl shadow-lg`}>
                    <Icon className="w-10 h-10 text-white" />
                </div>
            </div>

            {/* Content */}
            <h3 className="empty-state-title">{title || content.title}</h3>
            <p className="empty-state-text">{description || content.description}</p>

            {/* Action Button */}
            {showAction && onAction && (
                <div className="empty-state-cta">
                    <button onClick={onAction} className="btn btn-primary">
                        <Plus className="h-4 w-4" />
                        {actionLabel || content.actionLabel}
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmptyState;
