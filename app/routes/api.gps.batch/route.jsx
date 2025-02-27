import { json } from '@remix-run/node';
import { getCompassAccessToken, fetchServicesAndModemData } from '../../compass.server';
import { getGPSURL } from '../../api/api.gps';
import { upsertModemGPS } from '../../models/modem.server';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
console.log('🔄 Route module loaded');

// Initialize Prisma with correct configuration
const prisma = new PrismaClient({
	log: ['error', 'warn', 'info'],
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});

// Add event listeners for better logging
prisma.$on('query', (e) => {
	console.log('🔍 Query:', e.query);
});

prisma.$on('error', (e) => {
	console.error('💥 Database Error:', e);
});

// Improve connection management
let isConnected = false;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const connectDB = async () => {
	let retries = 0;
	while (retries < MAX_RETRIES) {
		try {
			if (!isConnected) {
				await prisma.$connect();
				isConnected = true;
				console.log('📡 Database connected successfully');
				return;
			}
			return;
		} catch (error) {
			retries++;
			console.error(`💥 Database connection error (attempt ${retries}/${MAX_RETRIES}):`, error);
			if (retries === MAX_RETRIES) throw error;
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * retries));
		}
	}
};

// Update timeout and retry settings
const API_TIMEOUT = 30000; // 30 seconds
const RETRYABLE_STATUS_CODES = [429, 502, 503, 504, 524]; // Added 524

const fetchWithRetry = async (fn, retries = 3, initialDelay = 1000) => {
	const MAX_DELAY = 10000;
	let lastError;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			const statusCode = error.response?.status;

			if (RETRYABLE_STATUS_CODES.includes(statusCode)) {
				const delayMs = Math.min(initialDelay * Math.pow(2, attempt - 1), MAX_DELAY);
				console.log(`🕒 Timeout/Gateway error (${statusCode}). Attempt ${attempt}/${retries}. Waiting ${delayMs / 1000}s before retry`);
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				continue;
			}

			console.error(`❌ Non-retryable error (${statusCode}):`, error.message);
			throw error;
		}
	}

	console.warn('⚠️ All retry attempts failed');
	throw lastError;
};

export async function loader({ request }) {
	try {
		// Connect to database first
		await connectDB();

		// Log the start of the request
		console.log('🚀 Starting GPS batch update');

		// Verify authorization
		const authHeader = request.headers.get('Authorization');
		console.log('🔑 Auth header present:', !!authHeader);

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			console.error('❌ Missing or invalid Authorization header');
			return json({ success: false, error: 'Unauthorized' }, { status: 401 });
		}

		const token = authHeader.split(' ')[1];
		if (token !== process.env.CRON_SECRET) {
			console.error('❌ Invalid token');
			return json({ success: false, error: 'Invalid token' }, { status: 401 });
		}

		// Log each step of the process
		console.log('🔍 Fetching services data...');
		const { services } = await fetchServicesAndModemData();
		console.log('📦 Services fetched:', services?.length || 0);

		// Process modems using the same pattern as map.jsx
		const modemsByProvider = services.reduce((acc, service) => {
			if (!service.modems) return acc;

			service.modems.forEach((modem) => {
				if (modem?.id && modem?.type) {
					const provider = modem.type.toLowerCase();
					acc[provider] = acc[provider] || [];
					acc[provider].push(modem.id);
				}
			});
			return acc;
		}, {});

		if (Object.keys(modemsByProvider).length === 0) {
			console.warn('⚠️ No valid modems found in services');
			return json({ success: false, error: 'No valid modems found' }, { status: 404 });
		}

		const results = [];

		// Process each provider's modems
		for (const [provider, modemIds] of Object.entries(modemsByProvider)) {
			const accessToken = await getCompassAccessToken();
			const url = getGPSURL(provider);

			if (!url) {
				console.warn(`⚠️ No GPS URL for provider: ${provider}`);
				continue;
			}

			try {
				const response = await fetchWithRetry(async () => {
					return await axios.post(
						url,
						{ ids: modemIds },
						{
							headers: {
								Authorization: `Bearer ${accessToken}`,
								'Content-Type': 'application/json',
								Accept: 'application/json',
							},
							timeout: API_TIMEOUT,
							// Add additional axios config for better timeout handling
							timeoutErrorMessage: 'Request timed out - server took too long to respond',
							maxRedirects: 5,
						}
					);
				});

				// Save GPS data for each modem
				for (const [modemId, entries] of Object.entries(response.data)) {
					if (!Array.isArray(entries) || !entries.length) continue;

					const latestEntry = entries[0];
					if (!latestEntry?.lat || !latestEntry?.lon) continue;

					await upsertModemGPS({
						modemId,
						provider,
						latitude: parseFloat(latestEntry.lat),
						longitude: parseFloat(latestEntry.lon),
						timestamp: new Date(latestEntry.timestamp * 1000),
					});

					results.push({
						modemId,
						provider,
						status: 'success',
					});
				}
			} catch (error) {
				console.error(`🚨 Error fetching GPS data for ${provider}:`, error);
				results.push({
					provider,
					status: 'error',
					message: error.message,
				});
			}
		}

		return json({
			success: true,
			updated: results.filter((r) => r.status === 'success').length,
			results,
		});
	} catch (error) {
		console.error('💥 Unhandled error:', error);
		return json(
			{
				success: false,
				error: error.message,
				errorType: error.name,
			},
			{ status: 500 }
		);
	} finally {
		// Disconnect from database
		if (isConnected) {
			await prisma.$disconnect();
			isConnected = false;
		}
	}
}
