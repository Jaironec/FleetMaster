// Tipos TypeScript para las respuestas de la API

// Tipos de respuesta genérica
export interface ApiResponse<T = unknown> {
    exito: boolean;
    mensaje?: string;
    datos?: T;
    errores?: Array<{
        campo: string;
        mensaje: string;
    }>;
}

export interface PaginatedResponse<T> {
    exito: boolean;
    datos: T[];
    paginacion: {
        total: number;
        pagina: number;
        limite: number;
        totalPaginas: number;
    };
}

// Tipos de Usuario
export interface Usuario {
    id: number;
    nombreUsuario: string;
    email: string;
    nombreCompleto: string;
    rol: 'ADMIN' | 'AUDITOR';
    activo: boolean;
}

export interface LoginResponse {
    mensaje: string;
    token: string;
    usuario: Usuario;
}

// Tipos de Vehículo
export interface Vehiculo {
    id: number;
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    tipo: string;
    capacidad: string;
    estado: 'ACTIVO' | 'EN_RUTA' | 'EN_MANTENIMIENTO' | 'INACTIVO';
    kilometrajeActual: number;
    fechaUltimoMantenimiento?: string;
    fechaProximoMantenimiento?: string;
    fechaVencimientoSoat?: string;
    fechaVencimientoSeguro?: string;
    fechaVencimientoMatricula?: string;
    observaciones?: string;
}

// Tipos de Chofer
export interface Chofer {
    id: number;
    nombres: string;
    apellidos: string;
    documentoId: string;
    telefono?: string;
    fechaVencimientoLicencia?: string;
    correo?: string;
    estado: 'ACTIVO' | 'INACTIVO';
    modalidadPago: 'POR_VIAJE' | 'MENSUAL';
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
    banco?: string;
    numeroCuenta?: string;
    sueldoMensual?: number;
    fechaContratacion?: string; // Nueva fecha de contratación
    diaPago?: number; // Calculado automáticamente
    pagoQuincenal: boolean;
}

// Tipos de Cliente
export interface Cliente {
    id: number;
    nombreRazonSocial: string;
    documentoId: string;
    telefono?: string;
    correo?: string;
    direccion?: string;
    sector?: string;
    estado: 'ACTIVO' | 'INACTIVO';
}

// Tipos de Material
export interface Material {
    id: number;
    nombre: string;
    unidadMedida: string;
    esPeligroso: boolean;
    descripcion?: string;
}

// Tipos de Viaje
export interface Viaje {
    id: number;
    vehiculoId: number;
    choferId: number;
    clienteId: number;
    materialId: number;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaEstimada?: string;
    fechaLlegadaReal?: string;
    kilometrosEstimados?: number;
    kilometrosReales?: number;
    tarifa: number;
    estadoPagoCliente: 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
    montoPagadoCliente: number;
    fechaLimitePago?: string;
    diasCredito: number;
    montoPagoChofer?: number;
    estado: 'PLANIFICADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
    observaciones?: string;
    vehiculo?: Vehiculo;
    chofer?: Chofer;
    cliente?: Cliente;
    material?: Material;
}

// Tipos de Gasto
export interface GastoViaje {
    id: number;
    viajeId: number;
    tipoGasto: 'COMBUSTIBLE' | 'PEAJE' | 'ALIMENTACION' | 'HOSPEDAJE' | 'MULTA' | 'OTRO';
    monto: number;
    fecha: string;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
    descripcion?: string;
    comprobante?: Comprobante;
}

// Tipos de Mantenimiento
export interface Mantenimiento {
    id: number;
    vehiculoId: number;
    tipo: 'PREVENTIVO' | 'CORRECTIVO';
    estado: 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
    descripcion?: string;
    taller?: string;
    esExterno: boolean;
    costoManoObra: number;
    costoRepuestos: number;
    costoTotal: number;
    fecha: string;
    fechaInicio?: string;
    fechaFin?: string;
    kilometrajeAlMomento?: number;
    proximaFecha?: string;
    proximoKilometraje?: number;
    vehiculo?: Vehiculo;
    comprobante?: Comprobante;
}

// Tipos de Pago Chofer
export interface PagoChofer {
    id: number;
    choferId: number;
    monto: number;
    fecha: string;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
    descripcion?: string;
    estado: 'PENDIENTE' | 'PAGADO';
    fechaPagoReal?: string;
    viajeId?: number;
    chofer?: Chofer;
    comprobante?: Comprobante;
}

// Tipos de Dashboard
export interface DashboardStats {
    vehiculos: { activos: number; total: number };
    choferes: { activos: number; total: number };
    clientes: { activos: number; total: number };
    materiales: { total: number };
    viajesMes?: {
        total: number;
        completados: number;
        ingresosTotal: number;
        gastosTotales: number;
        gananciaNeta: number;
        margenRentabilidad?: number;
        totalPorCobrar?: number;
    };
    topVehiculos?: Array<{
        vehiculoId: number;
        placa: string;
        marca: string;
        modelo: string;
        cantidadViajes: number;
        ingresosGenerados: number;
    }>;
    topClientes?: Array<{
        clienteId: number;
        nombre: string;
        ruc: string;
        cantidadViajes: number;
        ingresosGenerados: number;
    }>;
    resumenAlertas?: {
        documentos: number;
        mantenimiento: number;
        choferesSaldo: number;
        pagosChoferes?: number;
        licencias?: number;
        pagosViajes?: number;
        viajesProximos?: number;
        total: number;
    };
}

// Tipos de Alerta
export interface Alerta {
    tipo: 'VEHICULO' | 'CHOFER' | 'MANTENIMIENTO' | 'DOCUMENTO' | 'LICENCIA';
    nivel: 'INFO' | 'ADVERTENCIA' | 'URGENTE';
    titulo: string;
    mensaje: string;
    entidadId: number;
    entidadTipo: string;
    fecha: string;
}

// Tipos de Auditoría
export interface RegistroAuditoria {
    id: number;
    usuarioId: number;
    accion: 'CREAR' | 'EDITAR' | 'ELIMINAR';
    entidad: string;
    entidadId: number;
    datosAnteriores?: unknown;
    datosNuevos?: unknown;
    fechaHora: string;
    ipAddress?: string;
    usuario?: {
        id: number;
        nombreUsuario: string;
        nombreCompleto: string;
    };
}

// Comprobante reutilizable
export interface Comprobante {
    id: number;
    url: string;
    nombreArchivoOriginal: string;
    publicId?: string;
    tipo?: 'GASTO_VIAJE' | 'MANTENIMIENTO' | 'PAGO_CHOFER';
    referenciaId?: number;
}

// Extensiones de Viaje con relaciones y metadatos
export interface ViajeDetalle extends Viaje {
    gastos?: GastoViaje[];
    pagos?: PagoChofer[];
    creadoEn?: string;
    actualizadoEn?: string;
}

// ============================================
// DTOs para operaciones CRUD (Type Safety)
// ============================================

// Estados tipados para badges y filtros
export type EstadoViaje = 'PLANIFICADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
export type EstadoVehiculo = 'ACTIVO' | 'EN_RUTA' | 'EN_MANTENIMIENTO' | 'INACTIVO';
export type EstadoChofer = 'ACTIVO' | 'INACTIVO';
export type EstadoCliente = 'ACTIVO' | 'INACTIVO';
export type EstadoPagoCliente = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
export type EstadoPagoChofer = 'PENDIENTE' | 'PAGADO';
export type TipoGasto = 'COMBUSTIBLE' | 'PEAJE' | 'ALIMENTACION' | 'HOSPEDAJE' | 'MULTA' | 'OTRO';
export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
export type ModalidadPago = 'POR_VIAJE' | 'MENSUAL';
export type TipoMantenimiento = 'PREVENTIVO' | 'CORRECTIVO';
export type EstadoMantenimiento = 'PENDIENTE' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';

// Mapeo de estados para UI (badges) - usado en Viajes.tsx
export interface EstadoConfig {
    label: string;
    class: string;
}

export const ESTADOS_VIAJE: Record<EstadoViaje, EstadoConfig> = {
    PLANIFICADO: { label: 'Planificado', class: 'badge-neutral' },
    EN_CURSO: { label: 'En Curso', class: 'badge-info' },
    COMPLETADO: { label: 'Completado', class: 'badge-success' },
    CANCELADO: { label: 'Cancelado', class: 'badge-danger' },
};

// DTOs para crear/actualizar entidades
export interface CrearVehiculoDTO {
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    tipo: string;
    capacidad: string;
    estado?: EstadoVehiculo;
    kilometrajeActual?: number;
    fechaVencimientoSoat?: string;
    fechaVencimientoSeguro?: string;
    fechaVencimientoMatricula?: string;
    observaciones?: string;
}

export interface ActualizarVehiculoDTO extends Partial<CrearVehiculoDTO> { }

export interface CrearChoferDTO {
    nombres: string;
    apellidos: string;
    documentoId: string;
    telefono?: string;
    fechaVencimientoLicencia?: string;
    correo?: string;
    estado?: EstadoChofer;
    modalidadPago?: ModalidadPago;
    metodoPago?: MetodoPago;
    banco?: string;
    numeroCuenta?: string;
    sueldoMensual?: number;
    fechaContratacion?: string; // Nueva fecha de contratación
    diaPago?: number; // Calculado automáticamente
    pagoQuincenal?: boolean;
}

export interface ActualizarChoferDTO extends Partial<CrearChoferDTO> { }

export interface CrearClienteDTO {
    nombreRazonSocial: string;
    documentoId: string;
    telefono?: string;
    correo?: string;
    direccion?: string;
    sector?: string;
    estado?: EstadoCliente;
}

export interface ActualizarClienteDTO extends Partial<CrearClienteDTO> { }

export interface CrearMaterialDTO {
    nombre: string;
    unidadMedida: string;
    esPeligroso?: boolean;
    descripcion?: string;
}

export interface ActualizarMaterialDTO extends Partial<CrearMaterialDTO> { }

export interface CrearViajeDTO {
    vehiculoId: number;
    choferId: number;
    clienteId: number;
    materialId: number;
    origen: string;
    destino: string;
    fechaSalida: string;
    fechaLlegadaEstimada?: string;
    kilometrosEstimados?: number;
    tarifa: number;
    montoPagoChofer?: number;
    diasCredito?: number;
    observaciones?: string;
}

export interface ActualizarViajeDTO extends Partial<CrearViajeDTO> {
    estado?: EstadoViaje;
    estadoPagoCliente?: EstadoPagoCliente;
    montoPagadoCliente?: number;
    fechaLlegadaReal?: string;
    kilometrosReales?: number;
}

export interface CrearGastoDTO {
    viajeId: number;
    tipoGasto: TipoGasto;
    monto: number;
    fecha: string;
    metodoPago?: MetodoPago;
    descripcion?: string;
}

export interface ActualizarGastoDTO extends Partial<Omit<CrearGastoDTO, 'viajeId'>> { }

export interface CrearMantenimientoDTO {
    vehiculoId: number;
    tipo: TipoMantenimiento;
    descripcion?: string;
    taller?: string;
    esExterno?: boolean;
    costoManoObra?: number;
    costoRepuestos?: number;
    fecha: string;
    kilometrajeAlMomento?: number;
    proximaFecha?: string;
    proximoKilometraje?: number;
}

export interface ActualizarMantenimientoDTO extends Partial<CrearMantenimientoDTO> {
    estado?: EstadoMantenimiento;
    fechaInicio?: string;
    fechaFin?: string;
    costoTotal?: number;
}

export interface CrearPagoChoferDTO {
    choferId: number;
    monto: number;
    fecha: string;
    metodoPago?: MetodoPago;
    descripcion?: string;
    viajeId?: number;
}

export interface ActualizarPagoChoferDTO extends Partial<Omit<CrearPagoChoferDTO, 'choferId'>> {
    estado?: EstadoPagoChofer;
    fechaPagoReal?: string;
}

// Filtros tipados para listados
export interface FiltrosViaje {
    estado?: EstadoViaje;
    estadoPagoCliente?: EstadoPagoCliente;
    vehiculoId?: number;
    choferId?: number;
    clienteId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
}

export interface FiltrosVehiculo {
    estado?: EstadoVehiculo;
}

export interface FiltrosChofer {
    estado?: EstadoChofer;
}

export interface FiltrosCliente {
    estado?: EstadoCliente;
}

export interface FiltrosMantenimiento {
    vehiculoId?: number;
    estado?: EstadoMantenimiento;
    tipo?: TipoMantenimiento;
}

export interface FiltrosPagoChofer {
    choferId?: number;
    estado?: EstadoPagoChofer;
    fechaDesde?: string;
    fechaHasta?: string;
}

// Error de API tipado
export interface ApiError {
    mensaje: string;
    errores?: Array<{ campo: string; mensaje: string }>;
    toastShown?: boolean;
}
