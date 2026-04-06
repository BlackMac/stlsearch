/**
 * Simple in-memory LRU cache with TTL eviction.
 * No external dependencies needed.
 */

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 500;

class Cache {
  constructor(ttl = CACHE_TTL, maxSize = MAX_CACHE_SIZE) {
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }
    // Move to end (LRU)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  set(key, data) {
    if (this.store.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this.store.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.store.clear();
  }

  get size() {
    return this.store.size;
  }
}

module.exports = { Cache };
