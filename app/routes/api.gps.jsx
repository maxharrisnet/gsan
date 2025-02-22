import axios from 'axios';

const GPS_STORAGE_KEY = 'shared_gps_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

// Helper to check if we're in browser environment
const isBrowser = typeof window !== 'undefined';

// Helper to get shared GPS data
const getSharedGPSData = (modemId) => {
	if (!isBrowser) return null;

	try {
		const cached = window.localStorage.getItem(GPS_STORAGE_KEY);
		if (!cached) return null;

		const { timestamp, data } = JSON.parse(cached);
		if (Date.now() - timestamp < CACHE_DURATION) {
			return data[modemId];
		}
		window.localStorage.removeItem(GPS_STORAGE_KEY);
	} catch (error) {
		console.error('🚨 Shared GPS read error:', error);
	}
	return null;
};

// Update the storage helper
const setSharedGPSData = (data) => {
	if (!isBrowser) return;

	try {
		window.localStorage.setItem(
			GPS_STORAGE_KEY,
			JSON.stringify({
				timestamp: Date.now(),
				data,
			})
		);
	} catch (error) {
		console.error('🚨 Shared GPS write error:', error);
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
	const cacheKey = `${GPS_STORAGE_KEY}-${provider}-${ids.join(',')}`;

	// Check cache first
	const cachedData = getSharedGPSData(cacheKey);
	if (cachedData) return cachedData;

	try {
		console.log('🔍 Fetching GPS data from API');
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
			setSharedGPSData(latestGPSData);
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
			if (getSharedGPSData(cacheKey)) {
				console.log('📦 Returning cached data while rate limited');
				return getSharedGPSData(cacheKey);
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
