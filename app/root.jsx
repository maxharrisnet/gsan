import { redirect } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError } from '@remix-run/react';
import { getSession } from './session.server';
import { UserProvider } from './context/UserContext';
import globalStyles from './styles/global.css?url';

export const links = () => [
	{ rel: 'stylesheet', href: globalStyles },
	{ rel: 'preconnect', href: 'https://cdn.shopify.com/' },
	{ rel: 'stylesheet', href: 'https://cdn.shopify.com/static/fonts/inter/v4/styles.css' },
];

export const loader = async ({ request }) => {
	const user = await getSession(request);
	const shop = process.env.SHOPIFY_STORE_DOMAIN; // Access the environment variable

	// If there is a user session and the path is /login, redirect to /performance
	// if (path.endsWith('/login') && user) {
	// 	console.log('🏓 Redirecting to dashboard');
	// 	return redirect('/performance');
	// }

	// If there is no user session and the path is not /login, redirect to /login
	// if (!path.endsWith('/login') && !user) {
	// 	console.log('🏓 Redirecting to login');
	// 	return redirect('/login');
	// }

	return { user, shop };
};

export default function Root() {
	const { user, shop } = useLoaderData();
	return (
		<html lang='en'>
			<head>
				<meta charSet='utf-8' />
				<meta
					name='viewport'
					content='width=device-width, initial-scale=1'
				/>
				<Meta />
				<Links />
			</head>
			<body>
				<UserProvider
					initialUser={user}
					shop={shop}
				>
					<Outlet />
				</UserProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export function ErrorBoundary({ error }) {
	return (
		<html>
			<head>
				<title>Oh no!</title>
				<Meta />
				<Links />
			</head>
			<body>
				<div style={{ display: 'block', textAlign: 'center', height: '100vh', maxWidth: '800px', margin: '0 auto', padding: '80px' }}>
					<h1>Something went wrong</h1>
					<p style={{ textAlign: 'left', lineHeight: '1.4rem' }}>{error?.message}</p>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
