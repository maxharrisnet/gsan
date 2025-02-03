// app/routes/preformance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const accessToken = await getCompassAccessToken();
		const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

		const servicesPromise = fetchServicesAndModemData()
			.then(async ({ services }) => {
				console.log('📦 Raw services data received');

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
			googleMapsApiKey,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

export default function Dashboard() {
	const { servicesData, googleMapsApiKey } = useLoaderData();

	// Add console log to track component rendering
	console.log('🎨 Dashboard rendering with data:', servicesData);

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<h2>Dashboard</h2>
				</div>
			</Sidebar>

			<main className='content'>
				<Suspense fallback={<LoadingSpinner />}>
					<Await
						resolve={servicesData}
						errorElement={<div className='error-container'>Error loading dashboard data</div>}
					>
						{(resolvedData) => {
							// console.log('✨ Resolved data:', resolvedData);
							const { services, gpsData } = resolvedData;

							if (!services || !Array.isArray(services) || services.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for this account.</p>
									</div>
								);
							}

							// Calculate stats
							const stats = services.reduce(
								(acc, service) => {
									service.modems?.forEach((modem) => {
										acc.total++;
										acc[modem.status]++;
									});
									return acc;
								},
								{ total: 0, online: 0, offline: 0 }
							);

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
								<div className='dashboard-grid'>
									{/* Stats Overview */}
									<section className='stats-overview card'>
										<h3>System Status</h3>
										<div className='stats-grid'>
											<div className='stat-item'>
												<span>Total Modems</span>
												<span className='stat-value'>{stats.total}</span>
											</div>
											<div className='stat-item'>
												<span>Online</span>
												<span className='stat-value text-success'>{stats.online}</span>
											</div>
											<div className='stat-item'>
												<span>Offline</span>
												<span className='stat-value text-error'>{stats.offline}</span>
											</div>
										</div>
									</section>

									{/* Map */}
									{modemLocations.length > 0 && (
										<section className='map-section card'>
											<h3>Modem Locations</h3>
											<div className='map-container'>
												<APIProvider apiKey={googleMapsApiKey}>
													<Map
														defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
														defaultZoom={4}
														gestureHandling={'greedy'}
														disableDefaultUI={false}
													>
														{modemLocations.map((modem) => (
															<Marker
																key={modem.id}
																position={modem.position}
																title={modem.name}
																// icon={{
																// 	url: `/assets/markers/${modem.status}.png`,
																// 	scaledSize: { width: 30, height: 30 },
																// }}
															/>
														))}
													</Map>
												</APIProvider>
											</div>
										</section>
									)}

									{/* Services Grid */}
									<section className='services-grid'>
										{services.map((service) => (
											<div
												key={service.id}
												className='service-card card'
											>
												<h3>{service.name}</h3>
												{service.modems && service.modems.length > 0 ? (
													<div className='modems-grid'>
														{service.modems.map((modem) => (
															<Link
																key={modem.id}
																to={`/modem/${modem.type.toLowerCase()}/${modem.id}`}
																prefetch='intent'
																className='modem-card'
															>
																<div className='modem-header'>
																	<h4>{modem.name}</h4>
																	<span className={`status-badge ${modem.status}`}>{modem.status}</span>
																</div>
																{modem.details?.data?.latency?.data && (
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
								</div>
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
