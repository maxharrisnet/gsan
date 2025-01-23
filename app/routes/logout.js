import { getSession, destroySession } from '../utils/session.server';

export const action = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	return new Response(null, {
		headers: {
			'Set-Cookie': await destroySession(session),
			Location: '/auth',
		},
		status: 302,
	});
};

export default function Logout() {
	return null;
}
