import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
	log: ['query', 'error', 'warn'],
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});

// Handle connection errors
prisma.$connect()
	.catch((error) => {
		console.error('🚨 Database connection error:', error);
		process.exit(1);
	});

// Handle cleanup on app shutdown
process.on('beforeExit', async () => {
	await prisma.$disconnect();
});

export { prisma };
