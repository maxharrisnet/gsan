import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
	log: ['query', 'error', 'warn'],
});

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

export default prisma;
export { prisma };
export { testConnection };
