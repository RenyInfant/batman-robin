const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const competitionRoutes = require('./routes/competitionRoutes');
const teamRoutes = require('./routes/teamRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const exportRoutes = require('./routes/exportRoutes');
const backupRoutes = require('./routes/backupRoutes');

const setupSwagger = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

/* ===========================================================
   Security Headers
=========================================================== */

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

/* ===========================================================
   CORS Configuration
=========================================================== */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://batman-robin.vercel.app"
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return (
    allowedOrigins.includes(origin) ||
    /^https:\/\/batman-robin-.*\.vercel\.app$/.test(origin)
  );
};

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* ===========================================================
   Body Parsers
=========================================================== */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===========================================================
   Global Rate Limiter
=========================================================== */

app.use('/api', apiLimiter);

/* ===========================================================
   Static Uploads
=========================================================== */

app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'))
);

/* ===========================================================
   API Routes
=========================================================== */

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/backup', backupRoutes);

/* ===========================================================
   Swagger
=========================================================== */

setupSwagger(app);

/* ===========================================================
   Health Check
=========================================================== */

app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Batman & Robin AI Prompt Competition Portal API Server',
    version: '1.0.0',
    documentation: `${req.protocol}://${req.get('host')}/api-docs`
  });
});

/* ===========================================================
   Error Handler
=========================================================== */

app.use(errorHandler);

module.exports = app;
