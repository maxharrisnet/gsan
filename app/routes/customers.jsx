// app/routes/customers.jsx
import { useLoaderData } from '@remix-run/react';
import { getProviderCustomers } from '../utils/provider.server';
import Layout from '../components/layout/Layout';

export const loader = async ({ request }) => {
	const customers = await getProviderCustomers(request);
	return { customers };
};

export default function Customers() {
	const { customers } = useLoaderData();

	return (
		<Layout>
			<h1>Your Customers</h1>
			<table>
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Service</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{customers.map((customer) => (
						<tr key={customer.id}>
							<td>{customer.name}</td>
							<td>{customer.email}</td>
							<td>{customer.service}</td>
							<td>{customer.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</Layout>
	);
}
