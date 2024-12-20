import { redirect } from '@remix-run/node';
import { getSession, commitSession } from '../session.server';
import crypto from 'crypto';

function validateHmac(queryParams, hmac) {
	const secret = process.env.SHOPIFY_API_SECRET;
	console.log('🗝️ API Secret?: ', secret);
	const sortedParams = Object.keys(queryParams)
		.filter((key) => key !== 'hmac')
		.sort()
		.map((key) => `${key}=${decodeURIComponent(queryParams[key])}`)
		.join('&');

	const calculatedHmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET).update(sortedParams).digest('hex');
	console.log('👾 Calculated:', calculatedHmac);
	return calculatedHmac === hmac;
}

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const { shop, code, hmac } = queryParams;

	if (!shop) {
		throw new Response('Missing shop parameter', { status: 400 });
	}

	if (!hmac || !validateHmac(queryParams, hmac)) {
		return new Response('Invalid HMAC', { status: 403 });
	}

	if (!code) {
		// const redirectUri = process.env.SHOPIFY_REDIRECT_URI;
		const redirectUri = 'https://18ee-2604-3d08-4e82-a500-5832-3853-c5b9-4b01.ngrok-free.app/auth';
		const apiKey = process.env.SHOPIFY_API_KEY;
		console.log('🔶 API Key', apiKey);
		const scopes = process.env.SCOPES;
		console.log('Scopes: ', scopes);
		console.log('Redirect URI: ', redirectUri);

		const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&redirect_uri=${redirectUri}`;
		return redirect(authUrl);
	}

	// Handle the OAuth callback: exchange the code for an access token
	try {
		const secret = process.env.SHOPIFY_API_SECRET;
		console.log('🗝️ Second API Secret?:', secret);
		const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				client_id: process.env.SHOPIFY_API_KEY,
				client_secret: process.env.SHOPIFY_API_SECRET,
				code,
			}),
		});

		console.log('📣 Token Respone: ', tokenResponse);

		if (!tokenResponse.ok) {
			console.error('🐶 Failed to fetch access token:', await tokenResponse.text());
			throw new Response('Failed to fetch access token', { status: 500 });
		}

		const { access_token: accessToken } = await tokenResponse.json();
		console.log('💠Access Token:', accessToken);

		const session = await getSession(request.headers.get('Cookie'));
		session.set(`accessToken:${shop}`, accessToken);

		return redirect(`/dashboard?shop=${shop}`, {
			headers: { 'Set-Cookie': await commitSession(session) },
		});
	} catch (error) {
		console.error('🔴 Error during OAuth:', error);
		return redirect('/error?message=Authentication failed');
	}
};
