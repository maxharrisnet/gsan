// app/routes/dashboard.jsx
import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getUserData } from '../utils/user.server';
import { fetchServicesAndModemData } from '../compass.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import dashboardStyles from '../styles/dashboard.css?url';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, TimeScale);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export const loader = async ({ request }) => {
	const userData = await getUserData(request);
	const services = await fetchServicesAndModemData();

	return json({ userData, services });
};

export function getLatencyClass(latency) {
	if (latency < 50) return 'latency-green';
	else if (latency < 150) return 'latency-orange';
	else return 'latency-red';
}

function ModemList({ services }) {
	const showLatency = (modem) => {
		return modem.details.data.latency && modem.details.data.latency.data.length > 0;
	};

	return (
		<div className='container'>
			{services.length > 0 ? (
				services.map((service) => (
					// ... existing modem rendering code from performance.jsx ...
					<div key={service.id}>
						{service.modems && service.modems.length > 0 ? (
							service.modems.map((modem) => (
								<div key={modem.id}>
									<a
										href={`/modem/${encodeURI(modem.type.toLowerCase())}/${modem.id}`}
										className='text-black text-decoration-none fw-bold'
									>
										{/* ... existing modem card code ... */}
									</a>
								</div>
							))
						) : (
							<p>No modems available for service: {service.name}</p>
						)}
					</div>
				))
			) : (
				<div className='bg-light'>
					<div className='container-sm'>
						<div className='text-center'>
							<p>No services available.</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ProviderDashboard({ userData, services }) {
	return (
		<div className='dashboard provider-dashboard'>
			<div className='dashboard-header'>
				<h2>Service Provider Dashboard</h2>
				<div className='quick-stats'>
					<div className='stat-card'>
						<h3>Total Customers</h3>
						<p>{userData.customerCount || 0}</p>
					</div>
					<div className='stat-card'>
						<h3>Active Services</h3>
						<p>{services.length}</p>
					</div>
					{/* Add more stats as needed */}
				</div>
			</div>

			<section className='service-overview'>
				<h3>Service Overview</h3>
				<ModemList services={services} />
			</section>

			<section className='recent-alerts'>
				<h3>Recent Alerts</h3>
				{/* Add alerts component here */}
			</section>
		</div>
	);
}

function CustomerDashboard({ userData, services }) {
	return (
		<div className='dashboard customer-dashboard'>
			<div className='dashboard-header'>
				<h2>Customer Dashboard</h2>
				<div className='quick-stats'>
					<div className='stat-card'>
						<h3>Active Services</h3>
						<p>{services.length}</p>
					</div>
					{/* Add more customer-specific stats */}
				</div>
			</div>

			<section className='service-status'>
				<h3>Your Services</h3>
				<ModemList services={services} />
			</section>

			<section className='account-info'>
				<h3>Account Information</h3>
				<div className='info-grid'>
					<div>
						<strong>Account ID:</strong> {userData.id}
					</div>
					<div>
						<strong>Name:</strong> {userData.firstName} {userData.lastName}
					</div>
					<div>
						<strong>Email:</strong> {userData.email}
					</div>
					{/* Add more account details */}
				</div>
			</section>
		</div>
	);
}

export default function Dashboard() {
	const { userData, services } = useLoaderData();

	return (
		<Layout>
			<Sidebar>
				<h2>Welcome, {userData.firstName}</h2>
				{/* Add navigation links here */}
			</Sidebar>
			<main className='content'>
				{userData.isProvider ? (
					<ProviderDashboard
						userData={userData}
						services={services}
					/>
				) : (
					<CustomerDashboard
						userData={userData}
						services={services}
					/>
				)}
			</main>
		</Layout>
	);
}
