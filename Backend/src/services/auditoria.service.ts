// Servicio de Auditoría
import { auditoriaRepository, FiltrosAuditoria } from '../repositories/auditoria.repository';

export const auditoriaService = {
    async listar(filtros: FiltrosAuditoria) {
        return auditoriaRepository.findAll(filtros);
    },

    async obtenerDetalle(id: number) {
        const registro = await auditoriaRepository.findById(id);
        if (!registro) {
            throw new Error('Registro de auditoría no encontrado');
        }
        return registro;
    },

    async getEntidadesUnicas() {
        return auditoriaRepository.getEntidadesUnicas();
    }
};
