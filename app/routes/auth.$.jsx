import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
	console.log('🔐 Authenticating from app/routes/auth.%24.jsx');
	console.log('Request URL:', request.url);
	await authenticate.admin(request);

	return null;
};
