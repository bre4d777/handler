import { PermissionFlagsBits } from 'discord.js';
import { config } from '#config/config';
import { client } from '#src/bot';

const ownerSet = new Set(config.ownerIds || []);
const permissionNames = new Map();

for (const [name, value] of Object.entries(PermissionFlagsBits)) {
	if (permissionNames.get(value)) continue;
	permissionNames.set(
		value,
		name
			.split(/(?=[A-Z])/)
			.join(' ')
			.replace(/^./, (str) => str.toUpperCase()),
	);
}

export const isOwner = (userId) => ownerSet.has(userId);

export const canUseCommand = (member, command) => {
	if (!member || !member.permissions) return false;
	if (command.ownerOnly && !ownerSet.has(member.id)) return false;
	if (!command.userPermissions?.length) return true;

	const perms = member.permissions;
	for (const perm of command.userPermissions) {
		if (!perms.has(perm)) return false;
	}
	return true;
};

export const getMissingBotPermissions = (channel, permissions) => {
	if (!channel || !channel.guild || !channel.guild.members?.me || !permissions?.length) {
		return permissions?.map((p) => permissionNames.get(p) || 'Unknown Permission') || [];
	}

	try {
		const botPerms = channel.guild.members.me.permissionsIn(channel);
		if (!botPerms) {
			return permissions.map((p) => permissionNames.get(p) || 'Unknown Permission');
		}

		const missing = [];
		for (const perm of permissions) {
			if (!botPerms.has(p)) {
				missing.push(permissionNames.get(p) || 'Unknown Permission');
			}
		}
		return missing;
	} catch (error) {
		return permissions.map((p) => permissionNames.get(p) || 'Unknown Permission');
	}
};

export const canBotSendMessages = (channel) => {
	if (!channel || !channel.guild || !channel.guild.members?.me) return false;

	try {
		const botPerms = channel.guild.members.me.permissionsIn(channel);
		if (!botPerms) return false;

		return (
			botPerms.has(PermissionFlagsBits.SendMessages) &&
			botPerms.has(PermissionFlagsBits.ViewChannel)
		);
	} catch (error) {
		return false;
	}
};

export const canBotUseVoiceChannel = (voiceChannel) => {
	if (!voiceChannel || !voiceChannel.guild || !voiceChannel.guild.members?.me) {
		return {
			canView: false,
			canConnect: false,
			canSpeak: false,
			missing: ['View Channel', 'Connect', 'Speak'],
		};
	}

	try {
		const botPerms = voiceChannel.guild.members.me.permissionsIn(voiceChannel);
		if (!botPerms) {
			return {
				canView: false,
				canConnect: false,
				canSpeak: false,
				missing: ['View Channel', 'Connect', 'Speak'],
			};
		}

		return {
			canView: botPerms.has(PermissionFlagsBits.ViewChannel),
			canConnect: botPerms.has(PermissionFlagsBits.Connect),
			canSpeak: botPerms.has(PermissionFlagsBits.Speak),
			missing: [],
		};
	} catch (error) {
		return {
			canView: false,
			canConnect: false,
			canSpeak: false,
			missing: ['View Channel', 'Connect', 'Speak'],
		};
	}
};

export const getVoiceChannelMissingPermissions = (voiceChannel) => {
	if (!voiceChannel || !voiceChannel.guild || !voiceChannel.guild.members?.me) {
		return ['View Channel', 'Connect', 'Speak'];
	}

	try {
		const botPerms = voiceChannel.guild.members.me.permissionsIn(voiceChannel);
		if (!botPerms) {
			return ['View Channel', 'Connect', 'Speak'];
		}

		const missing = [];
		if (!botPerms.has(PermissionFlagsBits.ViewChannel)) {
			missing.push('View Channel');
		}
		if (!botPerms.has(PermissionFlagsBits.Connect)) {
			missing.push('Connect');
		}
		if (!botPerms.has(PermissionFlagsBits.Speak)) {
			missing.push('Speak');
		}

		return missing;
	} catch (error) {
		return ['View Channel', 'Connect', 'Speak'];
	}
};

export const getUserPermissionsList = (userPermissions) =>
	userPermissions?.length
		? userPermissions
				.map((p) => permissionNames.get(p) || 'Unknown Permission')
				.join(', ')
		: null;

export const validateCommand = async (ctx, command) => {
	if (!ctx || !command) {
		return {
			valid: false,
			error: {
				title: 'Invalid Request',
				description: 'Command context is invalid.',
			},
		};
	}

	const user = ctx.interaction?.user || ctx.message?.author;
	const channel = ctx.interaction?.channel || ctx.message?.channel;
	const guild = ctx.interaction?.guild || ctx.message?.guild;

	if (!user || !channel || !guild) {
		return {
			valid: false,
			error: {
				title: 'Context Error',
				description: 'Unable to process command context.',
			},
		};
	}

	if (!canBotSendMessages(channel)) {
		return {
			valid: false,
			error: {
				title: 'Missing Bot Permissions',
				description:
					"I don't have permission to send messages in this channel. Please grant me the **Send Messages** and **View Channel** permissions.",
			},
			cannotReply: true,
		};
	}

	let member;
	try {
		member = await guild.members.fetch(user.id);
	} catch (error) {
		return {
			valid: false,
			error: {
				title: 'Member Not Found',
				description: 'Could not fetch your member data.',
			},
		};
	}

	if (!member) {
		return {
			valid: false,
			error: {
				title: 'Member Not Found',
				description: 'Could not fetch your member data.',
			},
		};
	}

	if (command.maintenance && !ownerSet.has(user.id)) {
		return {
			valid: false,
			error: {
				title: 'Command Under Maintenance',
				description: 'This command is temporarily unavailable. Please try again later.',
			},
		};
	}

	if (command.ownerOnly && !ownerSet.has(user.id)) {
		return {
			valid: false,
			error: {
				title: 'Permission Denied',
				description: 'This is an owner-only command.',
			},
		};
	}

	if (!canUseCommand(member, command)) {
		const requiredPerms = getUserPermissionsList(command.userPermissions);
		return {
			valid: false,
			error: {
				title: 'Insufficient Permissions',
				description: requiredPerms
					? `You do not have the required permissions to use this command. You need: \`${requiredPerms}\``
					: 'You do not have the required permissions to use this command.',
			},
		};
	}

	if (command.permissions?.length) {
		const missingBotPerms = getMissingBotPermissions(channel, command.permissions);
		if (missingBotPerms.length) {
			return {
				valid: false,
				error: {
					title: 'Missing Bot Permissions',
					description: `I need the following permissions to run this command: \`${missingBotPerms.join(', ')}\``,
				},
			};
		}
	}

	if (command.voiceRequired && (!member.voice || !member.voice.channel)) {
		return {
			valid: false,
			error: {
				title: 'Voice Channel Required',
				description: 'You must be in a voice channel to use this command.',
			},
		};
	}

	if (command.voiceRequired && member.voice?.channel) {
		const voiceMissing = getVoiceChannelMissingPermissions(member.voice.channel);
		if (voiceMissing.length > 0) {
			return {
				valid: false,
				error: {
					title: 'Voice Channel Permissions',
					description: `I need the following permissions in your voice channel: \`${voiceMissing.join(', ')}\``,
				},
			};
		}
	}

	if (command.sameVoiceChannel && !inSameVoiceChannel(member, guild)) {
		return {
			valid: false,
			error: {
				title: 'Same Voice Channel Required',
				description:
					'You must be in the same voice channel as the bot to use this command.',
			},
		};
	}

	return { valid: true };
};

export const inSameVoiceChannel = (member, guild) => {
	if (!member || !guild || !guild.members?.me) return false;
	if (!member.voice || !guild.members.me.voice) return false;

	try {
		const botChannel = guild.members.me.voice.channel;
		const memberChannel = member.voice.channel;

		if (!botChannel) return !!memberChannel;
		if (!memberChannel) return false;

		return member.voice.channelId === guild.members.me.voice.channelId;
	} catch (error) {
		return false;
	}
};
