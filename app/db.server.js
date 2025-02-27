import { PrismaClient } from '@prisma/client';

let prisma;

// Prevent multiple instances of Prisma Client in development
if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient();
} else {
	if (!global.__db) {
		global.__db = new PrismaClient();
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
