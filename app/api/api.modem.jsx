import { json } from '@remix-run/node';
import axios from 'axios';
import { getCompassAccessToken } from '../compass.server';
import fetchGPS from './api.gps';
import { getCachedData } from '../utils/cache.server';

const determineModemStatus = (modemData) => {
	const hasRecentData = (data) => {
		if (!Array.isArray(data) || !data.length) return false;
		const lastTimestamp = data[data.length - 1]?.[0];
		if (!lastTimestamp) return false;
		// Check if last data point is within the last hour
		return Date.now() / 1000 - lastTimestamp < 3600;
	};

	const latencyData = modemData?.data?.latency?.data || [];
	const throughputData = modemData?.data?.throughput?.data || [];
	const signalData = modemData?.data?.signal?.data || [];

	// Modem is considered online if it has recent data in any of these metrics
	return hasRecentData(latencyData) || hasRecentData(throughputData) || hasRecentData(signalData) ? 'online' : 'offline';
};

export const loader = async ({ params }) => {
	const cacheKey = `modem-${params.provider}-${params.modemId}`;
	const { provider, modemId } = params;

	if (!provider || !modemId) {
		return json({ error: 'Missing provider or modemId 🚫' }, { status: 400 });
	}

	try {
		const cachedData = await getCachedData(cacheKey, async () => {
			const accessToken = await getCompassAccessToken();
			const modemDetailsURL = `https://api-compass.speedcast.com/v2.0/${encodeURIComponent(provider.toLowerCase())}/${modemId}`;

			try {
				const modemResponse = await axios.get(modemDetailsURL, {
					headers: { Authorization: `Bearer ${accessToken}` },
				});

				const modem = modemResponse.data;

				// Handle empty or invalid modem data
				if (!modem || !modem.data) {
					return {
						status: 'offline',
						error: 'No modem data available',
						modem: {
							data: {
								latency: { data: [] },
								throughput: { data: [] },
								signal: { data: [] },
								obstruction: { data: [] },
								uptime: { data: [] },
							},
							usage: [],
						},
						latencyData: [],
						throughputData: [],
						signalQualityData: [],
						obstructionData: [],
						usageData: [],
						uptimeData: [],
						gpsData: {},
					};
				}

			const currentStatus = determineModemStatus(modem);
			modem.status = currentStatus;

			const latencyData = modem.data.latency.data || [];
			const throughputData = modem.data.throughput.data || [];
			const signalQualityData = modem.data.signal.data || [];
			const obstructionData = modem.data.obstruction.data || [];
			const usageData = modem.usage || [];
			const uptimeData = modem.data.uptime.data || [];
			const mapsAPIKey = process.env.GOOGLE_MAPS_API_KEY;

			const modemDetails = {
				modem,
				mapsAPIKey,
				latencyData,
				throughputData,
				signalQualityData,
				obstructionData,
				usageData,
				uptimeData,
				status: currentStatus,
			};

			if (!modemDetails) {
				return json({ error: 'No data available for modem 🦤' }, { status: 404 });
			}

			return modemDetails;
		});

		return json(cachedData);
	} catch (error) {
		console.error('🔴 Error fetching modem details:', error);

		// Return a structured error response instead of throwing
		return json(
			{
				status: 'error',
				error: error.message,
				details: error.response?.data || 'Unknown error occurred',
				modem: null,
			},
			{
				status: error.response?.status || 500,
			}
		);
	}
};
