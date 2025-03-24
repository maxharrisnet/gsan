import axios from 'axios';
import { json } from '@remix-run/node';

const SONAR_API_URL = process.env.SONAR_API_URL;
const SONAR_API_KEY = process.env.SONAR_API_KEY;

// Base Sonar API client
const sonarClient = axios.create({
	baseURL: SONAR_API_URL,
	headers: {
		'Content-Type': 'application/json',
		'X-API-KEY': SONAR_API_KEY,
	},
});

// Add rate limiting for email lookup
const lookupCache = new Map();
const THROTTLE_WINDOW = 60000; // 1 minute
const MAX_ATTEMPTS = 3;

async function throttledEmailLookup(email) {
	const now = Date.now();
	const cacheKey = email.toLowerCase();
	const cached = lookupCache.get(cacheKey);

	// Check if we're within the throttle window
	if (cached) {
		if (now - cached.timestamp < THROTTLE_WINDOW) {
			if (cached.attempts >= MAX_ATTEMPTS) {
				throw new Error('Too many lookup attempts. Please try again later.');
			}
			cached.attempts++;
		} else {
			// Reset if outside window
			cached.attempts = 1;
			cached.timestamp = now;
		}
	} else {
		lookupCache.set(cacheKey, { attempts: 1, timestamp: now });
	}

	try {
		const response = await sonarClient.post('/api/v1/customer_portal/email_lookup', {
			email: email,
		});
		return response.data;
	} catch (error) {
		console.error('Email lookup error:', error.response?.data || error.message);
		throw error;
	}
}

export async function authenticateSonarUser(email, password) {
	try {
		// First, validate the email exists and is eligible
		const lookupResult = await throttledEmailLookup(email);

		if (!lookupResult.success || !lookupResult.data) {
			console.log('❌ Email lookup failed for:', email);
			return {
				success: false,
				error: 'Invalid email address or account not eligible for portal access',
			};
		}

		// Then attempt authentication
		const authResponse = await sonarClient.post('/api/v1/customer_portal/authenticate', {
			email: email,
			password: password,
		});

		if (!authResponse.data?.success) {
			console.log('❌ Authentication failed for:', email);
			return { success: false, error: 'Invalid credentials' };
		}

		const userData = {
			id: authResponse.data.data.id,
			email: email,
			type: 'sonar',
			accountDetails: {
				...lookupResult.data,
				...authResponse.data.data,
			},
		};

		console.log('✅ Authentication successful for:', email);
		return { success: true, userData };
	} catch (error) {
		console.error('🚨 Sonar authentication error:', error.response?.data || error.message);
		return {
			success: false,
			error: 'Authentication failed. Please try again.',
		};
	}
}

// New function to update password
export async function updateSonarPassword(email, currentPassword, newPassword) {
	try {
		// First verify current credentials
		const authResult = await authenticateSonarUser(email, currentPassword);
		if (!authResult.success) {
			return { success: false, error: 'Current password is incorrect' };
		}

		// Use Sonar's password update endpoint
		const response = await sonarClient.patch('/api/v1/customer_portal/update_password', {
			email,
			current_password: currentPassword,
			new_password: newPassword,
		});

		if (response.data?.success) {
			return { success: true };
		}

		return {
			success: false,
			error: 'Failed to update password',
		};
	} catch (error) {
		console.error('🚨 Password update error:', error.response?.data || error.message);
		return {
			success: false,
			error: 'Failed to update password. Please try again.',
		};
	}
}

// New function to request password reset
export async function requestPasswordReset(email) {
	try {
		// First verify the email exists and is eligible
		const lookupResult = await throttledEmailLookup(email);

		if (!lookupResult.success || !lookupResult.data) {
			return {
				success: false,
				error: 'Email address not found or not eligible for password reset',
			};
		}

		// Then request the password reset
		const response = await sonarClient.post('/api/v1/customer_portal/request_password_reset', {
			email: email,
		});

		if (response.data?.success) {
			return { success: true };
		}

		return {
			success: false,
			error: 'Failed to request password reset',
		};
	} catch (error) {
		console.error('🚨 Password reset request error:', error.response?.data || error.message);
		return {
			success: false,
			error: 'Failed to request password reset. Please try again later.',
		};
	}
}

// Add a test function for development
export async function testEmailLookup(email) {
	try {
		const result = await throttledEmailLookup(email);
		console.log('📧 Email lookup result:', result);
		return result;
	} catch (error) {
		console.error('📧 Email lookup error:', error);
		throw error;
	}
}

export const getSonarCustomFields = async function (accountId) {
	try {
		console.log(`📊 Fetching custom fields for account: ${accountId}`);

		const response = await axios.get(`${SONAR_API_URL}/entity_custom_fields/account/${accountId}`, {
			headers: {
				Authorization: `Basic ${sonarAuth}`,
			},
		});

		if (response.data && response.data.data) {
			console.log(`✅ Retrieved ${response.data.data.length} custom fields`);
			return { success: true, data: response.data.data };
		} else {
			console.log('⚠️ No custom fields data found in response');
			return { success: false, error: 'Sonar custom fields not found' };
		}
	} catch (error) {
		console.error('❌ Error fetching custom fields:', error.message);
		return { success: false, error: 'Failed to fetch custom fields' };
	}
};

export const getSonarServicePlan = async function (accountId) {
	try {
		const response = await axios.get(`${SONAR_API_URL}/accounts/${accountId}/service_plan`, {
			headers: {
				Authorization: `Basic ${sonarAuth}`,
			},
		});
		return { success: true, data: response.data.data };
	} catch (error) {
		return { success: false, error: 'Failed to fetch service plan' };
	}
};
