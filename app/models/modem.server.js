import { prisma } from '../db.server';

// Utility function to handle Prisma reconnection
async function reconnectPrisma() {
	try {
		await prisma.$disconnect();
		await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before reconnecting
		await prisma.$connect();
	} catch (error) {
		console.error('🔄 Reconnection failed:', error);
		throw error;
	}
}

// Enhanced retry logic for Prisma queries
async function withPrismaRetry(operation, maxRetries = 3) {
	let lastError;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error;
			console.error(`📡 Attempt ${attempt}/${maxRetries} failed:`, error.message);

			const isPreparedStatementError = error.message?.includes('prepared statement') || error.code === '26000';

			if (isPreparedStatementError && attempt < maxRetries) {
				console.log(`🔄 Reconnecting Prisma (attempt ${attempt}/${maxRetries})...`);
				await reconnectPrisma();
				continue;
			}

			if (attempt === maxRetries) {
				console.error('❌ Max retries reached');
				throw lastError;
			}
		}
	}
}

export async function getLatestModemGPS(modemId, provider) {
	return withPrismaRetry(async () => {
		const result = await prisma.modemGPS.findFirst({
			where: {
				modemId,
				provider,
			},
			orderBy: {
				timestamp: 'desc',
			},
		});

		return result;
	});
}

export async function upsertModemGPS(data) {
	return withPrismaRetry(async () => {
		return prisma.modemGPS.upsert({
			where: {
				modemId_provider: {
					modemId: data.modemId,
					provider: data.provider,
				},
			},
			update: {
				latitude: data.latitude,
				longitude: data.longitude,
				timestamp: data.timestamp,
			},
			create: {
				modemId: data.modemId,
				provider: data.provider,
				latitude: data.latitude,
				longitude: data.longitude,
				timestamp: data.timestamp,
			},
		});
	});
}
