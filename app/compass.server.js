import axios from 'axios';

const username = process.env.COMPASS_API_USERNAME;
const password = process.env.COMPASS_API_PASSWORD;
const apiEndpoint = 'https://api-compass.speedcast.com/v2.0';

export async function getCompassAccessToken() {
	try {
		const response = await axios.post(`${apiEndpoint}/auth`, {
			username,
			password,
		});

		const accessToken = response.data.access_token;
		return accessToken;
	} catch (error) {
		console.error('Error retrieving access token:', error);
		throw new Error('Error retrieving access token');
	}
}

export const fetchServicesAndModemData = async () => {
	try {
		const accessToken = await getCompassAccessToken();
		const companyId = process.env.COMPASS_COMPANY_ID;

		const servicesUrl = `https://api-compass.speedcast.com/v2.0/company/${companyId}`;
		const modemDetailsUrl = (provider, modemId) => `https://api-compass.speedcast.com/v2.0/${encodeURI(provider.toLowerCase())}/${modemId}`;
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
		console.error('Error fetching performance data:', error);
		throw new Response('Internal Server Error', { status: 500 });
	}
};
