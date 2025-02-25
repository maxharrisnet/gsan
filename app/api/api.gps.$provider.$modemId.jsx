import { json } from '@remix-run/node';
import { getCompassAccessToken } from '../compass.server';
import axios from 'axios';

export async function loader({ params }) {
	try {
		const accessToken = await getCompassAccessToken();
		const { provider, modemId } = params;

		const gpsUrl = `https://api-compass.speedcast.com/v2.0/starlinkgps/`;
		const response = await axios.get(gpsUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		return json({ gpsData: response.data });
	} catch (error) {
		console.error('🌍 Error fetching GPS data:', error);
		return json({ gpsData: [] }, { status: 500 });
	}
}
