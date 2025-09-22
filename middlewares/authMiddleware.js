// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

/**
 * Middleware para verificar si la petición incluye un JWT válido en las cookies.
 * Si es válido, añade los datos del usuario decodificados a `req.user`.
 */
const verifyToken = (req, res, next) => {
    const token = req.cookies.token; // Extrae el token de la cookie

    // Si no hay token, se niega el acceso.
    if (!token) {
        return res.status(401).send('Acceso denegado: Se requiere autenticación.');
    }

    try {
        // Verifica el token usando la clave secreta (debe estar en tu .env)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Adjunta los datos del usuario a la petición
        next(); // Permite que la petición continúe
    } catch (error) {
        res.status(400).send('Token no válido.');
    }
};

/**
 * Middleware para verificar si el usuario autenticado tiene el rol de 'administrador'.
 * IMPORTANTE: Siempre debe usarse después de verifyToken.
 */
const isAdmin = (req, res, next) => {
    // Revisa el rol del usuario que verifyToken ya adjuntó a `req.user`
    if (req.user && req.user.rol === 'administrador') {
        next(); // Si es admin, permite que la petición continúe
    } else {
        res.status(403).send('Acceso denegado: Requiere permisos de administrador.');
    }
};

module.exports = { verifyToken, isAdmin };