import { useLoaderData } from '@remix-run/react';
import { getSession } from '../session.server';
import Layout from '../components/layout/Layout';

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const customerAccessToken = session.get('customerAccessToken');
	console.log('🥚 Customer Access Token', customerAccessToken);

	if (!customerAccessToken) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				query: `
          query($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              firstName
              lastName
              email
              orders(first: 10) {
                edges {
                  node {
                    id
                    orderNumber
                    totalPrice {
                      amount
                      currencyCode
                    }
                    processedAt
                    lineItems(first: 1) {
                      edges {
                        node {
                          title
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
				variables: {
					customerAccessToken,
				},
			}),
		});

		const data = await response.json();
		if (!response.ok) {
			throw new Error('🍩 Failed to fetch customer data');
		}
		console.log('🐷 Customer Data: ', data);
		return data.data.customer;
	} catch (error) {
		console.error('Error fetching dashboard data:', error);
		return { error: 'Failed to load data', status: 500 };
	}
};

export default function Dashboard() {
	const customer = useLoaderData();

	if (!customer) {
		return <div>Loading...</div>;
	}

	if (customer.error) {
		return <div>Error: {customer.error}</div>;
	}

	return (
		<Layout>
			<h1>Dashboard</h1>
			<p>
				Welcome, {customer.firstName} {customer.lastName}
			</p>
			<p>Email: {customer.email}</p>
			<h2>Recent Orders</h2>
			<table>
				<thead>
					<tr>
						<th>Order ID</th>
						<th>Order Number</th>
						<th>Date</th>
						<th>Total</th>
						<th>First Item</th>
					</tr>
				</thead>
				<tbody>
					{customer.orders.edges.map(({ node }) => (
						<tr key={node.id}>
							<td>{node.id}</td>
							<td>{node.orderNumber}</td>
							<td>{new Date(node.processedAt).toLocaleDateString()}</td>
							<td>
								{node.totalPrice.amount} {node.totalPrice.currencyCode}
							</td>
							<td>{node.lineItems.edges[0]?.node.title || 'N/A'}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Layout>
	);
}
