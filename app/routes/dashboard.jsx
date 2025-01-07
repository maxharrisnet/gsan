// app/routes/dashboard.jsx
import { useLoaderData } from '@remix-run/react';
import { getUserData } from '../utils/user.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';

export const loader = async ({ request }) => {
	const userData = await getUserData(request);
	if (!userData) {
		throw new Response('Unauthorized', { status: 401 });
	}
	return { userData };
};

export default function Dashboard() {
	const { userData } = useLoaderData();

	return (
		<Layout>
			<Sidebar>
				<h2>Welcome, {userData.name}</h2>
			</Sidebar>
			<main className='content'>{userData.isProvider ? <ProviderDashboard userData={userData} /> : <CustomerDashboard userData={userData} />}</main>
		</Layout>
	);
}

function ProviderDashboard({ userData }) {
	return (
		<div>
			<h3>Provider Dashboard</h3>
			<p>Provider Name: {userData.providerName}</p>
			<h4>Provider Metafields:</h4>
			<ul>
				{userData.providerMetafields.map((metafield, index) => (
					<li key={index}>
						{metafield.key}: {metafield.value}
					</li>
				))}
			</ul>
			{/* Add more provider-specific information here */}
		</div>
	);
}

function CustomerDashboard({ userData }) {
	return (
		<div>
			<h3>Customer Dashboard</h3>
			<p>Email: {userData.email}</p>
			{/* Add more customer-specific information here */}
		</div>
	);
}
