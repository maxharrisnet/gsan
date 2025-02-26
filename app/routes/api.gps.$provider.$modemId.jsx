import { json } from '@remix-run/node';
import { getCompassAccessToken } from '../compass.server';
import { getGPSURL } from '../api/api.gps';
import { upsertModemGPS, getLatestModemGPS } from '../models/modem.server';
import axios from 'axios';
import { prisma } from '../db.server';

// Add exponential backoff retry logic
async function fetchWithRetry(url, data, headers, maxRetries = 3) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			const response = await axios.post(url, data, { headers });
			return response;
		} catch (error) {
			if (error.response?.status === 429) {
				const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
				if (i < maxRetries - 1) {
					console.log(`🕐 Rate limited, waiting ${retryAfter}s before retry ${i + 1}/${maxRetries}`);
					await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
					continue;
				}
			}
			throw error;
		}
	}
}

// Add PrismaClient with reconnection logic
async function withRetry(fn, maxRetries = 3) {
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			if (error.message.includes('prepared statement') && i < maxRetries - 1) {
				console.log('🔄 Database connection issue, attempting reconnect...');
				await prisma.$disconnect();
				await prisma.$connect();
				continue;
			}
			throw error;
		}
	}
}

// Modify the database calls to use retry logic
async function getLatestModemGPSWithRetry(modemId, provider) {
	return withRetry(() => getLatestModemGPS(modemId, provider));
}

async function upsertModemGPSWithRetry(data) {
	return withRetry(() => upsertModemGPS(data));
}

export async function loader({ params }) {
	try {
		const { provider, modemId } = params;

		// Validate input parameters
		if (!provider || !modemId) {
			console.warn('🚫 Missing required parameters:', { provider, modemId });
			return json({ error: 'Missing required parameters' }, { status: 400 });
		}

		const modemIds = modemId.split(',').filter(Boolean);
		console.log('🌐 Processing Modem IDs:', modemIds);

		// Handle empty or invalid modem IDs
		if (!modemIds.length) {
			return json({ error: 'No valid modem IDs provided' }, { status: 400 });
		}

		const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
		const cachedData = {};
		const modemIdsToFetch = [];
		const now = Date.now();

		// First, try to get all GPS data from database
		for (const id of modemIds) {
			try {
				const cached = await getLatestModemGPSWithRetry(id, provider);
				if (cached && new Date(cached.timestamp) > new Date(now - CACHE_DURATION)) {
					console.log('📦 Using cached GPS data for:', id);
					cachedData[id] = [
						{
							timestamp: cached.timestamp,
							lat: cached.latitude.toString(),
							lon: cached.longitude.toString(),
						},
					];
				} else {
					modemIdsToFetch.push(id);
				}
			} catch (error) {
				console.error(`🚨 Database error for modem ${id}:`, error);
				modemIdsToFetch.push(id);
			}
		}

		// Return cached data if we have everything
		if (modemIdsToFetch.length === 0) {
			return json(cachedData);
		}

		// Fetch fresh data for missing/expired entries
		try {
			const accessToken = await getCompassAccessToken();
			const url = getGPSURL(provider);

			if (!url) {
				throw new Error('Invalid provider URL');
			}

			const response = await fetchWithRetry(
				url,
				{ ids: modemIdsToFetch },
				{
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				}
			);

			// Process new GPS data
			for (const [modemId, entries] of Object.entries(response.data)) {
				if (!Array.isArray(entries) || !entries.length) continue;

				const validEntries = entries.filter((entry) => entry && entry.timestamp && typeof entry.lat === 'string' && typeof entry.lon === 'string');

				if (validEntries.length) {
					const latestEntry = validEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

					// Save to database
					await upsertModemGPSWithRetry({
						modemId,
						provider,
						latitude: parseFloat(latestEntry.lat),
						longitude: parseFloat(latestEntry.lon),
						timestamp: new Date(latestEntry.timestamp * 1000),
					});

					cachedData[modemId] = [
						{
							timestamp: latestEntry.timestamp,
							lat: latestEntry.lat,
							lon: latestEntry.lon,
						},
					];
				}
			}

			return json(cachedData);
		} catch (error) {
			console.error('🚨 API Error:', error);

			// On error, try to return any cached data we have
			if (Object.keys(cachedData).length > 0) {
				console.log('📦 Returning cached data due to API error');
				return json(cachedData);
			}

			// Handle rate limiting specifically
			if (error.response?.status === 429) {
				return json(
					{ error: 'Rate limit exceeded' },
					{
						status: 429,
						headers: {
							'Retry-After': error.response.headers['retry-after'] || '60',
						},
					}
				);
			}

			return json({ error: 'Failed to fetch GPS data' }, { status: error.response?.status || 500 });
		}
	} catch (error) {
		console.error('🚨 Unexpected error:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
