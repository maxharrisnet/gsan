import { json } from '@remix-run/node';
import { getSession } from '../session.server';
import { useLoaderData } from '@remix-run/react';

export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const shop = url.searchParams.get('shop');

	if (!shop) {
		return json({ error: 'Shop parameter is missing' }, { status: 400 });
	}

	// Retrieve the access token from the session
	const session = await getSession(request.headers.get('Cookie'));
	const accessToken = session.get(`accessToken:${shop}`);

	if (!accessToken) {
		return json({ error: 'Access token is missing or invalid' }, { status: 401 });
	}

	try {
		// Make a direct request to the Shopify Admin API
		const response = await fetch(`https://${shop}/admin/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Access-Token': accessToken,
			},
			body: JSON.stringify({
				query: `
          query {
            customers(first: 10) {
              edges {
                node {
                  id
                  email
                  firstName
                  lastName
                }
              }
            }
          }
        `,
			}),
		});

		const data = await response.json();

		if (response.ok && data?.data?.customers?.edges) {
			return json({ customers: data.data.customers.edges });
		} else {
			console.error('GraphQL Errors:', data.errors || response.statusText);
			return json({ error: 'Failed to fetch customers' }, { status: response.status });
		}
	} catch (error) {
		console.error('Error fetching customers:', error);
		return json({ error: 'Failed to fetch customers' }, { status: 500 });
	}
};

export default function Dashboard() {
	const { customers = [], error } = useLoaderData();

	if (error) {
		return (
			<div>
				<h1>Dashboard</h1>
				<div className='error'>Error: {error}</div>
			</div>
		);
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<h2>Customers</h2>
			{customers.length > 0 ? (
				customers.map(({ node }) => (
					<div key={node.id}>
						<p>
							{node.firstName} {node.lastName} - {node.email}
						</p>
					</div>
				))
			) : (
				<p>No customers found.</p>
			)}
		</div>
	);
}
