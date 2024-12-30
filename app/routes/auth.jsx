import { redirect } from '@remix-run/node';
import crypto from 'crypto';
import { createAdminSession } from '../session.server';

// Validate HMAC signature from query parameters
function validateHmac(queryParams, hmac) {
	console.log('🤓 Query Params: ', queryParams);
	const secret = process.env.SHOPIFY_API_SECRET;
	const sortedParams = Object.keys(queryParams)
		.filter((key) => key !== 'hmac') // Exclude 'hmac'
		.sort()
		.map((key) => `${key}=${decodeURIComponent(queryParams[key])}`)
		.join('&');

	const calculatedHmac = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
	return calculatedHmac === hmac;
}

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const { shop, code, hmac } = queryParams;
	console.log('🍔 HMAC: ', hmac);

	if (!shop) {
		throw new Response('Missing shop parameter', { status: 400 });
	}

	// Validate HMAC
	if (!hmac || !validateHmac(queryParams, hmac)) {
		return new Response('🍅 Invalid HMAC', { status: 403 });
	}

	// Redirect to Shopify OAuth if no code is provided
	if (!code) {
		console.log('🥕 ENV Redirect URI: ', process.env.SHOPIFY_REDIRECT_URI);
		// const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${url.origin}/auth`;
		const redirectUri = 'https://713b-2604-3d08-4e82-a500-91cc-1bde-64a8-1527.ngrok-free.app/auth';
		const apiKey = process.env.SHOPIFY_API_KEY;
		const scopes = process.env.SCOPES;
		const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;

		return redirect(authUrl);
	}

	// Exchange the authorization code for an access token
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
			console.error('🐶 Failed to fetch access token:', await tokenResponse.text());
			throw new Response('Failed to fetch access token', { status: 500 });
		}

		const { access_token: accessToken } = await tokenResponse.json();
		console.log('💠 Access Token:', accessToken);

		return await createAdminSession({ accessToken, shop }, `/gsan/login?shop=${shop}`);
	} catch (error) {
		console.error('🔴 Error during OAuth:', error);
		return redirect('/error?message=Authentication failed');
	}
};
