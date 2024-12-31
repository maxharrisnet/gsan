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
	const url = new URL(request.url);
	const path = url.pathname;
	const shop = process.env.SHOPIFY_STORE_DOMAIN;
	const session = await getSession(request.headers.get('Cookie'));

	console.log('🛩️  Navigating to page: ', path);

	// Check for admin session (Shopify store access token)
	// const adminAccessToken = session.get(`accessToken:${shop}`);
	// if (!adminAccessToken) {
	// 	console.log('🏓 Missing admin session. Redirecting to /auth');
	// 	return redirect(`/auth?shop=${shop}`);
	// }

	// Check for user session (Shopify customer access token)
	const customerAccessToken = session.get('customerAccessToken');
	if (!customerAccessToken && path !== '/gsan/login') {
		console.log('🏓 Missing user session. Redirecting to /gsan/login');
		return redirect(`/gsan/login?shop=${shop}`);
	}

	// Fetch customer data using the customerAccessToken
	let user = null;
	if (customerAccessToken) {
		try {
			const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
				},
				body: JSON.stringify({
					query: `
            query {
              customer {
                id
                firstName
                lastName
                email
              }
            }
          `,
				}),
			});

			const data = await response.json();
			if (response.ok && data?.data?.customer) {
				const { id, firstName, lastName, email } = data.data.customer;
				user = { id, firstName, lastName, email };
			} else {
				console.error('🍳 Error fetching customer data:', data.errors || response.statusText);
			}
		} catch (error) {
			console.error('🍳 Error during customer data fetch:', error);
		}
	}

	// Pass session data to the component
	return { shop, user };
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
					currentUser={user}
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
