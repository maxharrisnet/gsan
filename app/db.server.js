import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;

export const prisma =
	globalForPrisma.prisma ||
	new PrismaClient({
		log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
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

export { testConnection };
export default prisma;
