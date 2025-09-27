// routes/roleRoutes.js (ESM) - CRUD de roles
import express from 'express';
import * as roleController from '../controllers/roleController.js';

const router = express.Router();

// Listar roles
router.get('/', roleController.list);

// Crear rol
router.post('/', roleController.create);

// Actualizar rol
router.put('/:id', roleController.update);

// Eliminar rol (soft delete)
router.delete('/:id', roleController.softDelete);

export default router;
