import util from 'util';
import {
	ContainerBuilder,
	TextDisplayBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
} from 'discord.js';

const config = {
	logLevel: 'debug',
	defaultContext: 'APP',
	timezone: 'Asia/Kolkata',
	colors: {
		info: '#2F6FD6',
		success: '#0FA37F',
		warning: '#C47A00',
		error: '#C2362B',
		debug: '#6B6B6B',
	},
	textColors: {
		message: '#D8DEE9',
		timestamp: '#7A7A7A',
		dimmed: '#4C4C4C',
		badge: '#E5E9F0',
	},
};

const rgb = (hex) => {
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return (t) => `\x1b[38;2;${r};${g};${b}m${t}\x1b[0m`;
};

const bg = (bgHex, fgHex) => {
	const br = parseInt(bgHex.slice(1, 3), 16);
	const bgc = parseInt(bgHex.slice(3, 5), 16);
	const bb = parseInt(bgHex.slice(5, 7), 16);
	const fr = parseInt(fgHex.slice(1, 3), 16);
	const fg = parseInt(fgHex.slice(3, 5), 16);
	const fb = parseInt(fgHex.slice(5, 7), 16);
	return (t) => `\x1b[48;2;${br};${bgc};${bb}m\x1b[38;2;${fr};${fg};${fb}m ${t} \x1b[0m`;
};

const text = {
	message: rgb(config.textColors.message),
	timestamp: rgb(config.textColors.timestamp),
	dimmed: rgb(config.textColors.dimmed),
};

class Logger {
	constructor() {
		this.levels = { debug: 0, info: 1, success: 2, warn: 3, error: 4 };
		this.consoleLogLevel = this.levels[config.logLevel] ?? 1;

		this.badges = {
			info: bg(config.colors.info, config.textColors.badge),
			success: bg(config.colors.success, config.textColors.badge),
			warn: bg(config.colors.warning, config.textColors.badge),
			error: bg(config.colors.error, config.textColors.badge),
			debug: bg(config.colors.debug, config.textColors.badge),
		};
	}

	_time() {
		return new Date().toLocaleTimeString('en-IN', {
			timeZone: config.timezone,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});
	}

	_fullTime() {
		return new Date().toLocaleString('en-IN', {
			timeZone: config.timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false,
		});
	}

	_parse(args) {
		let context = config.defaultContext;
		let error = null;
		const a = [...args];

		if (a[a.length - 1] instanceof Error) error = a.pop();
		if (typeof a[0] === 'string') context = a.shift();

		return { context, msg: a.length ? util.format(...a) : '', error };
	}

	_log(level, ...args) {
		if (!conf.debug && level === 'debug') return;
		if (this.levels[level] < this.consoleLogLevel) return;

		const { context, msg, error } = this._parse(args);

		const line =
			`${text.timestamp(this._time())} ` +
			`${this.badges[level](context)} ` +
			`${text.message(msg)}`;

		(level === 'error' || level === 'warn' ? console.warn : console.log)(line);

		if (error) {
			const out = error.stack || error.message || util.inspect(error);
			console.log(text.dimmed(out));
		}
	}

	info(...a) {
		this._log('info', ...a);
	}
	success(...a) {
		this._log('success', ...a);
	}
	warn(...a) {
		this._log('warn', ...a);
	}
	error(...a) {
		this._log('error', ...a);
	}
	debug(...a) {
		this._log('debug', ...a);
	}
}

export const logger = new Logger();
