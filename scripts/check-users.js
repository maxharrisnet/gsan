import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
	try {
		const users = await prisma.user.findMany();
		console.log(
			'📊 Current users in database:',
			users.map((user) => ({
				id: user.id,
				email: user.email,
				role: user.role,
			}))
		);
	} catch (error) {
		console.error('❌ Failed to fetch users:', error);
	} finally {
		await prisma.$disconnect();
	}
}

checkUsers();
