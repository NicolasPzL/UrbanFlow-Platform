const { asyncHandler } = require('../middlewares/asyncHandler');
const AppError = require('../errors/AppError');
const Ruta = require('../models/rutaModel');
const Audit = require('../models/auditoriaModel');

module.exports = {
  listarRutas: asyncHandler(async (req, res) => {
    const { search, isActive, includeDeleted, limit, offset, sortBy, sortDir } = req.query;
    
    const data = await Ruta.listar({
      search: search || '',
      isActive: isActive === undefined ? null : isActive === 'true',
      includeDeleted: includeDeleted === 'true',
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
      sortBy: sortBy || 'nombre_ruta',
      sortDir: sortDir || 'asc'
    });

    res.status(200).json({ 
      success: true, 
      data: data.items, 
      meta: { 
        total: data.total, 
        limit: Number(limit) || 20, 
        offset: Number(offset) || 0 
      } 
    });
  }),

  obtenerRuta: asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const ruta = await Ruta.obtenerPorId(id);
    if (!ruta) {
      throw new AppError('Ruta no encontrada', { status: 404, code: 'RUTA_NOT_FOUND' });
    }

    // Incluir información de estaciones asociadas si es necesario
    const estaciones = await Ruta.obtenerEstacionesPorRuta(id);
    ruta.estaciones = estaciones;

    res.status(200).json({ success: true, data: ruta });
  }),

  crearRuta: asyncHandler(async (req, res) => {
    const { nombre_ruta, descripcion, color, estaciones } = req.body;

    // Validaciones básicas
    if (!nombre_ruta) {
      throw new AppError('El nombre de la ruta es obligatorio', { status: 400, code: 'VALIDATION_ERROR' });
    }

    // Verificar si ya existe una ruta con el mismo nombre
    const rutaExistente = await Ruta.obtenerPorNombre(nombre_ruta);
    if (rutaExistente) {
      throw new AppError('Ya existe una ruta con ese nombre', { status: 409, code: 'DUPLICATE_ROUTE' });
    }

    const nuevaRuta = await Ruta.crear({
      nombre_ruta,
      descripcion: descripcion || '',
      color: color || '#007bff',
      usuario_creacion: req.user.id
    });

    // Asociar estaciones si se proporcionan
    if (estaciones && estaciones.length > 0) {
      await Ruta.asociarEstaciones(nuevaRuta.ruta_id, estaciones);
    }

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'CREATE_ROUTE', 
      detalles: { 
        ruta_id: nuevaRuta.ruta_id,
        nombre_ruta: nuevaRuta.nombre_ruta
      } 
    });

    res.status(201).json({ success: true, data: nuevaRuta });
  }),

  actualizarRuta: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { nombre_ruta, descripcion, color, estaciones } = req.body;

    // Verificar que la ruta existe
    const rutaExistente = await Ruta.obtenerPorId(id);
    if (!rutaExistente) {
      throw new AppError('Ruta no encontrada', { status: 404, code: 'RUTA_NOT_FOUND' });
    }

    // Verificar duplicado de nombre (excluyendo la actual)
    if (nombre_ruta && nombre_ruta !== rutaExistente.nombre_ruta) {
      const rutaConMismoNombre = await Ruta.obtenerPorNombre(nombre_ruta);
      if (rutaConMismoNombre && rutaConMismoNombre.ruta_id !== parseInt(id)) {
        throw new AppError('Ya existe otra ruta con ese nombre', { status: 409, code: 'DUPLICATE_ROUTE' });
      }
    }

    const rutaActualizada = await Ruta.actualizar(id, {
      nombre_ruta,
      descripcion,
      color,
      usuario_modificacion: req.user.id
    });

    // Actualizar estaciones si se proporcionan
    if (estaciones) {
      await Ruta.actualizarEstaciones(id, estaciones);
    }

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'UPDATE_ROUTE', 
      detalles: { 
        ruta_id: id,
        cambios: req.body
      } 
    });

    res.status(200).json({ success: true, data: rutaActualizada });
  }),

  eliminarRuta: asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verificar que la ruta existe
    const rutaExistente = await Ruta.obtenerPorId(id);
    if (!rutaExistente) {
      throw new AppError('Ruta no encontrada', { status: 404, code: 'RUTA_NOT_FOUND' });
    }

    // Verificar que la ruta no tenga cabinas activas asociadas
    const cabinasActivas = await Ruta.verificarCabinasActivas(id);
    if (cabinasActivas > 0) {
      throw new AppError('No se puede eliminar la ruta porque tiene cabinas activas asociadas', { 
        status: 409, 
        code: 'ROUTE_HAS_CABINS' 
      });
    }

    await Ruta.eliminar(id);

    await Audit.log({ 
      usuario_id: req.user.id, 
      accion: 'DELETE_ROUTE', 
      detalles: { ruta_id: id } 
    });

    res.status(200).json({ 
      success: true, 
      message: 'Ruta eliminada correctamente',
      data: { ruta_id: id }
    });
  }),

  // Método adicional para obtener el estado operativo de una ruta
  obtenerEstadoRuta: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const ruta = await Ruta.obtenerPorId(id);
    if (!ruta) {
      throw new AppError('Ruta no encontrada', { status: 404, code: 'RUTA_NOT_FOUND' });
    }

    // Obtener estadísticas de las cabinas en esta ruta
    const estadisticas = await Ruta.obtenerEstadisticasCabinas(id);
    
    // Calcular estado general de la ruta basado en sus cabinas
    const estadoRuta = calcularEstadoGeneral(estadisticas);

    res.status(200).json({ 
      success: true, 
      data: {
        ruta,
        estadisticas,
        estado_general: estadoRuta,
        timestamp: new Date().toISOString()
      }
    });
  }),

  // Método para listar rutas con información básica para el mapa
  listarRutasParaMapa: asyncHandler(async (req, res) => {
    const rutas = await Ruta.listarParaMapa();
    
    res.status(200).json({ 
      success: true, 
      data: rutas 
    });
  })
};

// Función auxiliar para calcular el estado general de la ruta
function calcularEstadoGeneral(estadisticas) {
  const { total, operativas, en_alerta, en_fallo } = estadisticas;
  
  if (total === 0) return 'sin_datos';
  if (en_fallo > 0) return 'alerta_critica';
  if (en_alerta > total * 0.3) return 'alerta'; // Más del 30% en alerta
  if (operativas === total) return 'optimo';
  
  return 'operativo';
}