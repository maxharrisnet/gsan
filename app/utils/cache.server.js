// Simple in-memory cache
const cache = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute
const apiCalls = {
  timestamp: Date.now(),
  count: 0
};

export function checkRateLimit() {
  const now = Date.now();
  if (now - apiCalls.timestamp > RATE_LIMIT_WINDOW) {
    console.log('⏲️ Rate limit window reset');
    apiCalls.timestamp = now;
    apiCalls.count = 0;
  }

  apiCalls.count++;
  const isRateLimited = apiCalls.count > MAX_REQUESTS;
  
  if (isRateLimited) {
    console.log(`🚫 Rate limit hit:
    Total Requests: ${apiCalls.count}
    Window Start: ${new Date(apiCalls.timestamp).toISOString()}
    Current Time: ${new Date().toISOString()}
    Time Left: ${Math.round((RATE_LIMIT_WINDOW - (now - apiCalls.timestamp))/1000)}s`);
  } else {
    console.log(`📊 Request count: ${apiCalls.count}/${MAX_REQUESTS}`);
  }

  return isRateLimited;
}

export function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  
  return item.value;
}

export function setCache(key, value) {
  cache.set(key, {
    value,
    expiry: Date.now() + CACHE_DURATION
  });
} 