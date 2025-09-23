module.exports = {
  listarUsuarios: async (req, res, next) => {
    try {
      // Lógica para listar todos los usuarios
      res.status(200).json({ success: true, data: [] });
    } catch (error) {
      next(error);
    }
  },
  obtenerEstadisticas: async (req, res, next) => {
    try {
      // Lógica para obtener estadísticas del sistema
      res.status(200).json({ success: true, data: {} });
    } catch (error) {
      next(error);
    }
  },
};