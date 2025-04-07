import { authenticateShopifyCustomer } from './user.server';
import { authenticateSonarUser } from './sonar.server';
import { createUserSession, getSession } from './session.server';
import prisma from '../db.server';
import bcrypt from 'bcryptjs';
import { redirect } from '@remix-run/node';

export async function authenticateUser(loginType, credentials, request) {
	if (loginType === 'shopify') {
		return authenticateShopifyCustomer(credentials.email, credentials.password, request);
	} else if (loginType === 'sonar') {
		return authenticateSonarUser(credentials.username, credentials.password);
	}
	return { success: false, errors: [{ message: 'Invalid login type' }] };
}

export async function handleLogin(loginType, credentials) {
	const authResult = await authenticateUser(loginType, credentials);
	if (authResult.success) {
		return createUserSession(authResult.userData, '/performance');
	}
	return authResult;
}

export async function createUser({ email, password, firstName, lastName, role = 'USER' }) {
	const hashedPassword = await bcrypt.hash(password, 10);

	return prisma.user.create({
		data: {
			email,
			password: hashedPassword,
			firstName,
			lastName,
			role,
		},
	});
}

export async function verifyLogin(email, password) {
	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		return null;
	}

	const isValid = await bcrypt.compare(password, user.password);
	if (!isValid) {
		return null;
	}

	const { password: _, ...userWithoutPassword } = user;
	return userWithoutPassword;
}

export async function updateUserPassword(userId, newPassword) {
	const hashedPassword = await bcrypt.hash(newPassword, 10);

	return prisma.user.update({
		where: { id: userId },
		data: { password: hashedPassword },
	});
}

export async function getAllUsers() {
	return prisma.user.findMany({
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
			createdAt: true,
			updatedAt: true,
		},
	});
}

export async function getUserById(id) {
	return prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
			createdAt: true,
			updatedAt: true,
		},
	});
}

export async function updateUser(id, data) {
	return prisma.user.update({
		where: { id },
		data: {
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			role: data.role,
		},
	});
}

export async function deleteUser(id) {
	return prisma.user.delete({
		where: { id },
	});
}

export async function requireUser(request) {
	const session = await getSession(request.headers.get('Cookie'));
	const userId = session.get('userId');

	if (!userId) {
		throw redirect('/auth');
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: {
			id: true,
			email: true,
			firstName: true,
			lastName: true,
			role: true,
		},
	});

	if (!user) {
		throw redirect('/auth');
	}

	return user;
}

export async function requireAdmin(request) {
	const user = await requireUser(request);

	if (user.role !== 'ADMIN') {
		throw redirect('/dashboard');
	}

	return user;
}
