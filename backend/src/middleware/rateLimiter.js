// Rate limiting middleware to prevent abuse
const rateLimitMap = new Map();

export const rateLimiter = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitMap.has(clientId)) {
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const clientData = rateLimitMap.get(clientId);
    
    if (now > clientData.resetTime) {
      // Reset the counter
      rateLimitMap.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      return res.status(429).json({
        message: 'Too many requests',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
    }
    
    clientData.count++;
    next();
  };
};

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
export const messageRateLimit = rateLimiter(60 * 1000, 30); // 30 messages per minute
export const generalRateLimit = rateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes
