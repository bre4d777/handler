import { Bot } from '#classes/client';
import { logger } from '#utils';

	const client = new Bot();

	const main = async () => {
		try {
			await client.init();
		} catch (error) {
			logger.error('Main', 'Initialization failed:', error);
			process.exit(1);
		}

	const shutdown = async (signal) => {
		logger.info('Shutdown', `Received ${signal}, shutting down gracefully`);
		try {
			await client.cleanup();
			logger.success('Shutdown', 'Bot shut down successfully');
			process.exit(0);
		} catch (error) {
			logger.error('Shutdown', 'Shutdown error:', error);
			process.exit(1);
		}
	};

	process.on('unhandledRejection', (reason, promise) => {
		logger.error('Process', 'Unhandled Rejection:', reason);
	});

	process.on('uncaughtException', (error, origin) => {
		logger.error('Process', `Uncaught Exception at ${origin}:`, error);
	});

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));

	main();
}

export { client };
