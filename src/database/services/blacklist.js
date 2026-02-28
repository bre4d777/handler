import { BlacklistRepository } from '#dbRepo/blacklist';
import { logger } from '#utils';

export class BlacklistService {
	constructor() {
		this.repo = new BlacklistRepository();
	}

	async checkBlacklist(id) {
		return await this.repo.exists(id);
	}

	async getBlacklist(id) {
		return await this.repo.findById(id);
	}

	async blacklistUser(userId, blacklistedBy, reason) {
		if (await this.checkBlacklist(userId)) {
			return await this.getBlacklist(userId);
		}

		const data = {
			id: userId,
			blacklistedBy,
			reason,
			type: 'user',
			createdAt: new Date(),
		};

		await this.repo.create(data);

		return data;
	}

	async blacklistGuild(guildId, blacklistedBy, reason) {
		if (await this.checkBlacklist(guildId)) {
			return await this.getBlacklist(guildId);
		}

		const data = {
			id: guildId,
			blacklistedBy,
			reason,
			type: 'guild',
			createdAt: new Date(),
		};

		await this.repo.create(data);

		return data;
	}

	async unblacklist(id) {
		if (!(await this.checkBlacklist(id))) return false;
		await this.repo.delete(id);

		return true;
	}

	async getAllBlacklist(type) {
		if (type) {
			return await this.repo.findByType(type);
		}
		return await this.repo.findAll();
	}

	async unblacklistType(type) {
		await this.repo.deleteByType(type);
	}

	async unblacklistGuilds() {
		await this.unblacklistType('guild');
	}

	async unblacklistUsers() {
		await this.unblacklistType('user');
	}
}
