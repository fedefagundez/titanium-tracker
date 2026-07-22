const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Iniciá sesión con EVE SSO.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tenés permisos para realizar esta acción.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
