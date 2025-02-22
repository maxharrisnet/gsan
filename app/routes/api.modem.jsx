import { json } from '@remix-run/node';
import axios from 'axios';
import { getCompassAccessToken } from '../compass.server';
import fetchGPS from './api.gps';

export const loader = async ({ params }) => {
	const { provider, modemId } = params;

	if (!provider || !modemId) {
		return json({ error: 'Missing provider or modemId 🚫' }, { status: 400 });
	}

	try {
		const accessToken = await getCompassAccessToken();
		const modemDetailsURL = `https://api-compass.speedcast.com/v2.0/${encodeURIComponent(provider.toLowerCase())}/${modemId}`;

		const modemResponse = await axios.get(modemDetailsURL, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		const modem = modemResponse.data;
		console.log('💰 Modem response:', modem);

		const latencyData = modem.data.latency.data || [];
		const throughputData = modem.data.throughput.data || [];
		const signalQualityData = modem.data.signal.data || [];
		const obstructionData = modem.data.obstruction.data || [];
		const usageData = modem.usage || [];
		const uptimeData = modem.data.uptime.data || [];

		const mapsAPIKey = process.env.GOOGLE_MAPS_API_KEY;
		const gpsResponse = await fetchGPS(provider, [modemId], accessToken);
		const gpsData = gpsResponse[modemId] || {};

		const modemDetails = {
			modem,
			mapsAPIKey,
			gpsData,
			latencyData,
			throughputData,
			signalQualityData,
			obstructionData,
			usageData,
			uptimeData,
		};

		if (!modemDetails) {
			return json({ error: 'No data available for modem 🦤' }, { status: 404 });
		}

		return json(modemDetails);
	} catch (error) {
		console.error('🔴 Error fetching modem details:', error);
		return json(
			{
				error: 'Failed to fetch modem details 🦧',
				message: error.message,
			},
			{
				status: error.response?.status || 500,
			}
		);
	}
};
