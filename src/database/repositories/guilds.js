import { eq, sql } from 'drizzle-orm';
import { getDatabase } from '#db/drizzle';
import { guilds } from '#dbSchema/index';
import { config } from '#config/config';
import { client } from '#src/bot';

const CACHE_TTL = 18000;
const CACHE_PREFIX = 'guild:';

export class GuildRepository {
	constructor() {
		this.db = getDatabase();
	}

	async findById(guildId) {
		if (!guildId) return null;

		const cacheKey = `${CACHE_PREFIX}${guildId}`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const [guild] = await this.db
			.select()
			.from(guilds)
			.where(eq(guilds.id, guildId))
			.limit(1);

		const result = guild || null;
		if (result) {
			await client.c.set(cacheKey, result, CACHE_TTL);
		}

		return result;
	}

	async findOrCreate(guildId) {
		if (!guildId) {
			throw new Error('Invalid guildId');
		}

		let guild = await this.findById(guildId);

		if (!guild) {
			const now = new Date();
			const newGuild = {
				id: guildId,
				prefixes: [config.prefix],
				ignoredChannels: [],
				isCustomProfile: false,
				avatarUpdatedAt: null,
				bannerUpdatedAt: null,
				bioUpdatedAt: null,,
				createdAt: now,
				updatedAt: now,
			};

			await this.db.insert(guilds).values(newGuild);

			await Promise.all([
				client.c.set(`${CACHE_PREFIX}${guildId}`, newGuild, CACHE_TTL),
				this._invalidateListCaches(),
			]);

			return newGuild;
		}

		return guild;
	}

	async update(guildId, data) {
		if (!guildId) return;

		data.updatedAt = new Date();
		await this.db.update(guilds).set(data).where(eq(guilds.id, guildId));

		await this._invalidateGuildCaches(guildId, data);
	}

	async delete(guildId) {
		if (!guildId) return;

		await this.db.delete(guilds).where(eq(guilds.id, guildId));
		await this._invalidateGuildCaches(guildId, { deleted: true });
	}

	async findAll() {
		const cacheKey = `${CACHE_PREFIX}all`;
		const cached = await client.c.get(cacheKey);
		if (cached !== null && cached !== undefined) return cached;

		const result = await this.db.select().from(guilds);
		await client.c.set(cacheKey, result, 1800);

		return result;
	}

	async incrementField(guildId, field, amount = 1) {
		if (!guildId || !field) return;

		await this.db
			.update(guilds)
			.set({
				[field]: sql`${guilds[field]} + ${amount}`,
				updatedAt: new Date(),
			})
			.where(eq(guilds.id, guildId));

		await client.c.del(`${CACHE_PREFIX}${guildId}`);
	}

	async _invalidateGuildCaches(guildId, data = {}) {
		const keys = [`${CACHE_PREFIX}${guildId}`];

		if (data.twentyFourSeven !== undefined || data.deleted) {
			keys.push(`${CACHE_PREFIX}247:enabled`);
		}

		keys.push(`${CACHE_PREFIX}all`);

		await client.c.mdel(keys);
	}

	async _invalidateListCaches() {
		await client.c.mdel([`${CACHE_PREFIX}all`, `${CACHE_PREFIX}247:enabled`]);
	}
}
