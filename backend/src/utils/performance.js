// Performance monitoring utilities
export const performanceMonitor = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`🐌 Slow request: ${method} ${url} - ${duration}ms - Status: ${statusCode}`);
    }
    
    // Log performance metrics
    console.log(`📊 ${method} ${url} - ${duration}ms - Status: ${statusCode}`);
  });
  
  next();
};

// Memory usage monitor
export const memoryMonitor = () => {
  const used = process.memoryUsage();
  const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2);
  
  console.log('🧠 Memory Usage:');
  console.log(`  RSS: ${formatBytes(used.rss)} MB`);
  console.log(`  Heap Total: ${formatBytes(used.heapTotal)} MB`);
  console.log(`  Heap Used: ${formatBytes(used.heapUsed)} MB`);
  console.log(`  External: ${formatBytes(used.external)} MB`);
};

// Database query performance
export const queryPerformance = (queryName) => {
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (duration > 500) {
        console.warn(`🐌 Slow query: ${queryName} - ${duration}ms`);
      }
    });
    
    next();
  };
};
