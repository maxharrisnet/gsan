// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const accessToken = await getCompassAccessToken();
		const servicesPromise = fetchServicesAndModemData()
			.then(async ({ services }) => {
				// Group modems by provider type
				const modemsByProvider = services.reduce((acc, service) => {
					(service.modems || []).forEach((modem) => {
						if (modem.type) {
							acc[modem.type.toLowerCase()] = acc[modem.type.toLowerCase()] || [];
							acc[modem.type.toLowerCase()].push(modem.id);
						}
					});
					return acc;
				}, {});

				// Fetch GPS data for each provider type
				const gpsDataPromises = Object.entries(modemsByProvider).map(async ([provider, ids]) => {
					try {
						console.log(`🗺️ Fetching GPS data for ${provider}:`, ids);
						const gpsData = await fetchGPS(provider, ids, accessToken);
						return { provider, data: gpsData };
					} catch (error) {
						console.error(`🚨 GPS fetch error for ${provider}:`, error);
						return { provider, data: {} };
					}
				});

				const gpsResults = await Promise.all(gpsDataPromises);
				const gpsDataMap = gpsResults.reduce((acc, { provider, data }) => {
					if (data && typeof data === 'object') {
						return {
							...acc,
							...data,
						};
					}
					return acc;
				}, {});

				console.log('🗺️ Combined GPS data map:', gpsDataMap);

				return {
					services: services,
					gpsData: gpsDataMap,
				};
			})
			.catch((error) => {
				console.error('🍎 Error in services promise chain:', error);
				return { services: [], gpsData: {} };
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
							const { services, gpsData } = resolvedData;

							if (!services || !Array.isArray(services) || services.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for this account.</p>
									</div>
								);
							}

							// Extract modem locations with GPS data
							const modemLocations = services.flatMap((service) =>
								(service.modems || [])
									.map((modem) => {
										const gpsInfo = gpsData[modem.id]?.[0]; // Get latest GPS entry
										return gpsInfo
											? {
													id: modem.id,
													name: modem.name,
													status: modem.status,
													position: {
														lat: gpsInfo.lat,
														lng: gpsInfo.lon, // Note: API uses 'lon' not 'lng'
													},
												}
											: null;
									})
									.filter(Boolean)
							);

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
																<div className='latency-bar'>
																	{modem.details.data.latency.data.map((point, index) => (
																		<div
																			key={index}
																			className={`latency-segment ${getLatencyClass(point[1])}`}
																			style={{
																				width: `${(10 / 1440) * 100}%`,
																			}}
																		/>
																	))}
																</div>
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

// Helper functions
function getLatencyClass(latency) {
	if (!latency) return 'latency-error';
	if (latency < 50) return 'latency-success';
	if (latency < 150) return 'latency-warning';
	return 'latency-error';
}
