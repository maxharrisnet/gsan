import axios from 'axios';

// API variables
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
	console.log('🌽 Fetching services and modem data...');
	try {
		const accessToken = await getCompassAccessToken();
		const companyId = process.env.COMPASS_COMPANY_ID;

		const servicesUrl = `https://api-compass.speedcast.com/v2.0/company/${companyId}`;
		const modemDetailsUrl = (provider, modemId) => `https://api-compass.speedcast.com/v2.0/${encodeURI(provider.toLowerCase())}/${modemId}`;
		const servicesResponse = await axios.get(servicesUrl, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		const allServices = await servicesResponse.data;
		console.log('🌽 All services fetched');
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

export async function fetchShopifyOrderData(modemId) {
	try {
		console.log('🛍️ Fetching Shopify order data for modem:', modemId);

		const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json`, {
			headers: {
				'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			throw new Error(`Shopify API error: ${response.status}`);
		}

		const orders = await response.json();
		console.log('🛍️ Shopify orders received:', orders);

		// Find orders for this modem
		const modemOrders = orders.filter((order) => order.line_items.some((item) => item.properties?.modem_id === modemId));

		// Get the latest order
		const latestOrder = modemOrders[0];

		return {
			total_orders: modemOrders.length,
			active_services: modemOrders.filter((o) => o.financial_status === 'paid').length,
			last_order_date: latestOrder?.created_at,
			order_status: latestOrder?.fulfillment_status || 'unfulfilled',
			next_billing_date: latestOrder?.next_billing_date,
			monthly_cost: latestOrder?.current_total_price,
			last_payment_amount: latestOrder?.total_price,
			last_payment_date: latestOrder?.processed_at,
			payment_status: latestOrder?.financial_status,
		};
	} catch (error) {
		console.error('🚨 Error fetching Shopify order data:', error);
		return {};
	}
}
