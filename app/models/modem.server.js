import { prisma } from '../db.server';

export async function upsertModemGPS({ modemId, provider, latitude, longitude, timestamp }) {
	return prisma.modemGPS.upsert({
		where: {
			modemId_provider: {
				modemId,
				provider,
			},
		},
		update: {
			latitude,
			longitude,
			timestamp,
		},
		create: {
			modemId,
			provider,
			latitude,
			longitude,
			timestamp,
		},
	});
}

export async function getLatestModemGPS(modemId, provider) {
	return prisma.modemGPS.findUnique({
		where: {
			modemId_provider: {
				modemId,
				provider,
			},
		},
	});
}
