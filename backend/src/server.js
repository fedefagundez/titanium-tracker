require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const systemRoutes = require('./routes/systems');
const routeRoutes = require('./routes/routes');
const threatRoutes = require('./routes/threats');
const locationRoutes = require('./routes/location');
const { loadSystems } = require('./data/systems');
const { loadGates } = require('./data/gates');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intentá más tarde.' },
});
app.use('/auth', limiter);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/api/systems', systemRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/systems', threatRoutes);
app.use('/api', locationRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  await loadSystems();
  await loadGates();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Titanium Tracker API escuchando en puerto ${PORT}`);
  });
}

start();
