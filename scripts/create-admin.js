import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
	try {
		const hashedPassword = await bcrypt.hash('admin123', 10); // Change this password!

		const admin = await prisma.user.create({
			data: {
				email: 'admin@switch.ca', // Change this email!
				password: hashedPassword,
				firstName: 'Admin',
				lastName: 'User',
				role: 'ADMIN',
			},
		});

		console.log('✅ Admin user created:', admin);
	} catch (error) {
		console.error('❌ Failed to create admin:', error);
	} finally {
		await prisma.$disconnect();
	}
}

createAdminUser();
