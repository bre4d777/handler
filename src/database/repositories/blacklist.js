import { eq } from 'drizzle-orm';
import { getDatabase } from '#db/drizzle';
import { blacklist } from '#dbSchema/index';
import { client } from '#src/bot';

const CACHE_TTL = 36000;
const CACHE_PREFIX = 'blacklist:';

export class BlacklistRepository {
	constructor() {
		this.db = getDatabase();
	}

	async findById(id) {
		if (!id) return null;

		const cacheKey = `${CACHE_PREFIX}${id}`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const [entry] = await this.db
			.select()
			.from(blacklist)
			.where(eq(blacklist.id, id))
			.limit(1);

		const result = entry || null;
		if (result) {
			await client.c.set(cacheKey, result, CACHE_TTL);
		}

		return result;
	}

	async exists(id) {
		if (!id) return false;

		const cacheKey = `${CACHE_PREFIX}exists:${id}`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const entry = await this.findById(id);
		const result = !!entry;

		await client.c.set(cacheKey, result, CACHE_TTL);
		return result;
	}

	async create(data) {
		if (!data?.id) return;

		await this.db.insert(blacklist).values(data);

		await Promise.all([
			client.c.set(`${CACHE_PREFIX}${data.id}`, data, CACHE_TTL),
			client.c.set(`${CACHE_PREFIX}exists:${data.id}`, true, CACHE_TTL),
			this._invalidateListCaches(data.type),
		]);
	}

	async delete(id) {
		if (!id) return;

		const entry = await this.findById(id);
		await this.db.delete(blacklist).where(eq(blacklist.id, id));

		await this._invalidateCaches(id, entry?.type);
	}

	async findAll() {
		const cacheKey = `${CACHE_PREFIX}all`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const result = await this.db.select().from(blacklist);
		await client.c.set(cacheKey, result, 600);

		return result;
	}

	async findByType(type) {
		if (!type) return [];

		const cacheKey = `${CACHE_PREFIX}type:${type}`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const result = await this.db.select().from(blacklist).where(eq(blacklist.type, type));

		await client.c.set(cacheKey, result, CACHE_TTL);
		return result;
	}

	async deleteByType(type) {
		if (!type) return;

		await this.db.delete(blacklist).where(eq(blacklist.type, type));
		await this._invalidateTypeCaches(type);
	}

	async _invalidateCaches(id, type) {
		const keys = [
			`${CACHE_PREFIX}${id}`,
			`${CACHE_PREFIX}exists:${id}`,
			`${CACHE_PREFIX}all`,
		];

		if (type) {
			keys.push(`${CACHE_PREFIX}type:${type}`);
		}

		await client.c.mdel(keys);
	}

	async _invalidateListCaches(type) {
		const keys = [`${CACHE_PREFIX}all`];
		if (type) {
			keys.push(`${CACHE_PREFIX}type:${type}`);
		}
		await client.c.mdel(keys);
	}

	async _invalidateTypeCaches(type) {
		const pattern = `${CACHE_PREFIX}*`;
		const keys = await client.c.keys(pattern);
		await client.c.mdel(keys);
	}
}
