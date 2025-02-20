import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { getSession } from '../utils/session.server';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { hasKitAccess } from '../utils/provider.server';
import { redirect } from '@remix-run/node';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');
	
	// Add debug logging
	console.log('🔍 Session:', session);
	console.log('👤 UserData from session:', userData);

	if (!userData) {
		// Redirect to login if no user data is found
		return redirect('/auth/login');
	}

	const kits = userData?.kits;
	
	try {
		const accessToken = await getCompassAccessToken();
		const servicesPromise = fetchServicesAndModemData().then(async ({ services }) => ({
			services,
			kits,
			userData, // Pass the full userData to help with debugging
		}));

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
					<Await resolve={servicesData}>
						{({ services, kits }) => {
							// Now kits comes from the loader data
							const filteredServices = services
								.map((service) => ({
									...service,
									modems: service.modems?.filter((modem) => hasKitAccess(kits, modem.id)),
								}))
								.filter((service) => service.modems?.length > 0);

							if (!filteredServices || filteredServices.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for your account.</p>
									</div>
								);
							}

							return (
								<section className='stats-overview card'>
									{filteredServices.map((service) => (
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
															</div>
															{modem.details?.data?.latency?.data ? (
																<LatencyChart
																	latencyData={modem.details.data.latency.data}
																	modem={modem}
																/>
															) : (
																<div className='no-latency-message'>No Modem Data Available</div>
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

function LatencyChart({ latencyData, modem }) {
	if (!latencyData || latencyData.length === 0) {
		return <div className='no-latency-message'>No Data Available</div>;
	}

	const handleMouseMove = (e) => {
		e.preventDefault(); // Prevent any default behavior

		const bar = e.currentTarget;
		const rect = bar.getBoundingClientRect();
		const x = e.clientX - rect.left; // Get mouse x position within the bar
		const percentage = Math.min(Math.max(x / rect.width, 0), 1); // Clamp between 0 and 1

		// Find the closest data point based on hover position
		const index = Math.min(Math.floor(percentage * (latencyData.length - 1)), latencyData.length - 1);

		// Ensure we have valid data
		if (index >= 0 && index < latencyData.length) {
			const dataPoint = latencyData[index];
			if (dataPoint && Array.isArray(dataPoint) && dataPoint.length >= 2) {
				const timestamp = new Date(dataPoint[0]).toLocaleTimeString();
				const latency = dataPoint[1];

				// Update tooltip content
				const tooltip = bar.querySelector('.latency-tooltip');
				if (tooltip) {
					tooltip.textContent = `${timestamp}: ${latency} ms`;

					// Optional: Update tooltip position to follow cursor
					const tooltipWidth = tooltip.offsetWidth;
					const leftPosition = Math.min(Math.max(x - tooltipWidth / 2, 0), rect.width - tooltipWidth);
					tooltip.style.left = `${leftPosition}px`;
					tooltip.style.right = 'auto';
				}
			}
		}
	};

	return (
		<div className='service-status-container'>
			<div className='status-indicator'>
				<span className='status-badge online'>Online</span>
			</div>
			<div className='latency-bar-container'>
				<div
					className='latency-bar'
					onMouseMove={handleMouseMove}
				>
					<div className='latency-tooltip' />
				</div>
			</div>
		</div>
	);
}
