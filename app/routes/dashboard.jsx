import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '../session.server';

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const customerAccessToken = session.get('customerAccessToken');

	if (!customerAccessToken) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': customerAccessToken,
			},
			body: JSON.stringify({
				query: `
          query {
            customer {
              firstName
              lastName
              email
              orders(first: 10) {
                edges {
                  node {
                    id
                    totalPrice
                  }
                }
              }
            }
          }
        `,
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error('Failed to fetch customer data');
		}

		return json(data.data.customer);
	} catch (error) {
		console.error('Error fetching dashboard data:', error);
		return json({ error: 'Failed to load data' }, { status: 500 });
	}
};

export default function Dashboard() {
	const customer = useLoaderData();

	if (!customer) {
		return <div>Error loading dashboard data</div>;
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<h2>
				Welcome, {customer.firstName} {customer.lastName}
			</h2>
			<h3>Your Orders:</h3>
			<ul>
				{customer.orders.edges.map(({ node }) => (
					<li key={node.id}>
						Order ID: {node.id}, Total: {node.totalPrice}
					</li>
				))}
			</ul>
		</div>
	);
}
