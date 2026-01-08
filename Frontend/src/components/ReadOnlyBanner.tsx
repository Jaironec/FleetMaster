import { Eye, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ReadOnlyBanner = () => {
    const { isAuditor } = useAuth();

    if (!isAuditor) return null;

    return (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg mb-6 flex items-center gap-3 border border-blue-400">
            <div className="bg-white/20 p-2 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
                <p className="font-bold text-sm">Modo Auditor - Solo Lectura</p>
                <p className="text-xs text-blue-100">
                    Puede visualizar toda la información pero no realizar cambios
                </p>
            </div>
            <Eye className="h-6 w-6 text-blue-200" />
        </div>
    );
};
