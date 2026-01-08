import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 text-center">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Algo salió mal</h1>
                        <p className="text-slate-500 mb-6">La aplicación ha encontrado un error inesperado.</p>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-left mb-6 overflow-auto max-h-40">
                            <code className="text-xs text-rose-600 font-mono">
                                {this.state.error?.message || 'Error desconocido'}
                            </code>
                        </div>

                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-primary bg-indigo-600 text-white w-full py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition"
                        >
                            <RefreshCw size={18} />
                            Recargar Aplicación
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
