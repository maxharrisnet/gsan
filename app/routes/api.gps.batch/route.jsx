import { json } from '@remix-run/node';
import { getCompassAccessToken, fetchServicesAndModemData } from '../../compass.server';
import { getGPSURL } from '../../api/api.gps';
import { upsertModemGPS } from '../../models/modem.server';
import axios from 'axios';

export async function loader({ request }) {
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
		// Get services data with proper error handling
		const servicesData = await fetchServicesAndModemData()
			.then(({ services }) => {
				if (!services || !Array.isArray(services)) {
					throw new Error('Invalid services data received');
				}
				return services;
			})
			.catch((error) => {
				console.error('🔴 Error fetching services:', error);
				throw error;
			});

		console.log('📡 Services received:', servicesData.length);

		// Process modems with type validation and enhanced logging
		const modems = servicesData.flatMap((service) => {
			if (!service?.modems || !Array.isArray(service.modems)) {
				console.warn('⚠️ Invalid modems array for service:', service.name);
				return [];
			}

			return service.modems
				.filter((modem) => {
					if (!modem?.id || !modem?.type) {
						console.warn('⚠️ Modem missing ID or type:', modem);
						return false;
					}
					return true;
				})
				.map((modem) => ({
					id: modem.id,
					provider: modem.type.toLowerCase(),
				}));
		});

		console.log('🔢 Total valid modems found:', modems.length);

		if (!modems.length) {
			console.warn('⚠️ No valid modems found after processing services');
			return json(
				{
					success: false,
					error: 'No valid modems found',
				},
				{ status: 404 }
			);
		}

		// Group modems by provider
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
		console.error('🚨 Batch GPS update failed:', error);
		return json(
			{
				success: false,
				error: error.message,
			},
			{ status: 500 }
		);
	}
}
