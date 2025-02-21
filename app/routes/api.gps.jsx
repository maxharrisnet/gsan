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
	switch (encodeURI(provider.toLowerCase())) {
		case 'starlink':
			return `${baseUrl}/starlinkgps`;
		case 'idirect':
			return `${baseUrl}/idirectgps`;
		case 'newtec':
			return `${baseUrl}/newtecgps`;
		case 'oneweb':
			return `${baseUrl}/oneweb`; // TODO: Test, fix with terminalId (see docs)
		default:
			return null;
	}
}

export const fetchGPS = async (provider, ids, accessToken) => {
	const url = getGPSURL(provider);
	const postData = { ids };
	const cacheKey = `gps:${provider}-${ids.join(',')}`;

	// Check rate limits
	const now = Date.now();
	if (now - apiCalls.timestamp > RATE_LIMIT_WINDOW) {
		apiCalls.timestamp = now;
		apiCalls.count = 0;
	} else if (apiCalls.count >= MAX_REQUESTS) {
		console.log('🛑 Rate limit prevention - using cached data if available');
		const cachedData = await getCachedData(cacheKey);
		if (cachedData) return cachedData.data;
		throw new Error('Rate limit reached and no cached data available');
	}

	// Check for fresh cached data
	const cachedData = await getCachedData(cacheKey);
	if (cachedData?.timestamp && now - cachedData.timestamp < CACHE_DURATION) {
		console.log('💰 Returning cached GPS data');
		return cachedData.data;
	}

	try {
		apiCalls.count++;
		const response = await axios.post(url, postData, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		});

		if (response.status === 200) {
			await setCachedData(cacheKey, response.data);
			console.log('💾 Caching GPS data');
			return response.data;
		}
		return { error: `HTTP code ${response.status}` };
	} catch (error) {
		if (error.response && error.response.status === 429) {
			console.error('🏇 Error 429: Rate limit exceeded.');
			// Return cached data if available, even if expired
			const cachedData = await getCachedData(cacheKey);
			if (cachedData) {
				console.log('🔄 Returning expired cached data due to rate limit');
				return cachedData.data;
			}
			return { error: 'Rate limit exceeded' };
		} else {
			console.error('Network Error:', error.message);
			return { error: 'Network Error' };
		}
	}
};

export default fetchGPS;
<div className=''></div>;
