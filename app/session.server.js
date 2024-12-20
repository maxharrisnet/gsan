import { createCookieSessionStorage } from '@remix-run/node';
const secret = process.env.SESSION_SECRET || 'default-hardcoded-secret';
console.log('Resolved Secret:', secret);
// Set up session storage with secure cookie settings
export const sessionStorage = createCookieSessionStorage({
	cookie: {
		name: '__session', // Cookie name
		httpOnly: true, // Prevent client-side access
		secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
		sameSite: 'lax', // Prevent CSRF attacks
		path: '/', // Cookie is accessible across the entire app
		secrets: [secret], // Secret for encrypting the session
	},
});

// Retrieve the session from the request
export async function getSession(cookieHeader) {
	return sessionStorage.getSession(cookieHeader);
}

// Commit (save) the session and return the Set-Cookie header
export async function commitSession(session) {
	return sessionStorage.commitSession(session);
}

// Destroy the session and return the Set-Cookie header for clearing it
export async function destroySession(session) {
	return sessionStorage.destroySession(session);
}
