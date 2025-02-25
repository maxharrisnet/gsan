import { getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';

export async function loader({ params }) {
	const { provider, modemId } = params;
	const accessToken = await getCompassAccessToken();

	try {
		const gpsData = await fetchGPS(provider, [modemId], accessToken);

		return (
			gpsData,
			{
				headers: {
					'Cache-Control': 'max-age=300, stale-while-revalidate=3600',
				},
			}
		);
	} catch (error) {
		return { error: 'Failed to load GPS data' }, { status: 500 };
	}
}
