import { json } from '@remix-run/node';
import { getCompassAccessToken } from '../compass.server';
import axios from 'axios';
import { fetchGPS } from './api.gps'; // Import the cached GPS fetcher

export async function loader({ params }) {
	try {
		const { provider, modemId } = params;
		const accessToken = await getCompassAccessToken();

		// Get modem details
		const modemUrl = `https://api-compass.speedcast.com/v2.0/${provider.toLowerCase()}/${modemId}`;
		const modemResponse = await axios.get(modemUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		// Safety check for response data
		if (!modemResponse?.data) {
			console.error('🚨 No modem data received');
			throw new Error('No modem data available');
		}

		// Use cached GPS fetcher instead of direct API call
		const gpsData = await fetchGPS(provider, [modemId], accessToken);

		return json({
			modem: modemResponse.data,
			gpsData: gpsData[modemId] || [],
			mapsAPIKey: process.env.GOOGLE_MAPS_API_KEY,
			latencyData: modemResponse.data?.data?.latency?.data || [],
			throughputData: modemResponse.data?.data?.throughput?.data || [],
			signalQualityData: modemResponse.data?.data?.signal_quality?.data || [],
			obstructionData: modemResponse.data?.data?.obstruction?.data || [],
			usageData: modemResponse.data?.data?.usage?.data || [],
			uptimeData: modemResponse.data?.data?.uptime?.data || [],
		});
	} catch (error) {
		console.error('🚨 Error fetching modem details:', error);
		throw new Response('Error loading modem data', { status: 500 });
	}
}
