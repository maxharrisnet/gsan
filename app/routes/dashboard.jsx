// app/routes/dashboard.jsx
import { json, defer } from '@remix-run/node';
import { useLoaderData, Await, useNavigation, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { getUserData } from '../utils/user.server';
import { fetchServicesAndModemData } from '../compass.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import CustomerDashboard from '../components/dashboard/CustomerDashboard';
import ProviderDashboard from '../components/dashboard/ProviderDashboard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';
import dashboardStyles from '../styles/dashboard.css?url';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend, TimeScale);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export const loader = async ({ request }) => {
	const userData = await getUserData(request);
	const servicesPromise = fetchServicesAndModemData();

	return defer({
		userData,
		services: servicesPromise,
	});
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

export default function Dashboard() {
	const { userData, services } = useLoaderData();
	const navigation = useNavigation();
	const isLoading = navigation.state === 'loading';

	if (isLoading) {
		return <LoadingSpinner />;
	}

	return (
		<Layout>
			<Sidebar>
				<h2>Welcome, {userData.firstName}</h2>
				<nav>
					<ul>
						<li>
							<Link to='/dashboard'>Dashboard</Link>
						</li>
						<li>
							<Link to='/reports'>Reports</Link>
						</li>
						<li>
							<Link to='/map'>Map View</Link>
						</li>
						{userData.isProvider && (
							<li>
								<Link to='/customers'>Customers</Link>
							</li>
						)}
					</ul>
				</nav>
			</Sidebar>
			<main className='content'>
				<Suspense fallback={<LoadingSpinner />}>
					<Await
						resolve={services}
						errorElement={<ErrorBoundary />}
					>
						{(resolvedServices) =>
							userData.isProvider ? (
								<ProviderDashboard
									userData={userData}
									services={resolvedServices}
								/>
							) : (
								<CustomerDashboard
									userData={userData}
									services={resolvedServices}
								/>
							)
						}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
}

export { ErrorBoundary };
