// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense, useState } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { getSession } from '../utils/session.server';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const session = await getSession(request.headers.get('Cookie'));
		const userData = session.get('userData');
		const accessToken = await getCompassAccessToken();
		const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

		// Get user's kit IDs from the session
		const userKits = userData?.metafields?.kits ? userData.metafields.kits.split(',').map((kit) => kit.trim()) : [];

		const servicesPromise = fetchServicesAndModemData().then(async ({ services }) => {
			// Filter services based on user's kits first
			const filteredServices = services
				.map((service) => ({
					...service,
					modems: service.modems.filter((modem) => userKits.includes(modem.id)),
				}))
				.filter((service) => service.modems.length > 0);

			// Group modems by provider type more efficiently
			const modemsByProvider = {};
			filteredServices.forEach((service) => {
				service.modems.forEach((modem) => {
					if (modem.type) {
						const type = modem.type.toLowerCase();
						modemsByProvider[type] = modemsByProvider[type] || [];
						modemsByProvider[type].push(modem.id);
					}
				});
			});

			// Fetch GPS data for each provider type with error handling
			const gpsDataPromises = Object.entries(modemsByProvider).map(async ([provider, ids]) => {
				try {
					console.log(`🗺️ Fetching GPS data for ${provider} modems: ${ids.join(', ')}`);
					const gpsData = await fetchGPS(provider, ids, accessToken);
					return { provider, data: gpsData };
				} catch (error) {
					console.error(`🚨 GPS fetch error for ${provider}:`, error);
					return { provider, data: {} };
				}
			});

			// Wait for all GPS data with a timeout
			const gpsResults = await Promise.race([Promise.all(gpsDataPromises), new Promise((_, reject) => setTimeout(() => reject(new Error('GPS data fetch timeout')), 5000))]).catch((error) => {
				console.warn('⚠️ GPS data fetch issue:', error);
				return []; // Return empty array on timeout
			});

			// Combine GPS data
			const gpsDataMap = gpsResults.reduce(
				(acc, { data }) => ({
					...acc,
					...data,
				}),
				{}
			);

			return {
				services: filteredServices,
				gpsData: gpsDataMap,
			};
		});

		return defer({
			servicesData: servicesPromise,
			googleMapsApiKey,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading map data', { status: 500 });
	}
}

export default function Dashboard() {
	const { servicesData, googleMapsApiKey } = useLoaderData();
	const [mapLoaded, setMapLoaded] = useState(false);

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
						errorElement={<div className='error-container'>Error loading map data</div>}
					>
						{(resolvedData) => {
							const { services, gpsData } = resolvedData;

							if (!services?.length) {
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
										const gpsInfo = gpsData[modem.id]?.[0];
										return gpsInfo
											? {
													id: modem.id,
													name: modem.name,
													status: modem.status,
													position: {
														lat: parseFloat(gpsInfo.lat),
														lng: parseFloat(gpsInfo.lon),
													},
												}
											: null;
									})
									.filter(Boolean)
							);

							return (
								<div className='map-container'>
									{modemLocations.length > 0 ? (
										<APIProvider apiKey={googleMapsApiKey}>
											<Map
												defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
												defaultZoom={4}
												gestureHandling={'greedy'}
												disableDefaultUI={false}
												onLoad={() => setMapLoaded(true)}
											>
												{mapLoaded &&
													modemLocations.map((modem) => (
														<Marker
															key={modem.id}
															position={modem.position}
															title={modem.name}
														/>
													))}
											</Map>
										</APIProvider>
									) : (
										<div className='empty-state card'>
											<h3>No Location Data</h3>
											<p>GPS data is not available for any modems.</p>
										</div>
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
