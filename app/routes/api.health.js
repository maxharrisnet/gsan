import { json } from '@remix-run/node';
import { PrismaClient } from '@prisma/client';

export async function loader() {
	const prisma = new PrismaClient();

	try {
		// Try to query the database
		await prisma.$queryRaw`SELECT 1`;

		return json({
			status: 'healthy',
			database: 'connected',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('🔴 Database connection error:', error);

		return json(
			{
				status: 'unhealthy',
				error: error.message,
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	} finally {
		await prisma.$disconnect();
	}
}
