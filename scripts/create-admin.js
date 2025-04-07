import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
	try {
		// Check if admin already exists
		const existingAdmin = await prisma.user.findUnique({
			where: {
				email: 'admin@switch.ca',
			},
		});

		if (existingAdmin) {
			console.log('⚠️ Admin user already exists');
			return;
		}

		const hashedPassword = await bcrypt.hash('Switch@36', 10);

		const admin = await prisma.user.create({
			data: {
				email: 'admin@switch.ca',
				password: hashedPassword,
				firstName: 'Admin',
				lastName: 'User',
				companyName: 'Switch Incorporated',
				kits: ['ALL'], // Admin gets access to all kits
				role: 'ADMIN',
			},
		});

		console.log('✅ Admin user created successfully:', {
			id: admin.id,
			email: admin.email,
			role: admin.role,
			companyName: admin.companyName,
			kits: admin.kits,
		});
	} catch (error) {
		console.error('❌ Failed to create admin:', error);
	} finally {
		await prisma.$disconnect();
	}
}

createAdminUser();
