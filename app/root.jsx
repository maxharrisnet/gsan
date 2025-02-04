import { redirect } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError, Link, isRouteErrorResponse } from '@remix-run/react';
import { getSession } from './utils/session.server';
import { UserProvider } from './context/UserContext';
import globalStyles from './styles/global.css?url';
import errorStyles from './styles/error.css?url';

export const links = () => [
	{ rel: 'stylesheet', href: globalStyles },
	{ rel: 'preconnect', href: 'https://cdn.shopify.com/' },
	{ rel: 'stylesheet', href: 'https://cdn.shopify.com/static/fonts/inter/v4/styles.css' },
	{ rel: 'stylesheet', href: errorStyles },
	{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/icon?family=Material+Icons' },
];

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const url = new URL(request.url);
	const userData = session.get('userData');
	const isProd = process.env.NODE_ENV === 'production';

	// Add check for auth routes to prevent redirect loop
	const isAuthRoute = url.pathname === '/auth' || url.pathname === '/login' || url.pathname === '/';

	if (!userData && !isAuthRoute) {
		console.log('🚗 No user data, redirecting to /auth');
		return redirect('/auth');
	}

	if (userData && isAuthRoute) {
		console.log('🚗 User data found, redirecting to /performance');
		return redirect('/performance');
	}

	return { userData, isProd };
};

export default function Root() {
	const { user } = useLoaderData();
	return (
		<html lang='en'>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				<UserProvider initialUser={user}>
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
	let isProd = false;

	try {
		const data = useLoaderData();
		isProd = data?.isProd;
	} catch {
		// If loader data isn't available during error, default to development mode
		isProd = process.env.NODE_ENV === 'production';
	}

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
