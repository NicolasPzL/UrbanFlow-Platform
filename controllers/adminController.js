const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const { Usuario } = require('../models/userModel');
const { Cabina } = require('../models/cabinaModel');
const { Medicion } = require('../models/medicionModel');
const { Sequelize } = require('sequelize');

module.exports = {
  listarUsuarios: asyncHandler(async (req, res) => {
    const { pagina = 1, limite = 10, rol, estado } = req.query;
    
    // Construir filtros
    const whereConditions = {};
    if (rol) whereConditions.rol = rol;
    if (estado) whereConditions.estado = estado;

    // Calcular paginación
    const offset = (pagina - 1) * limite;

    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where: whereConditions,
      attributes: { 
        exclude: ['password_hash', 'reset_token', 'locked_until'] 
      },
      limit: parseInt(limite),
      offset: offset,
      order: [['fecha_creacion', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: usuarios,
      pagination: {
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        total: count,
        paginas: Math.ceil(count / limite)
      }
    });
  }),

  obtenerEstadisticas: asyncHandler(async (req, res) => {
    // Estadísticas de cabinas por estado
    const estadisticasCabinas = await Cabina.findAll({
      attributes: [
        'estado_actual',
        [Sequelize.fn('COUNT', Sequelize.col('cabina_id')), 'total']
      ],
      group: ['estado_actual']
    });

    // Últimas 24 horas de mediciones para tendencias
    const veinticuatroHorasAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const alertasRecientes = await Medicion.count({
      where: {
        timestamp: { [Sequelize.Op.gte]: veinticuatroHorasAtras },
        estado_procesado: { [Sequelize.Op.in]: ['alerta', 'fallo'] }
      }
    });

    // Ocupación promedio (simulación - en producción vendría de sensores de peso)
    const ocupacionPromedio = await Medicion.findOne({
      attributes: [
        [Sequelize.fn('AVG', Sequelize.literal('RANDOM() * 100')), 'ocupacion_promedio']
      ],
      where: {
        timestamp: { [Sequelize.Op.gte]: veinticuatroHorasAtras }
      }
    });

    // Usuarios activos hoy (simulación - basado en logins)
    const usuariosActivosHoy = await Usuario.count({
      where: {
        ultimo_login: { [Sequelize.Op.gte]: new Date().setHours(0, 0, 0, 0) }
      }
    });

    // Resumen de estados de cabinas
    const resumenCabinas = estadisticasCabinas.reduce((acc, item) => {
      acc[item.estado_actual] = parseInt(item.get('total'));
      return acc;
    }, { operativo: 0, inusual: 0, alerta: 0, 'fuera de servicio': 0 });

    const estadisticas = {
      cabinas: {
        total: Object.values(resumenCabinas).reduce((sum, val) => sum + val, 0),
        ...resumenCabinas
      },
      alertas: {
        ultimas_24h: alertasRecientes,
        activas: resumenCabinas.alerta + resumenCabinas['fuera de servicio']
      },
      operacion: {
        ocupacion_promedio: Math.round(ocupacionPromedio?.get('ocupacion_promedio') || 65),
        usuarios_activos_hoy: usuariosActivosHoy
      },
      tendencias: {
        // En producción: comparar con período anterior
        variacion_ocupacion: 2.5,
        variacion_alertas: -1.2
      }
    };

    res.status(200).json({
      success: true,
      data: estadisticas,
      ultima_actualizacion: new Date().toISOString()
    });
  }),

  // Método adicional para dashboard administrativo
  obtenerMetricasTiempoReal: asyncHandler(async (req, res) => {
    // Métricas en tiempo real para refresco automático del dashboard
    const cabinasActivas = await Cabina.count({
      where: { estado_actual: 'operativo' }
    });

    const alertasPendientes = await Medicion.count({
      where: { 
        estado_procesado: 'alerta',
        timestamp: { [Sequelize.Op.gte]: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Últimas 2 horas
      }
    });

    res.status(200).json({
      success: true,
      data: {
        cabinas_activas: cabinasActivas,
        alertas_pendientes: alertasPendientes,
        timestamp: new Date().toISOString()
      }
    });
  })
};