import { redirect } from '@remix-run/node';
import { getSession, commitSession } from '../session.server';
import crypto from 'crypto';

// Validate HMAC signature from query parameters
function validateHmac(queryParams, hmac) {
	const secret = process.env.SHOPIFY_API_SECRET;
	console.log('🗝️ API Secret:', secret);

	const sortedParams = Object.keys(queryParams)
		.filter((key) => key !== 'hmac') // Exclude 'hmac'
		.sort()
		.map((key) => `${key}=${decodeURIComponent(queryParams[key])}`)
		.join('&');

	const calculatedHmac = crypto.createHmac('sha256', secret).update(sortedParams).digest('hex');
	console.log('👾 Calculated HMAC:', calculatedHmac);

	return calculatedHmac === hmac;
}

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const { shop, code, hmac } = queryParams;

	if (!shop) {
		throw new Response('Missing shop parameter', { status: 400 });
	}

	// Validate HMAC
	if (!hmac || !validateHmac(queryParams, hmac)) {
		return new Response('Invalid HMAC', { status: 403 });
	}

	// Redirect to Shopify OAuth if no code is provided
	if (!code) {
		const redirectUri = process.env.SHOPIFY_REDIRECT_URI || `${url.origin}/auth`;
		const apiKey = process.env.SHOPIFY_API_KEY;
		const scopes = process.env.SCOPES;

		console.log('🔶 API Key:', apiKey);
		console.log('Scopes:', scopes);
		console.log('Redirect URI:', redirectUri);

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

		// Store the access token in the session
		const session = await getSession(request.headers.get('Cookie'));
		session.set(`accessToken:${shop}`, accessToken);

		// Redirect to the dashboard
		return redirect(`/dashboard?shop=${shop}`, {
			headers: { 'Set-Cookie': await commitSession(session) },
		});
	} catch (error) {
		console.error('🔴 Error during OAuth:', error);
		return redirect('/error?message=Authentication failed');
	}
};
