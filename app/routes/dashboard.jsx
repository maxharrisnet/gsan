// app/routes/dashboard.jsx
import { useLoaderData } from '@remix-run/react';
import { getUserData } from '../utils/user.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';

export const loader = async ({ request }) => {
	const userData = await getUserData(request);
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
	// Display provider-specific information
}

function CustomerDashboard({ userData }) {
	// Display customer-specific information
}
