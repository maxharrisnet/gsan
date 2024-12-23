import { createAdminSession } from '../session.server';

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const shop = url.searchParams.get('shop');
	const code = url.searchParams.get('code');

	if (!shop || !code) {
		throw new Response('Missing required parameters', { status: 400 });
	}

	try {
		const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: process.env.SHOPIFY_API_KEY,
				client_secret: process.env.SHOPIFY_API_SECRET,
				code,
			}),
		});

		if (!tokenResponse.ok) {
			throw new Error('Failed to fetch access token');
		}

		const { access_token: accessToken } = await tokenResponse.json();

		// Save the admin session
		return await createAdminSession({ accessToken }, '/gsan/login');
	} catch (error) {
		console.error('Error during OAuth:', error);
		return new Response('Authentication failed', { status: 500 });
	}
};
