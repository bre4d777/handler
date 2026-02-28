import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '#dbSchema/index';
import { logger } from '#utils';
import { config } from '#config/config';

let db = null;
let client = null;

export const initDatabase = () => {
	if (db) return db;

	const connectionString = config.database.url;

	if (!connectionString) {
		throw new Error('DATABASE_URL is required');
	}

	client = postgres(connectionString, {
		max: config.database.max_connections,
		connect_timeout: config.database.connect_timeout,
		max_lifetime: config.database.max_lifetime,
	});

	db = drizzle(client, { schema, logger: config.database.logger });

	logger.success('Database', 'PostgreSQL connection initialized');
	return db;
};

export const getDatabase = () => {
	if (!db) {
		throw new Error('Database not initialized');
	}
	return db;
};

export const closeDatabase = async () => {
	if (client) {
		await client.end();
		db = null;
		client = null;
		logger.info('Database', 'PostgreSQL connection closed');
	}
};
