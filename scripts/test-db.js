import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
	try {
		await prisma.$connect();
		console.log('✅ Successfully connected to the database');

		// Test query
		const count = await prisma.modemGPS.count();
		console.log(`📊 Current ModemGPS records: ${count}`);
	} catch (error) {
		console.error('❌ Database connection failed:', error);
	} finally {
		await prisma.$disconnect();
	}
}

testConnection();
