const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const { Notificacion } = require('../models/notificationModel');
const { Usuario } = require('../models/userModel');
const { Cabina } = require('../models/cabinaModel');
const { Medicion } = require('../models/medicionModel');
const { Sequelize } = require('sequelize');

module.exports = {
  listarNotificacionesUsuario: asyncHandler(async (req, res) => {
    const { usuarioId } = req.params;
    const { tipo, leida, limit = 20, offset = 0 } = req.query;
    
    // Validar que el usuario solo acceda a sus propias notificaciones
    if (req.user.rol !== 'administrador' && req.user.usuario_id !== usuarioId) {
      throw new AppError('No tienes permisos para ver estas notificaciones', { 
        status: 403, 
        code: 'FORBIDDEN' 
      });
    }

    // Construir filtros
    const whereConditions = { usuario_id: usuarioId };
    if (tipo) whereConditions.tipo = tipo;
    if (leida !== undefined) whereConditions.leida = leida === 'true';

    const notificaciones = await Notificacion.findAll({
      where: whereConditions,
      include: [
        {
          model: Cabina,
          attributes: ['cabina_id', 'codigo_interno', 'estado_actual'],
          required: false
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json({
      success: true,
      data: notificaciones,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: await Notificacion.count({ where: whereConditions })
      }
    });
  }),

  crearNotificacion: asyncHandler(async (req, res) => {
    const { tipo, titulo, mensaje, prioridad, usuario_id, cabina_id, relacionado_con } = req.body;
    
    // Validar campos requeridos
    if (!tipo || !titulo || !mensaje || !prioridad) {
      throw new AppError('Faltan campos requeridos: tipo, titulo, mensaje, prioridad', {
        status: 400,
        code: 'VALIDATION_ERROR'
      });
    }

    // Validar permisos (solo admin o sistema pueden crear notificaciones)
    if (req.user.rol !== 'administrador' && req.user.rol !== 'sistema') {
      throw new AppError('No tienes permisos para crear notificaciones', {
        status: 403,
        code: 'FORBIDDEN'
      });
    }

    // Validar cabina si se especifica
    if (cabina_id) {
      const cabina = await Cabina.findByPk(cabina_id);
      if (!cabina) {
        throw new AppError('La cabina especificada no existe', {
          status: 404,
          code: 'CABINA_NOT_FOUND'
        });
      }
    }

    // Validar usuario si se especifica
    if (usuario_id) {
      const usuario = await Usuario.findByPk(usuario_id);
      if (!usuario) {
        throw new AppError('El usuario especificado no existe', {
          status: 404,
          code: 'USER_NOT_FOUND'
        });
      }
    }

    // Crear notificación
    const notificacion = await Notificacion.create({
      tipo,
      titulo,
      mensaje,
      prioridad,
      usuario_id: usuario_id || null, // null = notificación global
      cabina_id: cabina_id || null,
      relacionado_con: relacionado_con || null,
      leida: false,
      fecha_creacion: new Date()
    });

    // Incluir datos relacionados en la respuesta
    const notificacionCompleta = await Notificacion.findByPk(notificacion.notificacion_id, {
      include: [
        {
          model: Cabina,
          attributes: ['cabina_id', 'codigo_interno', 'estado_actual'],
          required: false
        },
        {
          model: Usuario,
          attributes: ['usuario_id', 'nombre', 'correo'],
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: notificacionCompleta,
      message: 'Notificación creada exitosamente'
    });
  }),

  eliminarNotificacion: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notificacion = await Notificacion.findByPk(id);
    if (!notificacion) {
      throw new AppError('Notificación no encontrada', {
        status: 404,
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    // Validar permisos (solo admin o usuario dueño puede eliminar)
    if (req.user.rol !== 'administrador' && notificacion.usuario_id !== req.user.usuario_id) {
      throw new AppError('No tienes permisos para eliminar esta notificación', {
        status: 403,
        code: 'FORBIDDEN'
      });
    }

    await notificacion.destroy();

    res.status(200).json({
      success: true,
      message: 'Notificación eliminada exitosamente',
      data: { notificacion_id: id }
    });
  }),

  // Método adicional: Marcar notificación como leída
  marcarComoLeida: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notificacion = await Notificacion.findByPk(id);
    if (!notificacion) {
      throw new AppError('Notificación no encontrada', {
        status: 404,
        code: 'NOTIFICATION_NOT_FOUND'
      });
    }

    // Validar que el usuario es el dueño o admin
    if (req.user.rol !== 'administrador' && notificacion.usuario_id !== req.user.usuario_id) {
      throw new AppError('No tienes permisos para modificar esta notificación', {
        status: 403,
        code: 'FORBIDDEN'
      });
    }

    await notificacion.update({
      leida: true,
      fecha_lectura: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída',
      data: notificacion
    });
  }),

  // Método para crear notificación automática por alerta de cabina (integrado con modelo IA)
  crearNotificacionAlertaCabina: asyncHandler(async (req, res) => {
    const { cabina_id, medicion_id, nivel_alerta, detalles } = req.body;

    // Este método es llamado automáticamente por el sistema cuando el modelo de IA detecta anomalías
    const cabina = await Cabina.findByPk(cabina_id);
    if (!cabina) {
      throw new AppError('Cabina no encontrada', {
        status: 404,
        code: 'CABINA_NOT_FOUND'
      });
    }

    const medicion = await Medicion.findByPk(medicion_id);
    if (!medicion) {
      throw new AppError('Medición no encontrada', {
        status: 404,
        code: 'MEASUREMENT_NOT_FOUND'
      });
    }

    // Determinar tipo y prioridad según nivel de alerta
    const configAlerta = {
      alerta: { tipo: 'alerta_tecnica', prioridad: 'media', titulo: 'Alerta Técnica' },
      fallo: { tipo: 'fallo_tecnico', prioridad: 'alta', titulo: 'Fallo Técnico' }
    };

    const config = configAlerta[nivel_alerta] || configAlerta.alerta;

    const notificacion = await Notificacion.create({
      tipo: config.tipo,
      titulo: `${config.titulo} - Cabina ${cabina.codigo_interno}`,
      mensaje: `Se detectó una anomalía en la cabina ${cabina.codigo_interno}. ${detalles || 'Revisión recomendada.'}`,
      prioridad: config.prioridad,
      usuario_id: null, // Notificación global para operadores
      cabina_id: cabina_id,
      relacionado_con: medicion_id,
      leida: false,
      fecha_creacion: new Date()
    });

    res.status(201).json({
      success: true,
      data: notificacion,
      message: 'Notificación de alerta creada automáticamente'
    });
  })
};