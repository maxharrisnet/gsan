import { redirect } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '../session.server';
import Layout from '../components/layout/Layout';

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const user = session.get('userData');

	if (!user) {
		return redirect('/gsan/login');
	}

	return user;
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
