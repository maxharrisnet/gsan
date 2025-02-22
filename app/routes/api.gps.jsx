import { json } from '@remix-run/node';
import axios from 'axios';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const GPS_CACHE_KEY = 'gps_data_cache';

// Replace the Map cache with localStorage
const getCache = (cacheKey) => {
	try {
		const cached = localStorage.getItem(cacheKey);
		if (!cached) return null;

		const { timestamp, data } = JSON.parse(cached);
		if (Date.now() - timestamp < CACHE_DURATION) {
			console.log('💰 Using cached GPS data');
			return data;
		}
		localStorage.removeItem(cacheKey);
	} catch (error) {
		console.error('🚨 Cache read error:', error);
	}
	return null;
};

const setCache = (cacheKey, data) => {
	try {
		localStorage.setItem(
			cacheKey,
			JSON.stringify({
				timestamp: Date.now(),
				data,
			})
		);
	} catch (error) {
		console.error('🚨 Cache write error:', error);
	}
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
	const cacheKey = `${GPS_CACHE_KEY}-${provider}-${ids.join(',')}`;

	// Check cache first
	const cachedData = getCache(cacheKey);
	if (cachedData) return cachedData;

	try {
		const response = await axios.post(url, postData, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		});

		if (response.status === 200) {
			const latestGPSData = Object.entries(response.data).reduce((acc, [modemId, entries]) => {
				if (!Array.isArray(entries) || entries.length === 0) return acc;
				const sortedEntries = entries.filter((entry) => entry && entry.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
				if (sortedEntries.length > 0) {
					acc[modemId] = [sortedEntries[0]];
				}
				return acc;
			}, {});

			// Update cache storage
			setCache(cacheKey, latestGPSData);
			return latestGPSData;
		}

		return { error: `HTTP code ${response.status}` };
	} catch (error) {
		if (error.response?.status === 429) {
			console.log('⏳ Rate limited, checking headers...');

			// Get retry time from headers
			const retryAfter = error.response.headers['retry-after'];
			const retryDate = new Date(retryAfter);
			const waitTime = retryDate.getTime() - Date.now();

			console.log(`🕒 Need to wait until: ${retryDate.toISOString()}`);

			// Return cached data if available
			if (getCache(cacheKey)) {
				console.log('📦 Returning cached data while rate limited');
				return getCache(cacheKey);
			}

			// If no cache, wait and retry once
			if (waitTime > 0 && waitTime < 10000) {
				// Only wait if less than 10 seconds
				console.log(`⌛ Waiting ${waitTime}ms before retry...`);
				await new Promise((resolve) => setTimeout(resolve, waitTime));
				return fetchGPS(provider, ids, accessToken);
			}

			return { error: 'Rate limit exceeded' };
		}

		console.error('🔴 Network Error:', error.message);
		return { error: 'Network Error' };
	}
};

export default fetchGPS;
