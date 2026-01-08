// Validación de Variables de Entorno
// Valida que todas las variables requeridas estén presentes al iniciar la aplicación

function validarVariablesEntorno(): void {
    const variablesRequeridas: string[] = [
        'DATABASE_URL',
        'JWT_SECRET',
    ];

    const variablesOpcionales: { [key: string]: string[] } = {
        'Cloudinary': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
    };

    // Validar variables requeridas
    const faltantes: string[] = [];
    for (const variable of variablesRequeridas) {
        if (!process.env[variable]) {
            faltantes.push(variable);
        }
    }

    if (faltantes.length > 0) {
        throw new Error(
            `❌ ERROR CRÍTICO: Variables de entorno faltantes: ${faltantes.join(', ')}\n` +
            `Por favor, configure estas variables en su archivo .env antes de iniciar la aplicación.`
        );
    }

    // Validar JWT_SECRET no sea el valor por defecto
    if (process.env.JWT_SECRET === 'secreto_por_defecto' || process.env.JWT_SECRET === 'secret') {
        throw new Error(
            '❌ ERROR CRÍTICO: JWT_SECRET no puede usar valores por defecto inseguros.\n' +
            'Por favor, configure una clave secreta segura en la variable JWT_SECRET.'
        );
    }

    // Validar longitud mínima de JWT_SECRET
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.warn(
            '⚠️  ADVERTENCIA: JWT_SECRET es muy corto (menos de 32 caracteres). ' +
            'Se recomienda usar una clave de al menos 32 caracteres para mayor seguridad.'
        );
    }

    // Validar variables opcionales (si se usa Cloudinary, todas deben estar)
    for (const [grupo, variables] of Object.entries(variablesOpcionales)) {
        const tieneAlguna = variables.some(v => process.env[v]);
        const tieneTodas = variables.every(v => process.env[v]);

        if (tieneAlguna && !tieneTodas) {
            const faltantes = variables.filter(v => !process.env[v]);
            throw new Error(
                `❌ ERROR: Si usa ${grupo}, debe configurar todas las variables: ${faltantes.join(', ')}`
            );
        }
    }

    console.log('✅ Variables de entorno validadas correctamente');
}

export default validarVariablesEntorno;
