const validator = require('validator');

// Middleware to validate URL creation request
const validateCreateLink = (req, res, next) => {
  const { originalUrl, customCode } = req.body;

  // Check if URL is provided and valid
  if (!originalUrl || !validator.isURL(originalUrl, { 
    protocols: ['http', 'https'], 
    require_protocol: true 
  })) {
    return res.status(400).json({ 
      error: 'Please provide a valid URL with http or https protocol' 
    });
  }

  // Validate custom code format if provided
  if (customCode && !/^[A-Za-z0-9_-]{1,50}$/.test(customCode)) {
    return res.status(400).json({ 
      error: 'Custom code can only contain letters, numbers, hyphens, and underscores (1-50 characters)' 
    });
  }

  next();
};

module.exports = {
  validateCreateLink
};