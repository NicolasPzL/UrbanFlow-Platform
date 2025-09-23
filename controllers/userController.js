import { asyncHandler } from '../middlewares/asyncHandler.js';
import AppError from '../errors/AppError.js';
import { AuditService } from '../services/auditService.js';

class UserController {
    constructor(userService, auditService) {
        this.userService = userService;
        this.auditService = auditService;
    }

    createUser = asyncHandler(async (req, res) => {
        const userData = req.body;
        
        // Validación de campos requeridos
        if (!userData.nombre || !userData.correo || !userData.passwordHash) {
            throw new AppError('Datos inválidos: nombre, correo y passwordHash son requeridos', { 
                status: 400, 
                code: 'VALIDATION_ERROR' 
            });
        }

        const newUser = await this.userService.createUser(userData);
        
        // Auditoría
        await this.auditService.log({
            usuario_id: req.user?.id,
            accion: 'CREATE_USER',
            detalles: { usuario_id: newUser.usuario_id || newUser.id }
        });

        res.status(201).json({ success: true, data: newUser });
    });

    getUser = asyncHandler(async (req, res) => {
        const userId = req.params.id;
        const user = await this.userService.getUserById(userId);
        
        if (!user) {
            throw new AppError('Usuario no encontrado', { 
                status: 404, 
                code: 'NOT_FOUND' 
            });
        }

        res.status(200).json({ success: true, data: user });
    });

    updateUser = asyncHandler(async (req, res) => {
        const userId = req.params.id;
        const userData = req.body;
        
        const updatedUser = await this.userService.updateUser(userId, userData);
        
        if (!updatedUser) {
            throw new AppError('Usuario no encontrado', { 
                status: 404, 
                code: 'NOT_FOUND' 
            });
        }

        // Auditoría
        await this.auditService.log({
            usuario_id: req.user?.id,
            accion: 'UPDATE_USER',
            detalles: { 
                usuario_id: userId, 
                cambios: userData 
            }
        });

        res.status(200).json({ success: true, data: updatedUser });
    });

    deleteUser = asyncHandler(async (req, res) => {
        const userId = req.params.id;
        const currentUserId = req.user?.id;

        // Prevenir auto-eliminación
        if (currentUserId && currentUserId.toString() === userId) {
            throw new AppError('No puedes eliminar tu propio usuario', { 
                status: 403, 
                code: 'FORBIDDEN' 
            });
        }

        // Verificar si es el último admin (si aplica)
        await this._validateLastAdminProtection(userId);

        const deletedUser = await this.userService.deleteUser(userId);
        
        if (!deletedUser) {
            throw new AppError('Usuario no encontrado', { 
                status: 404, 
                code: 'NOT_FOUND' 
            });
        }

        // Auditoría
        await this.auditService.log({
            usuario_id: currentUserId,
            accion: 'DELETE_USER',
            detalles: { usuario_id: userId }
        });

        res.status(200).json({ 
            success: true, 
            message: 'Usuario eliminado exitosamente',
            data: deletedUser 
        });
    });

    getAllUsers = asyncHandler(async (req, res) => {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            rol, 
            isActive, 
            includeDeleted,
            sortBy = 'usuario_id',
            sortDir = 'desc'
        } = req.query;

        const users = await this.userService.getAllUsers({
            page: Number(page),
            limit: Number(limit),
            search: search || '',
            rol: rol || null,
            isActive: isActive === undefined ? null : isActive === 'true',
            includeDeleted: includeDeleted === 'true',
            sortBy,
            sortDir
        });

        res.status(200).json({ 
            success: true, 
            data: users.items || users.data,
            meta: {
                total: users.total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(users.total / Number(limit))
            }
        });
    });

    // Método auxiliar para protección del último admin
    async _validateLastAdminProtection(userId) {
        try {
            const isUserAdmin = await this.userService.isUserAdmin(userId);
            if (isUserAdmin) {
                const adminCount = await this.userService.getAdminCount();
                if (adminCount <= 1) {
                    throw new AppError('No puedes eliminar al último administrador del sistema', { 
                        status: 403, 
                        code: 'LAST_ADMIN' 
                    });
                }
            }
        } catch (error) {
            // Si falla la verificación, continuar sin protección (fail-open)
            console.warn('Error en verificación de admin:', error.message);
        }
    }
}

export default UserController;