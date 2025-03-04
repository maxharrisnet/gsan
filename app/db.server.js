import { PrismaClient } from '@prisma/client';

let prisma;

// Check if we're in production
if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient();
} else {
	// In development, use a global variable to prevent multiple instances
	if (!global.__db) {
		global.__db = new PrismaClient({
			log: ['query', 'error', 'warn'],
			// Configure connection timeout
			connection: {
				timeout: 20000, // 20 seconds
			},
		});
	}
	prisma = global.__db;
}

// Test the connection!
async function testConnection() {
	try {
		// Try a simple query
		await prisma.$queryRaw`SELECT NOW()`;
		console.log('✅ Database connection successful');
	} catch (error) {
		console.error('🔴 Database connection error:', {
			message: error.message,
			code: error.code,
			meta: error.meta,
		});
		throw error;
	}
}

testConnection().catch(console.error);

export { prisma };
export default prisma;
export { testConnection };
