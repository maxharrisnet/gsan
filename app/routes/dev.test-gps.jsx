import { redirect } from '@remix-run/node';

export async function loader({ request }) {
	// Only allow in development
	if (process.env.NODE_ENV === 'production') {
		return new Response('Not available in production', { status: 403 });
	}

	const response = await fetch(`${new URL(request.url).origin}/api/gps/batch`, {
		headers: {
			Authorization: `Bearer ${process.env.CRON_SECRET}`,
			'Content-Type': 'application/json',
		},
	});

	const data = await response.json();
	return new Response(JSON.stringify(data, null, 2), {
		headers: {
			'Content-Type': 'application/json',
		},
	});
}
