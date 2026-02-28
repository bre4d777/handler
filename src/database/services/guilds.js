import { GuildRepository } from '#dbRepo/guilds';
import { config } from '#config/config';
import { logger } from '#utils';
import { client } from '#src/bot';
import { PlayerManager } from '#classes/player';
import { db } from '#db/Manager';

export class GuildService {
	constructor() {
		this.repo = new GuildRepository();
	}

	async getGuild(guildId) {
		return await this.repo.findById(guildId);
	}

	async ensureGuild(guildId) {
		return await this.repo.findOrCreate(guildId);
	}

	async getPrefixes(guildId) {
		const guild = await this.ensureGuild(guildId);
		return Array.isArray(guild.prefixes) && guild.prefixes.length > 0
			? guild.prefixes
			: [config.prefix];
	}

	async setPrefixes(guildId, prefixes) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { prefixes });
	}

	async getIgnoredChannels(guildId) {
		const guild = await this.ensureGuild(guildId);
		return Array.isArray(guild.ignoredChannels) ? guild.ignoredChannels : [];
	}

	async setIgnoredChannels(guildId, channels) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { ignoredChannels: channels });
	}

	async isChannelIgnored(guildId, channelId) {
		const ignored = await this.getIgnoredChannels(guildId);
		return ignored.includes(channelId);
	}

	async getAllGuilds() {
		return await this.repo.findAll();
	}


	async updateSettings(guildId, settings) {
		await this.ensureGuild(guildId);

		const allowedKeys = [
			'prefixes',
			'ignoredChannels',
		];

		const updates = {};

		for (const key of allowedKeys) {
			if (settings[key] === undefined) continue;
			updates[key] = settings[key];
		}

		if (Object.keys(updates).length === 0) return 0;

		await this.repo.update(guildId, updates);
		return Object.keys(updates).length;
	}

	async getAvatarUpdatedAt(guildId) {
		const guild = await this.ensureGuild(guildId);
		return guild.avatarUpdatedAt;
	}

	async setAvatarUpdatedAt(guildId) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { avatarUpdatedAt: new Date() });
		return true;
	}

	async getBannerUpdatedAt(guildId) {
		const guild = await this.ensureGuild(guildId);
		return guild.bannerUpdatedAt;
	}

	async setBannerUpdatedAt(guildId) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { bannerUpdatedAt: new Date() });
		return true;
	}

	async getBioUpdatedAt(guildId) {
		const guild = await this.ensureGuild(guildId);
		return guild.bioUpdatedAt;
	}

	async setBioUpdatedAt(guildId) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { bioUpdatedAt: new Date() });
		return true;
	}
	async getCustomProfileStatus(guildId) {
		const guild = await this.ensureGuild(guildId);
		return guild.isCustomProfile;
	}
	async setCustomProfileStatus(guildId, status) {
		await this.ensureGuild(guildId);
		await this.repo.update(guildId, { isCustomProfile: status });
	}
	async deleteGuild(guildId) {
		if (!guildId) {
			logger.error('GuildService', 'Cannot delete guild: no guildId provided');
			return;
		}

		await this.repo.delete(guildId);
	}
}
