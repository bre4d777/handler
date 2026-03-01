/**
 * Pause execution for the specified number of milliseconds.
 * @param {number} ms - Delay duration in milliseconds.
 * @returns {Promise<void>} No value.
 */
export async function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}