import { redirect } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError, Link, isRouteErrorResponse } from '@remix-run/react';
import { getSession } from './utils/session.server';
import { UserProvider } from './context/UserContext';
import globalStyles from './styles/global.css?url';
import styles from './styles/error.css';

export const links = () => [
	{ rel: 'stylesheet', href: globalStyles },
	{ rel: 'preconnect', href: 'https://cdn.shopify.com/' },
	{ rel: 'stylesheet', href: 'https://cdn.shopify.com/static/fonts/inter/v4/styles.css' },
	{ rel: 'stylesheet', href: styles },
];

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const url = new URL(request.url);
	const userData = session.get('userData');
	const shop = process.env.SHOPIFY_STORE_DOMAIN;

	// Add check for auth routes to prevent redirect loop
	const isAuthRoute = url.pathname === '/auth' || url.pathname === '/login';

	if (!userData && !isAuthRoute) {
		console.log('🚗 No user data, redirecting to /auth');
		return redirect('/auth');
	}

	return { userData, shop };
};

export default function Root() {
	const { user, shop } = useLoaderData();
	return (
		<html lang='en'>
			<head>
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

export function ErrorBoundary() {
	const error = useRouteError();
	const isProd = process.env.NODE_ENV === 'production';

	return (
		<html lang='en'>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				<div className='error-container'>
					<div className='error-content'>
						<h1 className='error-heading'>{isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : 'Oops! Something went wrong'}</h1>
						<div className='error-message'>{!isProd && <pre className='error-details'>{error.message || JSON.stringify(error, null, 2)}</pre>}</div>
						<Link
							to='/'
							className='error-button'
						>
							Return to Dashboard
						</Link>
					</div>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
