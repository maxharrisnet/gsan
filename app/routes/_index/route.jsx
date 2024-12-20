import { redirect } from '@remix-run/node';
import { getSession } from '../../session.server';

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const shop = url.searchParams.get('shop');

	if (!shop) {
		return new Response('Missing shop parameter', { status: 400 });
	}

	const session = await getSession(request.headers.get('Cookie'));

	// Redirect to /auth if session is missing
	if (!session || !session.get(`accessToken:${shop}`)) {
		return redirect(`/auth?${url.searchParams.toString()}`);
	}

	// If session exists, redirect to dashboard
	return redirect('/dashboard');
};
