/**
 * FileUpload - Componente reutilizable para subir archivos
 * Diseño consistente para usar en todos los modals
 */
import { useRef } from 'react';
import { Upload, FileText, Image, X, CheckCircle } from 'lucide-react';

interface FileUploadProps {
    /** Archivo seleccionado */
    file: File | null;
    /** Callback cuando se selecciona un archivo */
    onChange: (file: File | null) => void;
    /** Etiqueta del campo */
    label?: string;
    /** Tipos de archivo aceptados */
    accept?: string;
    /** Si es requerido */
    required?: boolean;
    /** Texto de ayuda */
    hint?: string;
    /** Variante de tamaño */
    size?: 'sm' | 'md' | 'lg';
    /** Si mostrar preview de imagen */
    showPreview?: boolean;
    /** Clase CSS adicional */
    className?: string;
}

export default function FileUpload({
    file,
    onChange,
    label = 'Comprobante / Archivo',
    accept = 'image/*,application/pdf',
    required = false,
    hint = 'PDF o Imagen',
    size = 'md',
    showPreview = false,
    className = ''
}: FileUploadProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = () => {
        inputRef.current?.click();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        onChange(selectedFile);
    };

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const sizeClasses = {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
    };

    const iconSize = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    };

    const isImage = file?.type.startsWith('image/');

    return (
        <div className={`space-y-2 ${className}`}>
            {label && (
                <label className="block text-sm font-bold text-slate-700">
                    {label}
                    {required && <span className="text-rose-500 ml-1">*</span>}
                </label>
            )}

            <div
                onClick={handleClick}
                className={`
                    relative border-2 border-dashed rounded-xl flex flex-col items-center justify-center 
                    cursor-pointer transition-all duration-200
                    ${sizeClasses[size]}
                    ${file 
                        ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50' 
                        : 'border-slate-300 bg-slate-50/50 hover:border-indigo-400 hover:bg-indigo-50/30'
                    }
                `}
            >
                <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={accept}
                    onChange={handleChange}
                    required={required && !file}
                />

                {file ? (
                    <div className="flex flex-col items-center text-emerald-600 relative w-full">
                        {/* Botón eliminar */}
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute -top-2 -right-2 p-1.5 bg-white rounded-full shadow-md border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-300 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Preview o icono */}
                        {showPreview && isImage ? (
                            <div className="w-20 h-20 rounded-xl overflow-hidden shadow-md border-2 border-white mb-3">
                                <img
                                    src={URL.createObjectURL(file)}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="bg-white p-3 rounded-xl shadow-md border border-emerald-100 mb-3">
                                {isImage ? (
                                    <Image className={iconSize[size]} />
                                ) : (
                                    <FileText className={iconSize[size]} />
                                )}
                            </div>
                        )}

                        {/* Info del archivo */}
                        <div className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                                <CheckCircle className="w-4 h-4" />
                                <span className="font-bold text-sm truncate max-w-[200px]">
                                    {file.name}
                                </span>
                            </div>
                            <span className="text-xs text-emerald-500 mt-1 block">
                                {(file.size / 1024).toFixed(1)} KB • Click para cambiar
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-slate-400">
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 mb-3">
                            <Upload className={`${iconSize[size]} text-slate-400`} />
                        </div>
                        <span className="font-semibold text-sm text-slate-600">
                            Click para subir archivo
                        </span>
                        <span className="text-xs text-slate-400 mt-1">
                            {hint} {required ? '' : '(Opcional)'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
