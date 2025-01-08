import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import shopify from '../shopify.server';

export const loader = async ({ request }) => {
	const { admin } = await shopify.authenticate.admin(request);

	try {
		const response = await admin.graphql(`
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
    `);

		const customers = await response.json();
		return json({ customers: customers.data.customers.edges });
	} catch (error) {
		console.error('Error fetching customers:', error);
		return json({ error: 'Failed to fetch customers' }, { status: 500 });
	}
};

export default function Dashboard() {
	const { customers, error } = useLoaderData();

	if (error) {
		return <div>Error: {error}</div>;
	}

	return (
		<div>
			<h1>Dashboard</h1>
			<h2>Customers</h2>
			{customers.map(({ node }) => (
				<div key={node.id}>
					<p>
						{node.firstName} {node.lastName} - {node.email}
					</p>
				</div>
			))}
		</div>
	);
}
