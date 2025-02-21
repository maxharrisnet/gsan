import { json } from '@remix-run/node';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

let prismaClient;

// This is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
if (process.env.NODE_ENV === 'production') {
	prismaClient = new PrismaClient();
} else {
	if (!global.__db) {
		global.__db = new PrismaClient();
	}
	prismaClient = global.__db;
}

export { prismaClient };

// Add cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 30;

// Track API calls in memory (this doesn't need to be persisted)
const apiCalls = {
	timestamp: Date.now(),
	count: 0,
};

async function getCachedData(cacheKey) {
	try {
		const cacheEntry = await prismaClient.cache.findUnique({
			where: { key: cacheKey },
		});

		if (cacheEntry) {
			return JSON.parse(cacheEntry.value);
		}
	} catch (error) {
		console.error('🔴 Cache retrieval error:', error);
	}
	return null;
}

async function setCachedData(cacheKey, data) {
	try {
		await prismaClient.cache.upsert({
			where: { key: cacheKey },
			update: {
				value: JSON.stringify({
					timestamp: Date.now(),
					data: data,
				}),
				updatedAt: new Date(),
			},
			create: {
				key: cacheKey,
				value: JSON.stringify({
					timestamp: Date.now(),
					data: data,
				}),
			},
		});
	} catch (error) {
		console.error('🔴 Cache storage error:', error);
	}
}

// Cleanup old cache entries (can be run periodically)
async function cleanupOldCache() {
	const expiryDate = new Date(Date.now() - CACHE_DURATION);
	await prismaClient.cache.deleteMany({
		where: {
			updatedAt: {
				lt: expiryDate,
			},
		},
	});
}

export function getGPSURL(provider) {
	const baseUrl = 'https://api-compass.speedcast.com/v2.0';
	const url = encodeURI(provider.toLowerCase()) === 'starlink' ? `${baseUrl}/starlinkgps` : `${baseUrl}/${provider.toLowerCase()}gps`;

	return url;
}

export const fetchGPS = async (provider, ids, accessToken) => {
	const url = getGPSURL(provider);
	const cacheKey = `gps:${provider}-${ids.join(',')}`;

	try {
		// First check cache
		const cachedData = await getCachedData(cacheKey);
		if (cachedData?.timestamp && Date.now() - cachedData.timestamp < CACHE_DURATION) {
			console.log('💾 Using cached GPS data');
			return cachedData.data;
		}

		// Check rate limits
		const now = Date.now();
		if (now - apiCalls.timestamp > RATE_LIMIT_WINDOW) {
			apiCalls.timestamp = now;
			apiCalls.count = 0;
		}

		if (apiCalls.count >= MAX_REQUESTS) {
			console.log('🚫 Rate limit hit - using cached data if available');
			if (cachedData?.data) {
				return cachedData.data;
			}
			console.log('⚠️ No cached data available');
			return {};
		}

		// Make API request
		apiCalls.count++;

		const response = await axios.post(
			url,
			{ ids },
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		// Cache successful response
		if (response.data) {
			await setCachedData(cacheKey, response.data);
			console.log('💾 Cached new GPS data');
		}

		return response.data;
	} catch (error) {
		console.error('🚨 GPS fetch error:', error.message);

		// On error, try to return cached data
		const cachedData = await getCachedData(cacheKey);
		if (cachedData?.data) {
			console.log('🔄 Using cached data after error');
			return cachedData.data;
		}

		return {};
	}
};

export default fetchGPS;
