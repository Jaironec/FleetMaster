import { X, AlertTriangle, LogOut, Trash2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    type = 'danger'
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const iconMap = {
        danger: Trash2,
        warning: AlertTriangle,
        info: LogOut
    };

    const buttonMap = {
        danger: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600',
        warning: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600',
        info: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600'
    };

    // Use standardized modal-header and modal-icon classes
    const headerClassMap = {
        danger: 'modal-header-danger',
        warning: 'modal-header-edit',
        info: 'modal-header-info'
    };

    const iconClassMap = {
        danger: 'modal-icon-danger',
        warning: 'modal-icon-edit',
        info: 'modal-icon-info'
    };

    const Icon = iconMap[type];

    return (
        <div className="modal-overlay backdrop-blur-sm bg-slate-900/60 z-50 fixed inset-0 flex items-center justify-center animate-fadeIn p-4" onClick={onClose}>
            <div
                className="modal-content bg-white w-full max-w-md rounded-2xl shadow-2xl animate-scaleIn overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={headerClassMap[type]}>
                    <div className="flex items-center gap-3">
                        <div className={iconClassMap[type]}>
                            <Icon className="h-6 w-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 hover:bg-white/50 p-2 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="px-6 py-4">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="modal-footer bg-slate-50">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`btn text-white shadow-lg active:scale-95 ${buttonMap[type]}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
