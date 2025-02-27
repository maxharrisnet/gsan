import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
export const prisma =
	globalForPrisma.prisma ??
	new PrismaClient({
		log: ['error', 'warn'],
	});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

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
export { testConnection };
