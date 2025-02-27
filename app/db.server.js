import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test the connection!
async function testConnection() {
	try {
		await prisma.$connect();
		console.log('🟢 Database connection successful');
		return true;
	} catch (error) {
		console.error('🔴 Database connection failed:', error);
		return false;
	}
}

testConnection().catch(console.error);

// Export the prisma instance as default and named export
export { prisma };
export default prisma;
export { testConnection };
