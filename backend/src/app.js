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

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS Configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://batman-robin.vercel.app"
  ], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
app.use('/api', apiLimiter);

// Serve Uploaded Files Stored Locally
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/competition', competitionRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/judge', judgeRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/backup', backupRoutes);

// Swagger Documentation
setupSwagger(app);

// Root Status Check
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Batman & Robin AI Prompt Competition Portal API Server',
    version: '1.0.0',
    documentation: 'http://localhost:5000/api-docs'
  });
});

// Error Handling Middleware
app.use(errorHandler);

module.exports = app;
