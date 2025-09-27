const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const Horario = require('../models/horarioModel');
const Audit = require('../models/auditoriaModel');

module.exports = {
  listarHorarios: asyncHandler(async (req, res) => {
    const { ruta_id, dia_semana, isActive, limit, offset } = req.query;
    
    const data = await Horario.listar({
      ruta_id: ruta_id || null,
      dia_semana: dia_semana || null,
      isActive: isActive === undefined ? true : isActive === 'true',
      limit: Number(limit) || 50,
      offset: Number(offset) || 0
    });

    res.status(200).json({ 
      success: true, 
      data: data.items, 
      meta: { 
        total: data.total, 
        limit: Number(limit) || 50, 
        offset: Number(offset) || 0 
      } 
    });
  }),

  obtenerHorario: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const horario = await Horario.obtenerPorId(id);
    if (!horario) {
      throw new AppError('Horario no encontrado', { status: 404, code: 'HORARIO_NOT_FOUND' });
    }

    res.status(200).json({ success: true, data: horario });
  }),

  crearHorario: asyncHandler(async (req, res) => {
    const { ruta_id, dia_semana, hora_inicio, hora_fin, frecuencia, tipo_horario } = req.body;

    // Validaciones básicas
    if (!ruta_id || !dia_semana || !hora_inicio || !hora_fin) {
      throw new AppError('Datos incompletos: ruta_id, dia_semana, hora_inicio y hora_fin son obligatorios', { 
        status: 400, 
        code: 'VALIDATION_ERROR' 
      });
    }

    // Validar formato de horas
    if (!isValidTimeFormat(hora_inicio) || !isValidTimeFormat(hora_fin)) {
      throw new AppError('Formato de hora inválido. Use HH:MM:SS', { status: 400, code: 'INVALID_TIME_FORMAT' });
    }

    // Validar que hora_inicio sea menor que hora_fin
    if (hora_inicio >= hora_fin) {
      throw new AppError('La hora de inicio debe ser anterior a la hora de fin', { status: 400, code: 'INVALID_TIME_RANGE' });
    }

    // Validar día de la semana (0-6 donde 0 es domingo)
    if (dia_semana < 0 || dia_semana > 6) {
      throw new AppError('Día de la semana debe estar entre 0 (domingo) y 6 (sábado)', { status: 400, code: 'INVALID_DAY' });
    }

    // Verificar superposición de horarios para la misma ruta y día
    const horarioSuperpuesto = await Horario.verificarSuperposicion(ruta_id, dia_semana, hora_inicio, hora_fin);
    if (horarioSuperpuesto) {
      throw new AppError('Ya existe un horario superpuesto para esta ruta y día', { status: 409, code: 'SCHEDULE_OVERLAP' });
    }

    const nuevoHorario = await Horario.crear({
      ruta_id,
      dia_semana,
      hora_inicio,
      hora_fin,
      frecuencia: frecuencia || 5, // Frecuencia en minutos por defecto
      tipo_horario: tipo_horario || 'normal', // normal, pico, fin_de_semana
      usuario_creacion: req.user.id
    });

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'CREATE_SCHEDULE', 
      detalles: { 
        horario_id: nuevoHorario.horario_id,
        ruta_id: ruta_id,
        dia_semana: dia_semana
      } 
    });

    res.status(201).json({ success: true, data: nuevoHorario });
  }),

  actualizarHorario: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dia_semana, hora_inicio, hora_fin, frecuencia, tipo_horario, activo } = req.body;

    // Verificar que el horario existe
    const horarioExistente = await Horario.obtenerPorId(id);
    if (!horarioExistente) {
      throw new AppError('Horario no encontrado', { status: 404, code: 'HORARIO_NOT_FOUND' });
    }

    // Validaciones de formato si se proporcionan horas
    if (hora_inicio && !isValidTimeFormat(hora_inicio)) {
      throw new AppError('Formato de hora_inicio inválido. Use HH:MM:SS', { status: 400, code: 'INVALID_TIME_FORMAT' });
    }

    if (hora_fin && !isValidTimeFormat(hora_fin)) {
      throw new AppError('Formato de hora_fin inválido. Use HH:MM:SS', { status: 400, code: 'INVALID_TIME_FORMAT' });
    }

    // Validar rango de horas si se actualizan ambas
    const horaInicioFinal = hora_inicio || horarioExistente.hora_inicio;
    const horaFinFinal = hora_fin || horarioExistente.hora_fin;
    
    if (horaInicioFinal >= horaFinFinal) {
      throw new AppError('La hora de inicio debe ser anterior a la hora de fin', { status: 400, code: 'INVALID_TIME_RANGE' });
    }

    // Verificar superposición (excluyendo el horario actual)
    if (hora_inicio || hora_fin || dia_semana) {
      const horarioSuperpuesto = await Horario.verificarSuperposicion(
        horarioExistente.ruta_id, 
        dia_semana || horarioExistente.dia_semana, 
        horaInicioFinal, 
        horaFinFinal, 
        id
      );
      
      if (horarioSuperpuesto) {
        throw new AppError('Ya existe otro horario superpuesto para esta ruta y día', { status: 409, code: 'SCHEDULE_OVERLAP' });
      }
    }

    const horarioActualizado = await Horario.actualizar(id, {
      dia_semana,
      hora_inicio,
      hora_fin,
      frecuencia,
      tipo_horario,
      activo,
      usuario_modificacion: req.user.id
    });

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'UPDATE_SCHEDULE', 
      detalles: { 
        horario_id: id,
        cambios: req.body
      } 
    });

    res.status(200).json({ success: true, data: horarioActualizado });
  }),

  eliminarHorario: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verificar que el horario existe
    const horarioExistente = await Horario.obtenerPorId(id);
    if (!horarioExistente) {
      throw new AppError('Horario no encontrado', { status: 404, code: 'HORARIO_NOT_FOUND' });
    }

    await Horario.eliminar(id);

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'DELETE_SCHEDULE', 
      detalles: { horario_id: id } 
    });

    res.status(200).json({ 
      success: true, 
      message: 'Horario eliminado correctamente',
      data: { horario_id: id }
    });
  }),

  // Método para obtener horarios por ruta y día
  obtenerHorariosPorRuta: asyncHandler(async (req, res) => {
    const { ruta_id } = req.params;
    const { dia_semana } = req.query;

    if (!ruta_id) {
      throw new AppError('El parámetro ruta_id es obligatorio', { status: 400, code: 'MISSING_ROUTE_ID' });
    }

    const horarios = await Horario.obtenerPorRutaYDia(ruta_id, dia_semana);

    res.status(200).json({ 
      success: true, 
      data: horarios 
    });
  }),

  // Método para obtener el horario operativo actual del sistema
  obtenerHorarioOperativoActual: asyncHandler(async (req, res) => {
    const ahora = new Date();
    const diaSemana = ahora.getDay(); // 0-6
    const horaActual = ahora.toTimeString().slice(0, 8); // HH:MM:SS

    const horariosActivos = await Horario.obtenerHorariosActivos(diaSemana, horaActual);

    res.status(200).json({ 
      success: true, 
      data: {
        horarios: horariosActivos,
        timestamp: ahora.toISOString(),
        dia_semana: diaSemana,
        hora_actual: horaActual
      }
    });
  }),

  // Método para obtener estadísticas de operación por horarios
  obtenerEstadisticasHorarios: asyncHandler(async (req, res) => {
    const { ruta_id, fecha_inicio, fecha_fin } = req.query;

    const estadisticas = await Horario.obtenerEstadisticasOperacion({
      ruta_id: ruta_id || null,
      fecha_inicio: fecha_inicio || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Últimos 7 días por defecto
      fecha_fin: fecha_fin || new Date().toISOString()
    });

    res.status(200).json({ 
      success: true, 
      data: estadisticas 
    });
  })
};

// Función auxiliar para validar formato de hora
function isValidTimeFormat(time) {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
  return timeRegex.test(time);
}