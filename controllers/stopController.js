module.exports = {
  listarParadas: async (req, res, next) => {
    try {
      // Lógica para listar paradas
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  },
  obtenerParada: async (req, res, next) => {
    try {
      // Lógica para obtener una parada por ID
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  },
  crearParada: async (req, res, next) => {
    try {
      // Lógica para crear una parada
      res.status(201).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  },
  actualizarParada: async (req, res, next) => {
    try {
      // Lógica para actualizar una parada
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  },
  eliminarParada: async (req, res, next) => {
    try {
      // Lógica para eliminar una parada
      res.status(200).json({ success: true, message: 'Parada eliminada' });
    } catch (error) {
      next(error);
    }
  },
};