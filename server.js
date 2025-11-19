const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tinylink';

console.log('🔄 Attempting to connect to MongoDB...');

if (MONGODB_URI && MONGODB_URI !== 'undefined') {
  const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    bufferCommands: false,
  };

  mongoose.connect(MONGODB_URI, mongooseOptions)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas');
  })
  .catch(async (error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('🔄 Using in-memory storage instead...');
  });

  mongoose.connection.on('error', err => {
    console.log('❌ MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('🔌 MongoDB disconnected');
  });
} else {
  console.log('❌ No MongoDB URI provided, using in-memory storage only');
}

// Import routes
const linkRoutes = require('./routes/links');
app.use('/api/links', linkRoutes);

// Health check endpoint
app.get('/healthz', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ 
    ok: true, 
    version: "1.0",
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Serve dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve stats page
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Import models
const Link = require('./models/Link');
const memoryDB = require('./models/MemoryDB');

// Redirect route
app.get('/:code', async (req, res) => {
  try {
    let link;
    
    if (mongoose.connection.readyState === 1) {
      // Use MongoDB
      link = await Link.findOne({ shortCode: req.params.code });
      if (link) {
        link.clicks += 1;
        link.lastClicked = new Date();
        await link.save();
      }
    } else {
      // Use memory DB
      link = await memoryDB.findLink(req.params.code);
      if (link) {
        await memoryDB.incrementClicks(req.params.code);
      }
    }
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.redirect(302, link.originalUrl);
  } catch (error) {
    console.error('Redirect error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`❤️ Health check: http://localhost:${PORT}/healthz`);
  console.log(`🗄️ Database: ${mongoose.connection.readyState === 1 ? 'MongoDB Connected' : 'In-Memory Storage'}`);
});

module.exports = app;