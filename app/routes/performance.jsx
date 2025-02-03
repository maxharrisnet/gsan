// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Add chart configuration
const latencyChartOptions = {
	responsive: true,
	maintainAspectRatio: false,
	height: 60,
	plugins: {
		tooltip: {
			mode: 'index',
			intersect: false,
			callbacks: {
				title: (context) => {
					const timestamp = context[0]?.raw?.timestamp;
					if (!timestamp) return '';
					return new Date(timestamp).toLocaleTimeString();
				},
				label: (context) => {
					const value = context?.raw?.y ?? 0;
					return `Latency: ${value}ms`;
				},
			},
		},
		legend: {
			display: false,
		},
	},
	scales: {
		x: {
			type: 'linear',
			display: false,
		},
		y: {
			beginAtZero: true,
			display: false,
			min: 0,
			max: 200,
		},
	},
	elements: {
		line: {
			tension: 0, // Makes the line straight
			borderWidth: 2,
		},
		point: {
			radius: 0, // Hide points
			hoverRadius: 4, // Show points on hover
		},
	},
	interaction: {
		intersect: false,
		mode: 'index',
	},
};

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const accessToken = await getCompassAccessToken();
		const servicesPromise = fetchServicesAndModemData()
			.then(async ({ services }) => {
				return {
					services: services,
				};
			})
			.catch((error) => {
				console.error('🍎 Error in services promise chain:', error);
				return { services: [] };
			});

		return defer({
			servicesData: servicesPromise,
			accessToken,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

export default function Dashboard() {
	const { servicesData } = useLoaderData();

	return (
		<Layout>
			<main className='content'>
				<Suspense fallback={<LoadingSpinner />}>
					<Await
						resolve={servicesData}
						errorElement={<div className='error-container'>Error loading dashboard data</div>}
					>
						{(resolvedData) => {
							const { services } = resolvedData;

							if (!services || !Array.isArray(services) || services.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for this account.</p>
									</div>
								);
							}

							return (
								<section className='stats-overview card'>
									{services.map((service) => (
										<div key={service.id}>
											{service.modems && service.modems.length > 0 ? (
												<div>
													{service.modems.map((modem) => (
														<Link
															key={modem.id}
															to={`/modem/${modem.type.toLowerCase()}/${modem.id}`}
															prefetch='intent'
															className='modem-card'
														>
															<div className='modem-header'>
																<h3>{modem.name}</h3>
																<h4>{service.name}</h4>
																<span className={`status-badge ${modem.status}`}>{modem.status}</span>
															</div>
															{modem.details?.data?.latency?.data ? (
																<LatencyChart
																	latencyData={modem.details.data.latency.data}
																	modem={modem}
																/>
															) : (
																<div className='no-latency-message'>No Latency Data Available</div>
															)}
														</Link>
													))}
												</div>
											) : (
												<p className='no-modems'>No modems available</p>
											)}
										</div>
									))}
								</section>
							);
						}}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
}

// Replace the existing latency bar with a Line chart
function LatencyChart({ latencyData, modem }) {
	// If no data is available
	if (!latencyData || latencyData.length === 0) {
		return <div className='no-latency-message'>No Data Available</div>;
	}

	// Get the latest latency value
	const latestDataPoint = latencyData[latencyData.length - 1];
	const latestLatency = latestDataPoint[1];
	const timestamp = new Date(latestDataPoint[0]).toLocaleTimeString();

	return (
		<div className='service-status-container'>
			<div className='status-indicator'>
				<span className='status-badge online'>Online</span>
			</div>
			<div className='latency-bar-container'>
				<div className='latency-bar'>
					{latestLatency && (
						<div className='latency-tooltip'>
							{timestamp}: {latestLatency} ms
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
