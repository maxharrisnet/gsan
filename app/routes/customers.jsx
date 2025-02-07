// app/routes/customers.jsx
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';
import styles from '../styles/customers.css?url';

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');

	if (!userData) {
		throw json({ message: 'Not authenticated' }, { status: 401 });
	}

	const { shop } = userData;

	try {
		// Fetch customers from Shopify using your existing storefront token
		const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				query: `
					query {
						customers(first: 50) {
							edges {
								node {
									id
									firstName
									lastName
									email
									phone
									createdAt
									defaultAddress {
										city
										province
									}
									orders(first: 1, sortKey: CREATED_AT, reverse: true) {
										edges {
											node {
												id
												financialStatus
												currentTotalPrice {
													amount
													currencyCode
												}
											}
										}
									}
								}
							}
						}
					}
				`,
			}),
		});

		const { data } = await response.json();
		console.log('🛍️ Shopify Customers:', data);
		return json({ customers: data?.customers?.edges || [] });
	} catch (error) {
		console.error('Error fetching customers:', error);
		return json({ customers: [] });
	}
}

export default function Customers() {
	const { customers } = useLoaderData();

	return (
		<Layout>
			<main className='content'>
				<div className='container'>
					<header className='section'>
						<h1>Customers</h1>
					</header>

					<div className='section'>
						<div className='customers-table'>
							<table>
								<thead>
									<tr>
										<th>Name</th>
										<th>Email</th>
										<th>Location</th>
										<th>Latest Order</th>
										<th>Status</th>
									</tr>
								</thead>
								<tbody>
									{customers.map(({ node: customer }) => {
										const latestOrder = customer.orders.edges[0]?.node;
										return (
											<tr key={customer.id}>
												<td>
													<a href={`/profile/${customer.id}`}>
														{customer.firstName} {customer.lastName}
													</a>
												</td>
												<td>{customer.email}</td>
												<td>{customer.defaultAddress ? `${customer.defaultAddress.city}, ${customer.defaultAddress.province}` : '-'}</td>
												<td>{latestOrder ? `${latestOrder.currentTotalPrice.amount} ${latestOrder.currentTotalPrice.currencyCode}` : 'No orders'}</td>
												<td>
													<span className={`status ${latestOrder?.financialStatus?.toLowerCase() || 'unknown'}`}>{latestOrder?.financialStatus || 'No Orders'}</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</main>
		</Layout>
	);
}
