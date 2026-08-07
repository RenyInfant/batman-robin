const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initSocket } = require('./services/socketService');
const { startTimerLoop } = require('./services/timerService');
const seedDefaultUsers = require('./config/seedUsers');
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://batman-robin.vercel.app'
];

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  return (
    allowedOrigins.includes(origin) ||
    /^https:\/\/batman-robin-.*\.vercel\.app$/.test(origin)
  );
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Socket.IO engine
initSocket(io);

// Start Dynamic Competition Timer Loop
startTimerLoop();
seedDefaultUsers();
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Gotham Server Online: Batman & Robin Competition Portal`);
  console.log(` API Endpoint:      http://localhost:${PORT}`);
  console.log(` Swagger Docs:      http://localhost:${PORT}/api-docs`);
  console.log(` Realtime Socket:   Socket.IO connected on port ${PORT}`);
  console.log(`=======================================================`);
});
