import { redirect } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, useLoaderData, Link, isRouteErrorResponse } from '@remix-run/react';
import { getSession } from './utils/session.server';
import { UserProvider } from './context/UserContext';
import globalStyles from './styles/global.css?url';
import errorStyles from './styles/error.css?url';
import Layout from './components/layout/Layout';

export function links() {
	return [...Layout.links()];
}

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const url = new URL(request.url);
	const userData = session.get('userData');

	console.log('🌳 Root loader:', {
		hasSession: Boolean(session),
		hasUserData: Boolean(userData),
		userData: userData, // Log the actual userData to see what we have
		path: url.pathname,
	});

	// Public routes that don't require authentication
	const publicRoutes = ['/auth', '/login', '/'];
	const isPublicRoute = publicRoutes.includes(url.pathname);

	// If we have userData and we're on a public route, redirect to dashboard
	if (userData && isPublicRoute) {
		console.log('👉 Authenticated user on public route, redirecting to dashboard');
		return redirect('/dashboard');
	}

	// If we don't have userData and we're not on a public route, redirect to auth
	if (!userData && !isPublicRoute) {
		console.log('👉 Unauthenticated user on protected route, redirecting to auth');
		return redirect('/auth');
	}

	return { userData };
};

export default function Root() {
	const { userData } = useLoaderData();
	return (
		<html lang='en'>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				<UserProvider initialUser={userData}>
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
							to='/auth'
							className='error-button'
						>
							Return to Login
						</Link>
					</div>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
