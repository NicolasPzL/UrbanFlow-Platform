// routes/userRoutes.js (ESM) - CRUD canónico de usuarios
import express from 'express';
import * as userController from '../controllers/userController.js';
import { validateCreateUser, validateUpdateUser } from '../validators/userValidator.js';

const router = express.Router();

// Listar usuarios
router.get('/', userController.listUsers);

// Obtener usuario por ID
router.get('/:id', userController.getUser);

// Crear usuario
router.post('/', validateCreateUser, userController.createUser);

// Actualizar usuario
router.put('/:id', validateUpdateUser, userController.updateUser);

// Eliminar usuario (soft delete)
router.delete('/:id', userController.removeUser);

export default router;