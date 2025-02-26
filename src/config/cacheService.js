class CacheService {
  constructor() {
    this.client = process.env.REDIS_URL 
      ? new Redis(process.env.REDIS_URL)
      : null;

    if (this.client) {
      this.client.on('error', (err) => logger.error('Redis Client Error', err));
      this.client.on('connect', () => logger.info('Redis Client Connected'));
    }
  }

  async get(key) {
    if (!this.client) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache Get Error:', error);
      return null;
    }
  }

  async set(key, value, expireTime = 3600) {
    if (!this.client) return;
    try {
      await this.client.setex(key, expireTime, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache Set Error:', error);
    }
  }

  async delete(key) {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Cache Delete Error:', error);
    }
  }

  // ✅ Add missing getRestaurantStatus method
  async getRestaurantStatus(restaurantId) {
    return await this.get(`restaurantStatus:${restaurantId}`);
  }

  // ✅ Add missing setRestaurantStatus method
  async setRestaurantStatus(restaurantId, status) {
    await this.set(`restaurantStatus:${restaurantId}`, status, 86400); // Expire in 24 hours
  }
}

export const cacheService = new CacheService();
