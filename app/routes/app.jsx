import { Link, Outlet, useLoaderData, useRouteError } from '@remix-run/react';
import { boundary } from '@shopify/shopify-app-remix/server';
import { AppProvider } from '@shopify/shopify-app-remix/react';
import { NavMenu } from '@shopify/app-bridge-react';
import { authenticate } from '../shopify.server';
import { UserProvider } from '../context/UserContext';

export const loader = async ({ request }) => {
	await authenticate.admin(request);

	return { apiKey: process.env.SHOPIFY_API_KEY || '' };
};

export default function App({ initialUser, shop }) {
	const { apiKey } = useLoaderData();

	return (
		<AppProvider
			isEmbeddedApp={false}
			apiKey={apiKey}
		>
			<UserProvider
				initialUser={initialUser}
				shop={shop}
			>
				<NavMenu>
					<Link
						to='/app'
						rel='home'
					>
						Home
					</Link>
					<Link to='/app/additional'>Additional page</Link>
				</NavMenu>
				<Outlet />
			</UserProvider>
		</AppProvider>
	);
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
	return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
	return boundary.headers(headersArgs);
};
