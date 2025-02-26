import { json } from '@remix-run/node';
import { getCompassAccessToken } from '../compass.server';
import { getGPSURL } from '../api/api.gps';
import { upsertModemGPS, getLatestModemGPS } from '../models/modem.server';
import axios from 'axios';

export async function loader({ params }) {
	try {
		const { provider, modemId } = params;

		// First check if we have recent data in the database
		const cachedData = await getLatestModemGPS(modemId, provider);
		if (cachedData) {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			if (cachedData.timestamp > fiveMinutesAgo) {
				console.log('📦 Using database cached GPS data');
				return json({ [modemId]: [cachedData] });
			}
		}

		const accessToken = await getCompassAccessToken();
		const url = getGPSURL(provider);
		if (!url) {
			return json({ error: 'Invalid provider' }, { status: 400 });
		}

		const response = await axios.post(
			url,
			{ ids: [modemId] },
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			}
		);

		if (response.status === 200) {
			const latestGPSData = Object.entries(response.data).reduce(async (acc, [modemId, entries]) => {
				if (!Array.isArray(entries) || entries.length === 0) return acc;

				const sortedEntries = entries.filter((entry) => entry && entry.timestamp).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

				if (sortedEntries.length > 0) {
					const latestEntry = sortedEntries[0];
					await upsertModemGPS({
						modemId,
						provider,
						latitude: latestEntry.latitude,
						longitude: latestEntry.longitude,
						timestamp: new Date(latestEntry.timestamp),
					});

					acc[modemId] = [latestEntry];
				}
				return acc;
			}, {});

			return json(latestGPSData);
		}

		throw new Error(`HTTP code ${response.status}`);
	} catch (error) {
		// If rate limited, return cached data if available
		if (error.response?.status === 429) {
			const cachedData = await getLatestModemGPS(params.modemId, params.provider);
			if (cachedData) {
				console.log('📦 Rate limited - using cached GPS data');
				return json({ [params.modemId]: [cachedData] });
			}

			return json(
				{ error: 'Rate limit exceeded' },
				{
					status: 429,
					headers: { 'Retry-After': error.response.headers['retry-after'] || '60' },
				}
			);
		}

		return json({ error: 'Failed to fetch GPS data' }, { status: 500 });
	}
}
