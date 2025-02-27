import { json } from '@remix-run/node';
import { getCompassAccessToken } from '../compass.server';
import { getGPSURL } from '../api/api.gps';
import { upsertModemGPS } from '../models/modem.server';
import { fetchServicesAndModemData } from '../compass.server';
import axios from 'axios';

export async function loader({ request }) {
	// Check for CRON_SECRET in Authorization header
	const authHeader = request.headers.get('Authorization');
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret) {
		console.error('🔴 CRON_SECRET environment variable is not set');
		return json({ error: 'Server configuration error' }, { status: 500 });
	}

	if (authHeader !== `Bearer ${cronSecret}`) {
		console.warn('🚫 Unauthorized cron job attempt');
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Get all modems from services
		const { services } = await fetchServicesAndModemData();
		const modems = services.flatMap((service) =>
			service.modems.map((modem) => ({
				id: modem.id,
				provider: service.type.toLowerCase(),
			}))
		);

		console.log('🛰️ Fetching GPS data for modems:', modems.length);

		// Group modems by provider to batch requests
		const modemsByProvider = modems.reduce((acc, modem) => {
			acc[modem.provider] = acc[modem.provider] || [];
			acc[modem.provider].push(modem.id);
			return acc;
		}, {});

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

				// Process and save GPS data
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
		console.error('🚨 Batch GPS update failed:', error);
		return json({ success: false, error: error.message }, { status: 500 });
	}
}
