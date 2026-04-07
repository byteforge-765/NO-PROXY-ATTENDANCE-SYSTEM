require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { connectPostgres, connectMongo, connectRedis } = require('./config/db');

const app = express();

// ── Security ─────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ── CORS — allow localhost + any WiFi IP ──────────────────────
app.use(cors({
  origin: (origin, cb) => {
    // Allow: no origin (curl/mobile), localhost, any 192.168.x.x or 10.x.x.x
    if (!origin) return cb(null, true);
    const allowed =
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      /^https?:\/\/192\.168\.\d+\.\d+/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+/.test(origin) ||
      (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL);
    cb(null, allowed ? true : new Error('CORS blocked'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '15mb' }));   // 15mb for base64 images
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// ── Rate Limiting ─────────────────────────────────────────────
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// ── Static file serving (uploaded photos) ────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          require('./modules/auth/auth.routes'));
app.use('/api/students',      require('./modules/students/student.routes'));
app.use('/api/faculty',       require('./modules/faculty/faculty.routes'));
app.use('/api/departments',   require('./modules/departments/department.routes'));
app.use('/api/classes',       require('./modules/classes/class.routes'));
app.use('/api/attendance',    require('./modules/attendance/attendance.routes'));
app.use('/api/timetable',     require('./modules/timetable/timetable.routes'));
app.use('/api/study-material',require('./modules/study-material/studyMaterial.routes'));
app.use('/api/notifications', require('./modules/notifications/notification.routes'));
app.use('/api/dashboard',     require('./modules/dashboard/dashboard.routes'));
app.use('/api/tigergraph',    require('./modules/tigergraph/tigergraph.routes'));

// ── Health ───────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'OK',
  time: new Date().toISOString(),
  services: 'PostgreSQL + MongoDB + Redis + TigerGraph',
}));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server error' });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectPostgres();
  await connectMongo();
  await connectRedis();
  // TigerGraph: connect (non-blocking)
  const { ping: tgPing } = require('./config/tigergraph');
  tgPing().then(ok => console.log(`[TigerGraph] ${ok ? 'Connected ✓' : 'Not available — mock mode (graph features limited)'}`)).catch(()=>{});

  app.listen(PORT, '0.0.0.0', () => {
    const ip = require('os').networkInterfaces();
    const wifiIp = Object.values(ip).flat().find(i => i.family === 'IPv4' && !i.internal)?.address;
    console.log(`\n[ICMS] Backend running on port ${PORT}`);
    console.log(`[ICMS] Local:   http://localhost:${PORT}`);
    if (wifiIp) console.log(`[ICMS] WiFi:    http://${wifiIp}:${PORT}  ← use this in Lovable .env`);
    console.log(`[ICMS] Health:  http://localhost:${PORT}/health\n`);
  });
};

start();
