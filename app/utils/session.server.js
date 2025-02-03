import { createCookieSessionStorage, redirect } from '@remix-run/node';

const secret = process.env.SHOPIFY_API_SECRET;

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'gsan_customer_session',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/preformance',
		secrets: [secret],
	},
});
export async function createUserSession(userData, userType, redirectTo) {
	const session = await sessionStorage.getSession();
	session.set('userData', { ...userData, userType });
	return redirect(redirectTo, {
		headers: {
			'Set-Cookie': await sessionStorage.commitSession(session),
		},
	});
}

export async function getSession(cookieHeader) {
	return sessionStorage.getSession(cookieHeader || '');
}

export async function commitSession(session) {
	return sessionStorage.commitSession(session);
}

export async function destroySession(session) {
	return sessionStorage.destroySession(session);
}

// Helper function to save the admin session
export async function createAdminSession({ accessToken, shop }, redirectTo) {
	const session = await sessionStorage.getSession();
	session.set(`accessToken:${shop}`, accessToken);

	return new Response(null, {
		headers: {
			'Set-Cookie': await commitSession(session),
			Location: redirectTo,
		},
		status: 302,
	});
}
