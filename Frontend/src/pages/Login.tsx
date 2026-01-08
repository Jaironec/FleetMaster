// Login - Diseño Moderno Claro Profesional
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, Eye, EyeOff, Loader2, ShieldCheck, User, Sparkles, MapPin, Gauge, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { ApiError, getErrorMessage } from '../types/error.types';

export default function Login() {
    const [usuario, setUsuario] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    // --- Safety Watchdog ---
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (loading) {
            timer = setTimeout(() => {
                if (loading) {
                    setLoading(false);
                    toast.error('La solicitud está tardando demasiado. Por favor intente de nuevo.');
                }
            }, 10000); // 10s timeout
        }
        return () => clearTimeout(timer);
    }, [loading]);

    // --- Update System ---
    const [appVersion, setAppVersion] = useState<string>('');
    const [updateStatus, setUpdateStatus] = useState<string>('');
    const [downloadProgress, setDownloadProgress] = useState<number>(0);

    const checkUpdates = async () => {
        if (window.electronAPI) {
            setUpdateStatus('Buscando...');
            const result = await window.electronAPI.checkForUpdates();
            if (result?.status === 'dev') setUpdateStatus('Modo Desarrollo');
            else if (result?.status === 'error') setUpdateStatus('Error al buscar');
            // else: update-available event will handle the rest
        }
    };

    useEffect(() => {
        if (window.electronAPI) {
            // Obtener versión actual
            window.electronAPI.getAppVersion().then(setAppVersion);

            window.electronAPI.onUpdateAvailable(() => setUpdateStatus('Nueva versión...'));
            window.electronAPI.onDownloadProgress((prog: any) => {
                setUpdateStatus('Descargando...');
                setDownloadProgress(Math.floor(prog.percent));
            });
            window.electronAPI.onUpdateDownloaded(() => setUpdateStatus('Lista para instalar'));
            return () => {
                window.electronAPI?.removeListeners?.();
            };
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuario || !password) { toast.error('Ingrese usuario y contraseña'); return; }

        setLoading(true);
        // Minimum loading time (500ms) to prevent UI flicker
        const minTime = new Promise(resolve => setTimeout(resolve, 800));

        try {
            const [_, response] = await Promise.all([minTime, login(usuario, password)]);
            toast.success('¡Bienvenido!');
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            const isNetworkError = err.message === 'Network Error' || err.code === 'ERR_NETWORK';

            if (isNetworkError) {
                toast.error('Sin conexión al servidor.');
            } else {
                const msj = getErrorMessage(err, 'Credenciales inválidas');
                toast.error(msj);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden relative">
            {/* NO top-right update indicator anymore - Moved to Footer */}

            {/* Panel Izquierdo - Branding y Mensaje - REMOVED MOTION */}
            <div
                className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-600"
            >
                {/* Fondo con Gradiente Vibrante */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 opacity-100"></div>

                {/* Patrón de fondo sutil */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>

                {/* Formas animadas suaves (Luz) - REMOVED MOTION */}
                <div
                    className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"
                ></div>
                <div
                    className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"
                ></div>

                <div className="relative z-10 flex flex-col justify-center items-center w-full h-full text-center px-10">
                    <div
                        className="mb-8 p-4 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10"
                    >
                        <Truck className="w-16 h-16 text-white drop-shadow-md" />
                    </div>

                    <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tight drop-shadow-sm">
                        Gestiona tu Flota <br />
                        <span className="text-indigo-200">con Maestría</span>
                    </h1>

                    <p className="text-lg text-indigo-100 max-w-md leading-relaxed">
                        Control total de viajes, gastos y mantenimiento.
                        La plataforma definitiva para logística moderna.
                    </p>

                    {/* Stats Flotantes (Decorativo) - REMOVED MOTION */}
                    <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col items-center">
                            <Sparkles className="text-yellow-300 w-6 h-6 mb-2" />
                            <span className="text-2xl font-bold text-white">100%</span>
                            <span className="text-xs text-indigo-100 uppercase tracking-widest">Control</span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col items-center">
                            <ShieldCheck className="text-emerald-300 w-6 h-6 mb-2" />
                            <span className="text-2xl font-bold text-white">Seguro</span>
                            <span className="text-xs text-indigo-100 uppercase tracking-widest">Auditable</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel Derecho - Formulario de Login */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-12 relative z-10">

                <div className="absolute top-6 left-6 flex items-center gap-2 lg:hidden">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <Truck className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">FleetMaster</h2>
                </div>

                {/* Form Container - REMOVED MOTION */}
                <div className="w-full max-w-md space-y-8">
                    <div className="hidden lg:flex items-center gap-3 mb-10 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 rotating-icon">
                            <Truck className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">FleetMaster</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="text-center lg:text-left">
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">¡Hola de nuevo!</h1>
                            <p className="text-slate-500 mt-2">Ingresa tus credenciales para acceder al panel.</p>
                        </div>

                        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 border border-slate-100">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Usuario</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={usuario}
                                            onChange={e => setUsuario(e.target.value)}
                                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="Ingresa tu usuario"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-sm font-bold text-slate-700">Contraseña</label>
                                        <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline">
                                            ¿Olvidaste tu contraseña?
                                        </a>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input
                                            type={showPass ? 'text' : 'password'}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-medium text-slate-800 placeholder:text-slate-400"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPass(!showPass)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors p-1"
                                        >
                                            {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:hover:translate-y-0 overflow-hidden mt-4"
                                >
                                    <span className={`flex items-center justify-center gap-2 relative z-10 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
                                        Iniciar Sesión <ShieldCheck className="w-4 h-4 opacity-80" />
                                    </span>
                                    {loading && (
                                        <div className="absolute inset-0 flex items-center justify-center z-20">
                                            <Loader2 className="w-6 h-6 animate-spin text-white" />
                                        </div>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Footer with Version and Update Controls */}
                    <div className="mt-10 flex flex-col items-center gap-2">
                        <p className="text-center text-slate-400 text-xs">
                            &copy; 2025 FleetMaster. Todos los derechos reservados.
                        </p>

                        {/* Dynamic Version & Update Button */}
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-300 font-medium tracking-wider">
                                v{appVersion || '...'}
                            </span>

                            {updateStatus && (
                                <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100">
                                    {updateStatus === 'Descargando...' && <Loader2 className="animate-spin w-2.5 h-2.5" />}
                                    {updateStatus} {downloadProgress > 0 && downloadProgress < 100 && `${downloadProgress}%`}
                                </div>
                            )}

                            <button
                                onClick={checkUpdates}
                                className="text-[10px] text-slate-400 hover:text-indigo-600 underline transition-colors"
                                title="Buscar actualizaciones"
                            >
                                Actualizar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
