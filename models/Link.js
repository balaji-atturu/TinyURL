const mongoose = require('mongoose');
const validator = require('validator');

const linkSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: [true, 'Short code is required'],
    unique: true,
    trim: true,
    match: [/^[A-Za-z0-9_-]{1,50}$/, 'Short code can only contain letters, numbers, hyphens, and underscores']
  },
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    validate: {
      validator: function(v) {
        return validator.isURL(v, {
          protocols: ['http', 'https'],
          require_protocol: true
        });
      },
      message: 'Please provide a valid URL with http or https protocol'
    }
  },
  clicks: {
    type: Number,
    default: 0
  },
  lastClicked: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

linkSchema.index({ shortCode: 1 });
linkSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Link', linkSchema);