import { logger } from '#utils';

/**
 * Handles registration and teardown of Discord client event listeners.
 * Tracks every registered listener so they can be cleanly removed later.
 */
export default class DiscordHandler {
	/** @param {import('#classes/client').Bot} client */
	constructor(client) {
		this.client = client;
		/** @type {Map<string, Function>} Event name → bound listener function. */
		this.registeredEvents = new Map();
	}

	/**
	 * Attaches an event listener to the Discord client.
	 * Uses `once` for one-shot events, `on` for persistent ones.
	 * @param {{ name: string, once?: boolean, execute: Function }} event
	 * @returns {Promise<boolean>} `false` if registration failed.
	 */
	async register(event) {
		try {
			const listener = (...args) => {
				try {
					event.execute({ eventArgs: args, client: this.client });
				} catch (error) {
					logger.error('DiscordEvent', `Error in Discord event ${event.name}:`, error);
				}
			};

			if (event.once) {
				this.client.once(event.name, listener);
			} else {
				this.client.on(event.name, listener);
			}

			this.registeredEvents.set(event.name, listener);
			return true;
		} catch (error) {
			logger.error(
				'DiscordEvent',
				`Failed to register Discord event: ${event.name}`,
				error,
			);
			return false;
		}
	}

	/**
	 * Removes the listener for a specific event name and forgets it.
	 * No-ops if the event was never registered.
	 * @param {string} eventName
	 * @returns {Promise<void>}
	 */
	async unregister(eventName) {
		if (this.registeredEvents.has(eventName)) {
			this.client.removeListener(eventName, this.registeredEvents.get(eventName));
			this.registeredEvents.delete(eventName);
		}
	}

	/**
	 * Removes all registered event listeners and clears the tracking map.
	 * @returns {Promise<void>}
	 */
	async unregisterAll() {
		for (const [eventName, listener] of this.registeredEvents) {
			this.client.removeListener(eventName, listener);
		}
		this.registeredEvents.clear();
	}
}