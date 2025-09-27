const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const Parada = require('../models/paradaModel');
const Audit = require('../models/auditoriaModel');

module.exports = {
  listarParadas: asyncHandler(async (req, res) => {
    const { ruta_id, tipo_parada, isActive, includeDeleted, limit, offset, search } = req.query;
    
    const data = await Parada.listar({
      ruta_id: ruta_id || null,
      tipo_parada: tipo_parada || null,
      isActive: isActive === undefined ? true : isActive === 'true',
      includeDeleted: includeDeleted === 'true',
      search: search || '',
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

  obtenerParada: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const parada = await Parada.obtenerPorId(id);
    if (!parada) {
      throw new AppError('Parada no encontrada', { status: 404, code: 'PARADA_NOT_FOUND' });
    }

    // Obtener información adicional: cabinas en la parada, tiempos de espera, etc.
    const informacionAdicional = await Parada.obtenerInformacionAdicional(id);

    res.status(200).json({ 
      success: true, 
      data: {
        ...parada,
        ...informacionAdicional,
        ultima_actualizacion: new Date().toISOString()
      }
    });
  }),

  crearParada: asyncHandler(async (req, res) => {
    const { 
      nombre_parada, 
      descripcion, 
      latitud, 
      longitud, 
      altitud, 
      tipo_parada, 
      ruta_id, 
      orden,
      capacidad_maxima,
      tiempo_embarque_promedio 
    } = req.body;

    // Validaciones básicas
    if (!nombre_parada || !latitud || !longitud || !tipo_parada || !ruta_id) {
      throw new AppError('Datos incompletos: nombre_parada, latitud, longitud, tipo_parada y ruta_id son obligatorios', { 
        status: 400, 
        code: 'VALIDATION_ERROR' 
      });
    }

    // Validar coordenadas GPS
    if (!isValidLatitude(latitud) || !isValidLongitude(longitud)) {
      throw new AppError('Coordenadas GPS inválidas', { status: 400, code: 'INVALID_COORDINATES' });
    }

    // Validar tipo de parada
    const tiposValidos = ['terminal', 'intermedia', 'transferencia'];
    if (!tiposValidos.includes(tipo_parada)) {
      throw new AppError(`Tipo de parada inválido. Valores permitidos: ${tiposValidos.join(', ')}`, { 
        status: 400, 
        code: 'INVALID_STATION_TYPE' 
      });
    }

    // Verificar si ya existe una parada con el mismo nombre en la misma ruta
    const paradaExistente = await Parada.obtenerPorNombreYRuta(nombre_parada, ruta_id);
    if (paradaExistente) {
      throw new AppError('Ya existe una parada con ese nombre en esta ruta', { status: 409, code: 'DUPLICATE_STATION' });
    }

    // Verificar orden único en la ruta
    if (orden !== undefined) {
      const paradaConMismoOrden = await Parada.verificarOrdenUnico(ruta_id, orden);
      if (paradaConMismoOrden) {
        throw new AppError('Ya existe una parada con ese orden en la ruta', { status: 409, code: 'DUPLICATE_ORDER' });
      }
    }

    const nuevaParada = await Parada.crear({
      nombre_parada,
      descripcion: descripcion || '',
      latitud: parseFloat(latitud),
      longitud: parseFloat(longitud),
      altitud: altitud ? parseFloat(altitud) : null,
      tipo_parada,
      ruta_id,
      orden: orden || await Parada.obtenerSiguienteOrden(ruta_id),
      capacidad_maxima: capacidad_maxima || 50,
      tiempo_embarque_promedio: tiempo_embarque_promedio || 30, // segundos
      usuario_creacion: req.user.id
    });

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'CREATE_STATION', 
      detalles: { 
        parada_id: nuevaParada.parada_id,
        nombre_parada: nuevaParada.nombre_parada,
        tipo_parada: nuevaParada.tipo_parada
      } 
    });

    res.status(201).json({ success: true, data: nuevaParada });
  }),

  actualizarParada: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { 
      nombre_parada, 
      descripcion, 
      latitud, 
      longitud, 
      altitud, 
      tipo_parada,
      orden,
      capacidad_maxima,
      tiempo_embarque_promedio,
      activo 
    } = req.body;

    // Verificar que la parada existe
    const paradaExistente = await Parada.obtenerPorId(id);
    if (!paradaExistente) {
      throw new AppError('Parada no encontrada', { status: 404, code: 'PARADA_NOT_FOUND' });
    }

    // Validar coordenadas si se proporcionan
    if (latitud && !isValidLatitude(latitud)) {
      throw new AppError('Latitud inválida', { status: 400, code: 'INVALID_LATITUDE' });
    }

    if (longitud && !isValidLongitude(longitud)) {
      throw new AppError('Longitud inválida', { status: 400, code: 'INVALID_LONGITUDE' });
    }

    // Verificar duplicado de nombre (excluyendo la actual)
    if (nombre_parada && nombre_parada !== paradaExistente.nombre_parada) {
      const paradaConMismoNombre = await Parada.obtenerPorNombreYRuta(nombre_parada, paradaExistente.ruta_id);
      if (paradaConMismoNombre && paradaConMismoNombre.parada_id !== parseInt(id)) {
        throw new AppError('Ya existe otra parada con ese nombre en esta ruta', { status: 409, code: 'DUPLICATE_STATION' });
      }
    }

    // Verificar orden único si se cambia
    if (orden !== undefined && orden !== paradaExistente.orden) {
      const paradaConMismoOrden = await Parada.verificarOrdenUnico(paradaExistente.ruta_id, orden, id);
      if (paradaConMismoOrden) {
        throw new AppError('Ya existe una parada con ese orden en la ruta', { status: 409, code: 'DUPLICATE_ORDER' });
      }
    }

    const paradaActualizada = await Parada.actualizar(id, {
      nombre_parada,
      descripcion,
      latitud: latitud ? parseFloat(latitud) : undefined,
      longitud: longitud ? parseFloat(longitud) : undefined,
      altitud: altitud ? parseFloat(altitud) : undefined,
      tipo_parada,
      orden,
      capacidad_maxima,
      tiempo_embarque_promedio,
      activo,
      usuario_modificacion: req.user.id
    });

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'UPDATE_STATION', 
      detalles: { 
        parada_id: id,
        cambios: req.body
      } 
    });

    res.status(200).json({ success: true, data: paradaActualizada });
  }),

  eliminarParada: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verificar que la parada existe
    const paradaExistente = await Parada.obtenerPorId(id);
    if (!paradaExistente) {
      throw new AppError('Parada no encontrada', { status: 404, code: 'PARADA_NOT_FOUND' });
    }

    // Verificar que la parada no tenga cabinas asignadas o historial de operaciones
    const tieneDependencias = await Parada.verificarDependencias(id);
    if (tieneDependencias) {
      throw new AppError('No se puede eliminar la parada porque tiene cabinas u operaciones asociadas', { 
        status: 409, 
        code: 'STATION_HAS_DEPENDENCIES' 
      });
    }

    await Parada.eliminar(id);

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'DELETE_STATION', 
      detalles: { parada_id: id } 
    });

    res.status(200).json({ 
      success: true, 
      message: 'Parada eliminada correctamente',
      data: { parada_id: id }
    });
  }),

  // Método para obtener paradas por ruta
  obtenerParadasPorRuta: asyncHandler(async (req, res) => {
    const { ruta_id } = req.params;

    if (!ruta_id) {
      throw new AppError('El parámetro ruta_id es obligatorio', { status: 400, code: 'MISSING_ROUTE_ID' });
    }

    const paradas = await Parada.obtenerPorRuta(ruta_id);

    res.status(200).json({ 
      success: true, 
      data: paradas 
    });
  }),

  // Método para obtener el estado operativo de una parada
  obtenerEstadoParada: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const parada = await Parada.obtenerPorId(id);
    if (!parada) {
      throw new AppError('Parada no encontrada', { status: 404, code: 'PARADA_NOT_FOUND' });
    }

    const estadoOperativo = await Parada.obtenerEstadoOperativo(id);
    
    res.status(200).json({ 
      success: true, 
      data: {
        parada,
        estado_operativo: estadoOperativo,
        timestamp: new Date().toISOString()
      }
    });
  }),

  // Método para obtener todas las paradas con información básica para el mapa
  obtenerParadasParaMapa: asyncHandler(async (req, res) => {
    const paradas = await Parada.obtenerParaMapa();
    
    res.status(200).json({ 
      success: true, 
      data: paradas 
    });
  }),

  // Método para obtener tiempos de espera en una parada
  obtenerTiemposEspera: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fecha_inicio, fecha_fin } = req.query;

    const parada = await Parada.obtenerPorId(id);
    if (!parada) {
      throw new AppError('Parada no encontrada', { status: 404, code: 'PARADA_NOT_FOUND' });
    }

    const tiemposEspera = await Parada.obtenerTiemposEspera(id, fecha_inicio, fecha_fin);

    res.status(200).json({ 
      success: true, 
      data: tiemposEspera 
    });
  })
};

// Funciones auxiliares para validación de coordenadas
function isValidLatitude(lat) {
  return !isNaN(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng) {
  return !isNaN(lng) && lng >= -180 && lng <= 180;
}