const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const validator = require('validator');

// Try to import MongoDB model, fallback to memory DB
let Link, memoryDB;
try {
  Link = require('../models/Link');
  memoryDB = require('../models/MemoryDB');
} catch (error) {
  console.log('Using memory database only');
}

// Check if MongoDB is connected
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// GET /api/links - List all links
router.get('/', async (req, res) => {
  try {
    if (isMongoConnected() && Link) {
      const links = await Link.find().sort({ createdAt: -1 });
      return res.json(links);
    } else {
      const links = await memoryDB.findAllLinks();
      return res.json(links);
    }
  } catch (error) {
    console.error('Error fetching links:', error);
    // Fallback to empty array
    res.json([]);
  }
});

// GET /api/links/:code - Get stats for a specific code
router.get('/:code', async (req, res) => {
  try {
    let link;
    
    if (isMongoConnected() && Link) {
      link = await Link.findOne({ shortCode: req.params.code });
    } else {
      link = await memoryDB.findLink(req.params.code);
    }
    
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json(link);
  } catch (error) {
    console.error('Error fetching link stats:', error);
    res.status(500).json({ error: 'Failed to fetch link stats' });
  }
});

// POST /api/links - Create a new short link
router.post('/', async (req, res) => {
  try {
    const { originalUrl, customCode } = req.body;
    
    // Validate URL
    if (!originalUrl || !validator.isURL(originalUrl, { 
      protocols: ['http', 'https'], 
      require_protocol: true 
    })) {
      return res.status(400).json({ error: 'Please provide a valid URL with http or https protocol' });
    }
    
    // Generate short code or use custom code
    let shortCode;
    if (customCode) {
      if (!/^[A-Za-z0-9_-]{1,50}$/.test(customCode)) {
        return res.status(400).json({ 
          error: 'Custom code can only contain letters, numbers, hyphens, and underscores (1-50 characters)' 
        });
      }
      shortCode = customCode;
    } else {
      shortCode = Math.random().toString(36).substring(2, 8);
    }
    
    // Check if code already exists
    let existingLink;
    if (isMongoConnected() && Link) {
      existingLink = await Link.findOne({ shortCode });
    } else {
      existingLink = await memoryDB.findLink(shortCode);
    }
    
    if (existingLink) {
      return res.status(409).json({ error: 'Short code already exists' });
    }
    
    // Create new link
    let newLink;
    if (isMongoConnected() && Link) {
      newLink = new Link({
        shortCode,
        originalUrl
      });
      await newLink.save();
    } else {
      newLink = await memoryDB.createLink(shortCode, originalUrl);
    }
    
    res.status(201).json({
      shortCode: newLink.shortCode,
      originalUrl: newLink.originalUrl,
      shortUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/${newLink.shortCode}`,
      clicks: newLink.clicks || 0,
      createdAt: newLink.createdAt
    });
    
  } catch (error) {
    console.error('Error creating link:', error);
    if (error.code === 11000) {
      res.status(409).json({ error: 'Short code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create link' });
    }
  }
});

// DELETE /api/links/:code - Delete a link
router.delete('/:code', async (req, res) => {
  try {
    let deleted;
    
    if (isMongoConnected() && Link) {
      deleted = await Link.findOneAndDelete({ shortCode: req.params.code });
    } else {
      deleted = await memoryDB.deleteLink(req.params.code);
    }
    
    if (!deleted) {
      return res.status(404).json({ error: 'Link not found' });
    }
    
    res.json({ message: 'Link deleted successfully' });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

module.exports = router;