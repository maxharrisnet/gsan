import { authenticateShopifyCustomer } from './user.server';
import { authenticateSonarUser } from './sonar.server';
import { createUserSession } from './session.server';

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
		return createUserSession(authResult.userData, '/preformance');
	}
	return authResult;
}
