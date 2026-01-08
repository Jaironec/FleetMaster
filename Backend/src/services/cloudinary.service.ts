// Servicio de Cloudinary para subida de archivos
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Validar que las variables de Cloudinary estén configuradas
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
};

// Solo configurar Cloudinary si todas las variables están presentes
const tieneConfigCompleta = cloudinaryConfig.cloud_name && 
                            cloudinaryConfig.api_key && 
                            cloudinaryConfig.api_secret;

if (tieneConfigCompleta) {
    cloudinary.config(cloudinaryConfig);
    console.log('✅ Cloudinary configurado correctamente');
} else {
    console.warn('⚠️  Cloudinary no configurado. Las funciones de subida de archivos no estarán disponibles.');
}

// Interfaz para el resultado de subida
export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
}

/**
 * Sube un archivo a Cloudinary desde un buffer
 * @param buffer - Buffer del archivo
 * @param folder - Carpeta destino en Cloudinary (ej: 'comprobantes')
 * @param originalFilename - Nombre original del archivo
 * @returns Promesa con URL y publicId
 */
export const uploadToCloudinary = async (
    buffer: Buffer,
    folder: string = 'comprobantes',
    originalFilename?: string
): Promise<CloudinaryUploadResult> => {
    // Validar que Cloudinary esté configurado
    if (!tieneConfigCompleta) {
        throw new Error('Cloudinary no está configurado. Configure las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.');
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto',
            },
            (error, result: UploadApiResponse | undefined) => {
                if (error) {
                    reject(new Error(`Error al subir archivo a Cloudinary: ${error.message}`));
                } else if (result) {
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                    });
                } else {
                    reject(new Error('Respuesta vacía de Cloudinary'));
                }
            }
        );

        uploadStream.end(buffer);
    });
};

/**
 * Elimina un archivo de Cloudinary por su publicId
 * @param publicId - ID público del recurso en Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    // Validar que Cloudinary esté configurado
    if (!tieneConfigCompleta) {
        throw new Error('Cloudinary no está configurado. Configure las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.');
    }

    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        throw new Error(`Error al eliminar archivo de Cloudinary: ${errorMessage}`);
    }
};

export default cloudinary;
