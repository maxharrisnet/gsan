import axios from 'axios';
import { getCompassAccessToken } from '../compass.server';

export const loader = async () => {
	const accessToken = await getCompassAccessToken();
	const companyId = process.env.COMPASS_COMPANY_ID;
	const servicesUrl = `https://api-compass.speedcast.com/v2.0/company/${companyId}`;
	const modemDetailsUrl = (provider, modemId) => `https://api-compass.speedcast.com/v2.0/${encodeURI(provider.toLowerCase())}/${modemId}`;

	try {
		const servicesResponse = await axios.get(servicesUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		const allServices = await servicesResponse.data;

		const servicesWithModemDetails = await Promise.all(
			allServices.map(async (service) => {
				if (service.modems && service.modems.length > 0) {
					const modemsWithDetails = await Promise.all(
						service.modems.map(async (modem) => {
							const url = modemDetailsUrl(modem.type, modem.id);
							const detailsResponse = await axios.get(url, {
								headers: { Authorization: `Bearer ${accessToken}` },
							});
							return { ...modem, details: detailsResponse.data };
						})
					);
					return { ...service, modems: modemsWithDetails };
				}
				return service;
			})
		);

		return { services: servicesWithModemDetails };
	} catch (error) {
		console.error('Error fetching services data:', error);
		throw new Response('Internal Server Error 🤔', { status: 500 });
	}
};
