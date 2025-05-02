import { json } from '@remix-run/node';
import { prisma } from '../../db.server';

export async function loader({ request }) {
	try {
		const url = new URL(request.url);
		const modemIds = url.searchParams.get('modemIds')?.split(',') || [];

		if (!modemIds.length) {
			return json({ error: 'No modem IDs provided' }, { status: 400 });
		}

		const gpsData = await prisma.$transaction(async (tx) => {
			return await tx.modemGPS.findMany({
				where: {
					modemId: {
						in: modemIds
					}
				},
				orderBy: {
					timestamp: 'desc'
				}
			});
		}, {
			timeout: 20000 // 20 seconds timeout
		});

		// Transform data into the expected format
		const formattedData = gpsData.reduce((acc, entry) => {
			if (!acc[entry.modemId]) {
				acc[entry.modemId] = [];
			}
			acc[entry.modemId].push({
				lat: entry.latitude.toString(),
				lon: entry.longitude.toString(),
				timestamp: Math.floor(entry.timestamp.getTime() / 1000)
			});
			return acc;
		}, {});

		return json({ data: formattedData });

	} catch (error) {
		console.error('🚨 Error querying GPS data:', error);
		return json({ error: 'Failed to fetch GPS data' }, { status: 500 });
	}
}
