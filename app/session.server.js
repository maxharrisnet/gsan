import { createCookieSessionStorage } from '@remix-run/node';

const secret = process.env.SESSION_SECRET || 'default-hardcoded-secret';

export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '__session',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		path: '/',
		secrets: [secret],
	},
});

// Retrieve session
export async function getSession(cookieHeader) {
	return sessionStorage.getSession(cookieHeader || '');
}

// Commit session changes
export async function commitSession(session) {
	return sessionStorage.commitSession(session);
}

// Destroy session
export async function destroySession(session) {
	return sessionStorage.destroySession(session);
}

// Save the admin session (Shopify store access token)
export async function createAdminSession({ accessToken }, redirectTo) {
	const session = await sessionStorage.getSession();
	session.set('adminAccessToken', accessToken);

	return new Response(null, {
		headers: {
			'Set-Cookie': await commitSession(session),
			Location: redirectTo,
		},
		status: 302,
	});
}

// Save the user session (Customer access token)
export async function createUserSession({ customerAccessToken, expiresAt }, redirectTo) {
	const session = await sessionStorage.getSession();
	session.set('customerAccessToken', customerAccessToken);
	session.set('customerExpiresAt', expiresAt);

	return new Response(null, {
		headers: {
			'Set-Cookie': await commitSession(session),
			Location: redirectTo,
		},
		status: 302,
	});
}
