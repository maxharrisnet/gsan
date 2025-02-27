import { json } from '@remix-run/node';
import { getCompassAccessToken, fetchServicesAndModemData } from '../../compass.server';
import { getGPSURL } from '../../api/api.gps';
import { upsertModemGPS } from '../../models/modem.server';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
console.log('🔄 Route module loaded');

const prisma = new PrismaClient();

export async function loader({ request }) {
	try {
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

		// Test database connection
		try {
			await prisma.$connect();
			console.log('📡 Database connected successfully');
		} catch (dbError) {
			console.error('💥 Database connection error:', dbError);
			return json({ success: false, error: 'Database connection failed' }, { status: 500 });
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
			console.log('🔑 Access token retrieved for provider:', provider);
			const url = getGPSURL(provider);

			if (!url) {
				console.warn(`⚠️ No GPS URL for provider: ${provider}`);
				continue;
			}

			try {
				const response = await axios.post(
					url,
					{ ids: modemIds },
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				);

				// Add rate limit handling
				if (response.status === 429) {
					console.warn('🕒 Rate limit reached for provider:', provider);
					results.push({
						provider,
						status: 'rate_limited',
						message: 'Rate limit reached, will retry in next scheduled run',
					});
					continue;
				}

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
		// Log the full error details
		console.error('💥 Unhandled error in GPS batch update:', {
			message: error.message,
			stack: error.stack,
			name: error.name,
			data: error.response?.data,
		});

		return json(
			{
				success: false,
				error: error.message,
				errorType: error.name,
			},
			{ status: 500 }
		);
	}
}
