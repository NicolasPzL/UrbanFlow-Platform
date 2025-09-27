const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const { Opinion } = require('../models/opinionModel');
const { Usuario } = require('../models/userModel');
const { Ruta } = require('../models/routeModel');
const { Cabina } = require('../models/cabinaModel');
const { Sequelize } = require('sequelize');

module.exports = {
  crearOpinion: asyncHandler(async (req, res) => {
    const { ruta_id, cabina_id, calificacion, comentario, fecha_viaje } = req.body;
    const usuario_id = req.user.usuario_id;

    // Validar campos requeridos
    if (!calificacion || !comentario) {
      throw new AppError('Calificación y comentario son requeridos', {
        status: 400,
        code: 'VALIDATION_ERROR'
      });
    }

    // Validar rango de calificación (1-5 estrellas)
    if (calificacion < 1 || calificacion > 5) {
      throw new AppError('La calificación debe estar entre 1 y 5 estrellas', {
        status: 400,
        code: 'INVALID_RATING'
      });
    }

    // Validar longitud del comentario
    if (comentario.length < 10 || comentario.length > 500) {
      throw new AppError('El comentario debe tener entre 10 y 500 caracteres', {
        status: 400,
        code: 'INVALID_COMMENT_LENGTH'
      });
    }

    // Validar que la ruta existe si se especifica
    if (ruta_id) {
      const ruta = await Ruta.findByPk(ruta_id);
      if (!ruta) {
        throw new AppError('La ruta especificada no existe', {
          status: 404,
          code: 'ROUTE_NOT_FOUND'
        });
      }
    }

    // Validar que la cabina existe si se especifica
    if (cabina_id) {
      const cabina = await Cabina.findByPk(cabina_id);
      if (!cabina) {
        throw new AppError('La cabina especificada no existe', {
          status: 404,
          code: 'CABINA_NOT_FOUND'
        });
      }
    }

    // Verificar si el usuario ya opinó sobre esta combinación (ruta/cabina) hoy
    const hoy = new Date().toISOString().split('T')[0];
    const opinionExistente = await Opinion.findOne({
      where: {
        usuario_id,
        ruta_id: ruta_id || null,
        cabina_id: cabina_id || null,
        fecha_creacion: {
          [Sequelize.Op.gte]: hoy
        }
      }
    });

    if (opinionExistente) {
      throw new AppError('Ya has enviado una opinión para este servicio hoy', {
        status: 400,
        code: 'DUPLICATE_REVIEW'
      });
    }

    // Crear la opinión
    const opinion = await Opinion.create({
      usuario_id,
      ruta_id: ruta_id || null,
      cabina_id: cabina_id || null,
      calificacion: parseInt(calificacion),
      comentario: comentario.trim(),
      fecha_viaje: fecha_viaje || new Date(),
      fecha_creacion: new Date(),
      estado: 'activa'
    });

    // Obtener opinión con datos relacionados
    const opinionCompleta = await Opinion.findByPk(opinion.opinion_id, {
      include: [
        {
          model: Usuario,
          attributes: ['usuario_id', 'nombre', 'correo']
        },
        {
          model: Ruta,
          attributes: ['ruta_id', 'nombre'],
          required: false
        },
        {
          model: Cabina,
          attributes: ['cabina_id', 'codigo_interno'],
          required: false
        }
      ]
    });

    // Recalcular promedio de calificaciones para la ruta (si aplica)
    if (ruta_id) {
      await this.recalcularPromedioRuta(ruta_id);
    }

    res.status(201).json({
      success: true,
      data: opinionCompleta,
      message: 'Opinión creada exitosamente'
    });
  }),

  listarOpinionesPorRuta: asyncHandler(async (req, res) => {
    const { rutaId } = req.params;
    const { pagina = 1, limite = 10, ordenar = 'recientes', calificacion_min } = req.query;

    // Validar que la ruta existe
    const ruta = await Ruta.findByPk(rutaId);
    if (!ruta) {
      throw new AppError('La ruta especificada no existe', {
        status: 404,
        code: 'ROUTE_NOT_FOUND'
      });
    }

    // Construir filtros
    const whereConditions = { ruta_id: rutaId, estado: 'activa' };
    if (calificacion_min) {
      whereConditions.calificacion = { [Sequelize.Op.gte]: parseInt(calificacion_min) };
    }

    // Configurar ordenamiento
    const order = [];
    if (ordenar === 'recientes') {
      order.push(['fecha_creacion', 'DESC']);
    } else if (ordenar === 'antiguas') {
      order.push(['fecha_creacion', 'ASC']);
    } else if (ordenar === 'mejores') {
      order.push(['calificacion', 'DESC']);
    } else if (ordenar === 'peores') {
      order.push(['calificacion', 'ASC']);
    }

    // Calcular paginación
    const offset = (pagina - 1) * limite;

    const { count, rows: opiniones } = await Opinion.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Usuario,
          attributes: ['usuario_id', 'nombre']
        }
      ],
      order,
      limit: parseInt(limite),
      offset: offset,
      attributes: { exclude: ['usuario_id'] } // No exponer ID del usuario por privacidad
    });

    // Calcular estadísticas de la ruta
    const estadisticas = await Opinion.findAll({
      where: { ruta_id: rutaId, estado: 'activa' },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('calificacion')), 'promedio_calificacion'],
        [Sequelize.fn('COUNT', Sequelize.col('opinion_id')), 'total_opiniones'],
        [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('usuario_id'))), 'usuarios_unicos']
      ],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        ruta: {
          ruta_id: ruta.ruta_id,
          nombre: ruta.nombre,
          estadisticas: {
            promedio_calificacion: parseFloat(estadisticas[0]?.promedio_calificacion || 0).toFixed(1),
            total_opiniones: parseInt(estadisticas[0]?.total_opiniones || 0),
            usuarios_unicos: parseInt(estadisticas[0]?.usuarios_unicos || 0)
          }
        },
        opiniones
      },
      pagination: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total: count,
        paginas: Math.ceil(count / limite)
      }
    });
  }),

  eliminarOpinion: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const usuario_id = req.user.usuario_id;

    const opinion = await Opinion.findByPk(id, {
      include: [{ model: Usuario, attributes: ['usuario_id', 'nombre'] }]
    });

    if (!opinion) {
      throw new AppError('Opinión no encontrada', {
        status: 404,
        code: 'REVIEW_NOT_FOUND'
      });
    }

    // Validar permisos (solo admin o usuario dueño puede eliminar)
    if (req.user.rol !== 'administrador' && opinion.usuario_id !== usuario_id) {
      throw new AppError('No tienes permisos para eliminar esta opinión', {
        status: 403,
        code: 'FORBIDDEN'
      });
    }

    // Borrado lógico (marcar como inactiva en lugar de eliminar)
    await opinion.update({ estado: 'inactiva' });

    // Recalcular promedio si era una opinión activa sobre una ruta
    if (opinion.estado === 'activa' && opinion.ruta_id) {
      await this.recalcularPromedioRuta(opinion.ruta_id);
    }

    res.status(200).json({
      success: true,
      message: 'Opinión eliminada exitosamente',
      data: { opinion_id: id }
    });
  }),

  // Método auxiliar para recalcular promedios
  recalcularPromedioRuta: async (ruta_id) => {
    const estadisticas = await Opinion.findAll({
      where: { ruta_id, estado: 'activa' },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('calificacion')), 'nuevo_promedio'],
        [Sequelize.fn('COUNT', Sequelize.col('opinion_id')), 'total_activas']
      ],
      raw: true
    });

    // Actualizar estadísticas en la tabla de rutas
    await Ruta.update(
      {
        promedio_calificacion: parseFloat(estadisticas[0]?.nuevo_promedio || 0),
        total_opiniones: parseInt(estadisticas[0]?.total_activas || 0)
      },
      { where: { ruta_id } }
    );
  },

  // Método adicional: Obtener opiniones recientes para dashboard
  obtenerOpinionesRecientes: asyncHandler(async (req, res) => {
    const { limite = 5 } = req.query;

    const opiniones = await Opinion.findAll({
      where: { estado: 'activa' },
      include: [
        {
          model: Usuario,
          attributes: ['nombre']
        },
        {
          model: Ruta,
          attributes: ['nombre'],
          required: false
        }
      ],
      order: [['fecha_creacion', 'DESC']],
      limit: parseInt(limite),
      attributes: ['opinion_id', 'calificacion', 'comentario', 'fecha_creacion']
    });

    res.status(200).json({
      success: true,
      data: opiniones
    });
  })
};