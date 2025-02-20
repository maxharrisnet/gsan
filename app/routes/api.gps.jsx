import { json } from '@remix-run/node';
import axios from 'axios';

const cache = new Map();

// Add cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 30; // Maximum requests per minute

// Track API calls
const apiCalls = {
	timestamp: Date.now(),
	count: 0,
};

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
	const cacheKey = `${provider}-${ids.join(',')}`;

	// Check if we're within rate limits
	const now = Date.now();
	if (now - apiCalls.timestamp > RATE_LIMIT_WINDOW) {
		// Reset counter for new window
		apiCalls.timestamp = now;
		apiCalls.count = 0;
	} else if (apiCalls.count >= MAX_REQUESTS) {
		console.log('🛑 Rate limit prevention - using cached data if available');
		// Return cached data if available, even if expired
		if (cache.has(cacheKey)) {
			return cache.get(cacheKey);
		}
		throw new Error('Rate limit reached and no cached data available');
	}

	// Check if valid cached data exists
	if (cache.has(cacheKey)) {
		const cachedData = cache.get(cacheKey);
		if (cachedData.timestamp && now - cachedData.timestamp < CACHE_DURATION) {
			console.log('💰 Returning cached GPS data');
			return cachedData.data;
		}
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
			// Store the response data in the cache with timestamp
			cache.set(cacheKey, {
				timestamp: now,
				data: response.data,
			});
			console.log('💾 Caching GPS data');
			return response.data;
		} else {
			return { error: `HTTP code ${response.status}` };
		}
	} catch (error) {
		if (error.response && error.response.status === 429) {
			console.error('🏇 Error 429: Rate limit exceeded.');
			// Return cached data if available, even if expired
			if (cache.has(cacheKey)) {
				console.log('🔄 Returning expired cached data due to rate limit');
				return cache.get(cacheKey).data;
			}
			return { error: 'Rate limit exceeded' };
		} else {
			console.error('Network Error:', error.message);
			return { error: 'Network Error' };
		}
	}
};

export default fetchGPS;
