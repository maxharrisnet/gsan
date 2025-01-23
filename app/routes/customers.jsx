// app/routes/customers.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await } from '@remix-run/react';
import { Suspense } from 'react';
import { getProviderCustomers } from '../utils/provider.server';
import Layout from '../components/layout/Layout';

export const loader = async ({ request }) => {
	try {
		const customersPromise = getProviderCustomers(request);
		return defer({
			customers: customersPromise,
		});
	} catch (error) {
		console.error('Error loading customers:', error);
		throw new Error('Failed to load customers');
	}
};

export default function Customers() {
	const { customers } = useLoaderData();

	return (
		<Layout>
			<h1>Your Customers</h1>
			<Suspense
				fallback={
					<div className='loading-container'>
						<div className='loading-spinner'></div>
					</div>
				}
			>
				<Await
					resolve={customers}
					errorElement={<div className='error-container'>Error loading customers</div>}
				>
					{(resolvedCustomers) => (
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
								{resolvedCustomers.map((customer) => (
									<tr key={customer.id}>
										<td>{customer.name}</td>
										<td>{customer.email}</td>
										<td>{customer.service}</td>
										<td>{customer.status}</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</Await>
			</Suspense>
		</Layout>
	);
}
