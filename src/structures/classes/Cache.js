import Redis from 'ioredis';
import { Rei } from '#classes/Rei';
import { logger } from '#utils';

export class CacheManager {
	constructor(config) {
		this.config = config;
		this.type = config.type || 'memory';
		this.fallbackType = config.fallback || 'memory';
		this.redis = null;
		this.memory = new Rei(config.maxSize || 50000);
		this.connected = false;
		this.useRedis = false;
		this.pipeline = null;
	}

	async init() {
		if (this.type === 'redis' && this.config.url) {
			try {
				this.redis = new Redis(this.config.url, {
					maxRetriesPerRequest: 3,
					enableReadyCheck: true,
					lazyConnect: false,
					retryStrategy: (times) => {
						if (times > 3) {
							logger.error('Cache', 'Max Redis retries reached, using fallback');
							this.useRedis = false;
							return null;
						}
						return Math.min(times * 200, 2000);
					},
				});

				this.redis.on('error', (err) => {
					logger.error('Cache', `Redis error: ${err.message}`);
					this.useRedis = false;
				});

				this.redis.on('connect', () => {
					this.connected = true;
					this.useRedis = true;
					logger.success('Cache', 'Redis connected');
				});

				this.redis.on('close', () => {
					this.connected = false;
					this.useRedis = false;
					logger.warn('Cache', 'Redis connection closed');
				});

				await this.redis.ping();
				logger.success('Cache', 'Cache manager initialized with Redis');
			} catch (error) {
				logger.error('Cache', `Redis init failed: ${error.message}`);
				logger.warn('Cache', `Using ${this.fallbackType} fallback`);
				this.useRedis = false;
			}
		} else {
			logger.info('Cache', 'Cache manager initialized with memory storage');
		}
		return this;
	}
	/**
	 * Sets a key-value pair in the cache with an optional TTL (time-to-live) in seconds.
	 * If Redis is available and connected, it will use Redis; otherwise, it will fall back to memory storage.
	 * @param {string} k - The key to set.
	 * @param {any} v - The value to store.
	 * @param {number} [ttl] - Optional TTL in seconds.
	 *
	 */

	async set(k, v, ttl) {
		try {
			if (this.useRedis && this.connected) {
				const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
				if (ttl) {
					await this.redis.setex(k, ttl, val);
				} else {
					await this.redis.set(k, val);
				}
			} else {
				this.memory.set(k, v);
			}
			return true;
		} catch (error) {
			this.memory.set(k, v);
			return false;
		}
	}

	async get(k) {
		try {
			if (this.useRedis && this.connected) {
				const val = await this.redis.get(k);

				if (!val) return null;
				try {
					return JSON.parse(val);
				} catch {
					return val;
				}
			}
			return this.memory.get(k);
		} catch (error) {
			return this.memory.get(k);
		}
	}

	async has(k) {
		try {
			if (this.useRedis && this.connected) {
				return (await this.redis.exists(k)) === 1;
			}
			return this.memory.has(k);
		} catch {
			return this.memory.has(k);
		}
	}

	async del(k) {
		try {
			if (this.useRedis && this.connected) {
				await this.redis.del(k);
			}
			this.memory.del(k);
			return true;
		} catch {
			this.memory.del(k);
			return false;
		}
	}

	async mset(arr) {
		try {
			if (this.useRedis && this.connected) {
				const pipe = this.redis.pipeline();
				for (const [k, v] of arr) {
					const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
					pipe.set(k, val);
				}
				await pipe.exec();
			}
			this.memory.mset(arr);
			return true;
		} catch {
			this.memory.mset(arr);
			return false;
		}
	}

	async mget(keys) {
		try {
			if (this.useRedis && this.connected) {
				const vals = await this.redis.mget(...keys);
				return vals.map((v) => {
					if (!v) return null;
					try {
						return JSON.parse(v);
					} catch {
						return v;
					}
				});
			}
			return this.memory.mget(keys);
		} catch {
			return this.memory.mget(keys);
		}
	}

	async mdel(keys) {
		try {
			if (this.useRedis && this.connected) {
				if (keys.length > 0) await this.redis.del(...keys);
			}
			this.memory.mdel(keys);
			return true;
		} catch {
			this.memory.mdel(keys);
			return false;
		}
	}

	async incr(k, d = 1) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.incrby(k, d);
			}
			return this.memory.incr(k, d);
		} catch {
			return this.memory.incr(k, d);
		}
	}

	async decr(k, d = 1) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.decrby(k, d);
			}
			return this.memory.decr(k, d);
		} catch {
			return this.memory.decr(k, d);
		}
	}

	async keys(pattern = '*') {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.keys(pattern);
			}
			return this.memory.keys(pattern);
		} catch {
			return this.memory.keys(pattern);
		}
	}

	async hset(k, f, v) {
		try {
			if (this.useRedis && this.connected) {
				const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
				await this.redis.hset(k, f, val);
			} else {
				this.memory.hset(k, f, v);
			}
			return true;
		} catch {
			this.memory.hset(k, f, v);
			return false;
		}
	}

	async hget(k, f) {
		try {
			if (this.useRedis && this.connected) {
				const val = await this.redis.hget(k, f);
				if (!val) return null;
				try {
					return JSON.parse(val);
				} catch {
					return val;
				}
			}
			return this.memory.hget(k, f);
		} catch {
			return this.memory.hget(k, f);
		}
	}

	async hdel(k, f) {
		try {
			if (this.useRedis && this.connected) {
				await this.redis.hdel(k, f);
			}
			this.memory.hdel(k, f);
			return true;
		} catch {
			this.memory.hdel(k, f);
			return false;
		}
	}

	async hgetall(k) {
		try {
			if (this.useRedis && this.connected) {
				const obj = await this.redis.hgetall(k);
				const parsed = {};
				for (const [key, val] of Object.entries(obj)) {
					try {
						parsed[key] = JSON.parse(val);
					} catch {
						parsed[key] = val;
					}
				}
				return parsed;
			}
			return this.memory.hgetall(k);
		} catch {
			return this.memory.hgetall(k);
		}
	}

	async hmset(k, obj) {
		try {
			if (this.useRedis && this.connected) {
				const serialized = {};
				for (const [key, val] of Object.entries(obj)) {
					serialized[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
				}
				await this.redis.hset(k, serialized);
			}
			this.memory.hmset(k, obj);
			return true;
		} catch {
			this.memory.hmset(k, obj);
			return false;
		}
	}

	async hincrby(k, f, d = 1) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.hincrby(k, f, d);
			}
			return this.memory.hincrby(k, f, d);
		} catch {
			return this.memory.hincrby(k, f, d);
		}
	}

	async sadd(k, ...members) {
		try {
			if (this.useRedis && this.connected) {
				await this.redis.sadd(k, ...members);
			}
			this.memory.sadd(k, ...members);
			return true;
		} catch {
			this.memory.sadd(k, ...members);
			return false;
		}
	}

	async smembers(k) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.smembers(k);
			}
			return this.memory.smembers(k);
		} catch {
			return this.memory.smembers(k);
		}
	}

	async sismember(k, m) {
		try {
			if (this.useRedis && this.connected) {
				return (await this.redis.sismember(k, m)) === 1;
			}
			return this.memory.sismember(k, m);
		} catch {
			return this.memory.sismember(k, m);
		}
	}

	async srem(k, ...members) {
		try {
			if (this.useRedis && this.connected) {
				await this.redis.srem(k, ...members);
			}
			this.memory.srem(k, ...members);
			return true;
		} catch {
			this.memory.srem(k, ...members);
			return false;
		}
	}

	async lpush(k, ...values) {
		try {
			if (this.useRedis && this.connected) {
				const serialized = values.map((v) =>
					typeof v === 'object' ? JSON.stringify(v) : String(v),
				);
				return await this.redis.lpush(k, ...serialized);
			}
			return this.memory.lpush(k, ...values);
		} catch {
			return this.memory.lpush(k, ...values);
		}
	}

	async rpush(k, ...values) {
		try {
			if (this.useRedis && this.connected) {
				const serialized = values.map((v) =>
					typeof v === 'object' ? JSON.stringify(v) : String(v),
				);
				return await this.redis.rpush(k, ...serialized);
			}
			return this.memory.rpush(k, ...values);
		} catch {
			return this.memory.rpush(k, ...values);
		}
	}

	async lpop(k) {
		try {
			if (this.useRedis && this.connected) {
				const val = await this.redis.lpop(k);
				if (!val) return null;
				try {
					return JSON.parse(val);
				} catch {
					return val;
				}
			}
			return this.memory.lpop(k);
		} catch {
			return this.memory.lpop(k);
		}
	}

	async rpop(k) {
		try {
			if (this.useRedis && this.connected) {
				const val = await this.redis.rpop(k);
				if (!val) return null;
				try {
					return JSON.parse(val);
				} catch {
					return val;
				}
			}
			return this.memory.rpop(k);
		} catch {
			return this.memory.rpop(k);
		}
	}

	async lrange(k, start, stop) {
		try {
			if (this.useRedis && this.connected) {
				const vals = await this.redis.lrange(k, start, stop);
				return vals.map((v) => {
					try {
						return JSON.parse(v);
					} catch {
						return v;
					}
				});
			}
			return this.memory.lrange(k, start, stop);
		} catch {
			return this.memory.lrange(k, start, stop);
		}
	}

	async llen(k) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.llen(k);
			}
			return this.memory.llen(k);
		} catch {
			return this.memory.llen(k);
		}
	}

	async expire(k, seconds) {
		try {
			if (this.useRedis && this.connected) {
				return (await this.redis.expire(k, seconds)) === 1;
			}
			return false;
		} catch {
			return false;
		}
	}

	async ttl(k) {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.ttl(k);
			}
			return -1;
		} catch {
			return -1;
		}
	}

	async size() {
		try {
			if (this.useRedis && this.connected) {
				return await this.redis.dbsize();
			}
			return this.memory.size;
		} catch {
			return this.memory.size;
		}
	}

	async clear() {
		try {
			if (this.useRedis && this.connected) {
				await this.redis.flushdb();
			}
			this.memory.clear();
			logger.info('Cache', 'Cache cleared');
			return true;
		} catch {
			this.memory.clear();
			return false;
		}
	}

	async ping() {
		try {
			if (this.useRedis && this.connected) {
				const start = Date.now();
				await this.redis.ping();
				return Date.now() - start;
			}
			return 0;
		} catch {
			return -1;
		}
	}

	async disconnect() {
		try {
			if (this.redis && this.connected) {
				await this.redis.quit();
				this.connected = false;
				this.useRedis = false;
				logger.info('Cache', 'Redis disconnected');
			}
			this.memory.clear();
			return true;
		} catch (error) {
			logger.error('Cache', `Disconnect error: ${error.message}`);
			return false;
		}
	}

	get isRedis() {
		return this.useRedis && this.connected;
	}

	get isMemory() {
		return !this.useRedis || !this.connected;
	}

	get status() {
		return {
			type: this.isRedis ? 'redis' : 'memory',
			connected: this.connected,
			size: this.memory.size,
		};
	}
}
