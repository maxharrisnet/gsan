// app/routes/performance.jsx
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import SatelliteMap from '../components/maps/SatelliteMap';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

// Server loader for initial data
export async function loader() {
	try {
		const accessToken = await getCompassAccessToken();

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
						console.log(`🗺️ Fetching GPS data for ${provider}`);
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

				return {
					services: services,
					gpsData: gpsDataMap,
				};
			})
			.catch((error) => {
				console.error('🍎 Error in services promise chain:', error);
				return { services: [], gpsData: {} };
			});

		return {
			servicesData: servicesPromise,
			accessToken,
		};
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

// Client loader for map-specific data
export function clientLoader({ data }) {
	return {
		...data,
		mapReady: true,
	};
}

export default function Dashboard() {
	const { servicesData } = useLoaderData();

	return (
		<Layout>
			<Sidebar>
				<Suspense fallback={<LoadingSpinner />}>
					<Await resolve={servicesData}>
						{(resolvedData) => {
							const { services } = resolvedData;
							return services?.length > 0 ? (
								<ul className='modem-list'>
									{services.flatMap((service) =>
										service.modems?.map((modem) => (
											<li
												key={modem.id}
												className={`modem-item status-${modem.status?.toLowerCase()}`}
											>
												<Link
													className='list-button'
													to={`/modem/${modem.type.toLowerCase()}/${modem.id}`}
												>
													<span className='modem-name'>{modem.name}</span>
													<span className='modem-chevron material-icons'>chevron_right</span>
												</Link>
											</li>
										))
									)}
								</ul>
							) : (
								<p>No modems found</p>
							);
						}}
					</Await>
				</Suspense>
			</Sidebar>

			<main className='content content-full-width'>
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

							// Transform the data for the map
							const markers = services.flatMap((service) =>
								(service.modems || [])
									.map((modem) => {
										const gpsInfo = gpsData[modem.id]?.[0];
										return gpsInfo
											? {
													id: modem.id,
													name: modem.name,
													status: modem.status,
													lat: gpsInfo.lat,
													lng: gpsInfo.lon,
												}
											: null;
									})
									.filter(Boolean)
							);

							return (
								<div>
									{markers.length > 0 && (
										<section className='map-section'>
											<div className='map-container'>
												<SatelliteMap
													center={[39.8283, -98.5795]}
													zoom={7}
													markers={markers}
													style={{ height: '100%', width: '100%' }}
												/>
											</div>
										</section>
									)}
								</div>
							);
						}}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
}
