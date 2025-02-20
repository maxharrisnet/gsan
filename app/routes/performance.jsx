// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { getSession } from '../utils/session.server';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const session = await getSession(request.headers.get('Cookie'));
		console.log('👀 session in performance loader:', session);
		const userData = session.get('userData');
		console.log('👀 userData in performance loader:', userData);

		// Get user's kit IDs from the session - updated to match session structure
		const userKits = userData?.metafields?.kits ? userData.metafields.kits.split(',').map((kit) => kit.trim()) : [];
		console.log('🎯 User Kits:', userKits);

		const accessToken = await getCompassAccessToken();
		const servicesPromise = fetchServicesAndModemData()
			.then(async ({ services }) => {
				console.log('📦 Original services:', services);

				// Filter services to only include modems that match user's kits
				const filteredServices = services
					.map((service) => ({
						...service,
						modems: service.modems.filter((modem) => {
							const matches = userKits.includes(modem.id);
							console.log(`🔍 Checking modem ${modem.id} against kits ${userKits}: ${matches}`);
							return matches;
						}),
					}))
					.filter((service) => service.modems.length > 0); // Remove services with no matching modems

				console.log('✨ Filtered services:', filteredServices);

				return {
					services: filteredServices,
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
