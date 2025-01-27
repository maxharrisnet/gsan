// app/routes/dashboard.jsx
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
import dashboardStyles from '../styles/dashboard.css?url';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const servicesPromise = fetchServicesAndModemData();
		const accessToken = await getCompassAccessToken();

		// Validate initial services data
		const services = await servicesPromise;
		if (!services || !Array.isArray(services)) {
			throw new Error('Invalid services data received');
		}

		// Group modems by provider
		const modemsByProvider = services.reduce((acc, service) => {
			service.modems?.forEach((modem) => {
				if (modem.type) {
					acc[modem.type] = acc[modem.type] || [];
					acc[modem.type].push(modem.id);
				}
			});
			return acc;
		}, {});

		// Only fetch GPS if we have modems
		const gpsPromises = Object.keys(modemsByProvider).length > 0 ? Object.entries(modemsByProvider).map(([provider, ids]) => fetchGPS(provider, ids, accessToken)) : Promise.resolve([]);

		return defer({
			servicesData: servicesPromise,
			gpsData: Promise.all(gpsPromises),
		});
	} catch (error) {
		console.error('🚨 Error loading dashboard:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

export default function Dashboard() {
	const { servicesData, gpsData } = useLoaderData();

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
						resolve={Promise.all([servicesData, gpsData])}
						errorElement={<div className='error-container'>Error loading dashboard data</div>}
					>
						{([services, gpsDataArray]) => {
							if (!services || !Array.isArray(services) || services.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for this account.</p>
									</div>
								);
							}

							// Combine GPS data from all providers
							const gpsDataMap = gpsDataArray.reduce(
								(acc, providerData) => ({
									...acc,
									...(providerData || {}),
								}),
								{}
							);

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
										const gpsInfo = gpsDataMap[modem.id];
										return gpsInfo
											? {
													id: modem.id,
													name: modem.name,
													status: modem.status,
													position: {
														lat: gpsInfo.latitude,
														lng: gpsInfo.longitude,
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

									{/* Map Section */}
									{modemLocations.length > 0 && (
										<section className='map-section card'>
											<h3>Modem Locations</h3>
											<div className='map-container'>
												<APIProvider apiKey={process.env.GOOGLE_MAPS_API_KEY}>
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
																icon={{
																	url: `/assets/markers/${modem.status}.png`,
																	scaledSize: { width: 30, height: 30 },
																}}
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
																to={`/modem/${modem.type}/${modem.id}`}
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
	if (!latency) return 'text-error';
	if (latency < 50) return 'text-success';
	if (latency < 150) return 'text-warning';
	return 'text-error';
}
