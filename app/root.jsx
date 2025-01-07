import { redirect } from '@remix-run/node';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError } from '@remix-run/react';
import { getSession } from './utils/session.server';
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
	console.log('🛩️ Navigating to page: ', path);

	const customerAccessToken = session.get('customerAccessToken');
	if (!customerAccessToken && path !== '/gsan/login') {
		console.log('🏓 Missing user session. Redirecting to /gsan/login');
		return redirect(`/gsan/login?shop=${shop}`);
	}

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
            query($customerAccessToken: String!) {
              customer(customerAccessToken: $customerAccessToken) {
                id
                firstName
                lastName
                email
              }
            }
          `,
					variables: { customerAccessToken },
				}),
			});
			const data = await response.json();
			if (response.ok && data?.data?.customer) {
				const { id, firstName, lastName, email } = data.data.customer;
				user = { id, firstName, lastName, email };
			} else {
				console.error('Error fetching customer data:', data.errors || response.statusText);
			}
		} catch (error) {
			console.error('Error during customer data fetch:', error);
		}
	}

	return { shop, user };
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
				<UserProvider value={user}>
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
	return (
		<html lang='en'>
			<head>
				<Meta />
				<Links />
			</head>
			<body>
				<h1>Error</h1>
				<p>{error?.message || 'Unknown error occurred'}</p>
				<Scripts />
			</body>
		</html>
	);
}
