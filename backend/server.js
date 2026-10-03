const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
dotenv.config();
require('./config/redis');

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://bookmyflight-xi.vercel.app',
  'http://localhost:3000'
].filter(Boolean);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true }
});

app.set('io', io);
io.on('connection', (socket) => {
  socket.on('joinFlight', (flightId) => {
    if (typeof flightId === 'string' && /^[a-f\d]{24}$/i.test(flightId)) {
      socket.join(`flight:${flightId}`);
    }
  });

  socket.on('leaveFlight', (flightId) => {
    if (typeof flightId === 'string' && /^[a-f\d]{24}$/i.test(flightId)) {
      socket.leave(`flight:${flightId}`);
    }
  });
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/payment', require('./routes/payment'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', message: 'BookMyFlight API running' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
