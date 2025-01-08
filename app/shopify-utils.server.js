// app/shopify-utils.server.js
import { sessionStorage } from './session.server';

const API_VERSION = '2024-01';
const SHOPIFY_API_URL = (shop) => `https://${shop}/admin/api/${API_VERSION}/graphql.json`;

export async function authenticateShopify(shop, code) {
	console.log('🔑 Authenticating Shopify app for shop:', shop);

	try {
		const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: process.env.SHOPIFY_API_KEY,
				client_secret: process.env.SHOPIFY_API_SECRET,
				code,
			}),
		});

		if (!response.ok) {
			console.error('❌ Error fetching access token:', await response.text());
			throw new Error('Failed to retrieve access token');
		}

		const result = await response.json();
		console.log('🔑 Successfully retrieved access token for shop:', shop);
		return result.access_token;
	} catch (error) {
		console.error('❌ Authentication error:', error);
		throw error;
	}
}

export async function graphqlRequest(shop, query, variables = {}) {
	console.log('📡 Sending GraphQL request for shop:', shop);

	try {
		const session = await sessionStorage.getSession();
		const accessToken = session.get(`accessToken:${shop}`);

		if (!accessToken) {
			throw new Error(`Access token not found for shop ${shop}`);
		}

		const response = await fetch(SHOPIFY_API_URL(shop), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': accessToken,
			},
			body: JSON.stringify({ query, variables }),
		});

		const result = await response.json();

		if (!response.ok || result.errors) {
			console.error('❌ GraphQL error:', result.errors || response.statusText);
			throw new Error('Failed to complete GraphQL request');
		}

		console.log('✅ GraphQL request successful for shop:', shop);
		return result.data;
	} catch (error) {
		console.error('❌ GraphQL request error:', error);
		throw error;
	}
}
