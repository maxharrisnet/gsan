// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link, useFetcher } from '@remix-run/react';
import { Suspense, useState, useEffect, useMemo, useRef } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { useUser } from '../context/UserContext';
import { ClientOnly } from 'remix-utils/client-only';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

// Add retry logic for data fetching with better error handling
const fetchWithRetry = async (fn, retries = 3, delay = 1000) => {
	let lastError;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			console.warn(`⚠️ Attempt ${attempt}/${retries} failed:`, error.message);

			if (attempt < retries) {
				await new Promise((resolve) => setTimeout(resolve, delay * attempt));
			}
		}
	}

	throw lastError;
};

export async function loader({ request }) {
	try {
		const accessToken = await getCompassAccessToken();
		if (!accessToken) {
			throw new Error('Failed to obtain access token');
		}

		const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
		if (!googleMapsApiKey) {
			throw new Error('Google Maps API key is not configured');
		}

		// Defer the services data loading
		const servicesPromise = fetchServicesAndModemData()
			.then(({ services }) => {
				// Update services to determine status based on latency data
				const updatedServices = services.map((service) => ({
					...service,
					modems: service.modems?.map((modem) => ({
						...modem,
						// Modem is online if it has latency data
						status: modem.details?.data?.latency ? 'online' : 'offline',
					})),
				}));

				return { services: updatedServices };
			})
			.catch((error) => {
				console.error('🍎 Error fetching services:', error);
				return { services: [] };
			});

		return defer({
			servicesData: servicesPromise,
			mapsAPIKey: googleMapsApiKey,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading data', { status: 500 });
	}
}

function DashboardMap({ mapsAPIKey, services, gpsFetcher, selectedModem, onSelectModem }) {
	const [map, setMap] = useState(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// Calculate map center based on first modem with GPS data
	const mapPosition = useMemo(() => {
		if (selectedModem) {
			const gpsData = gpsFetcher.data?.data?.[selectedModem.id]?.[0];
			if (gpsData) {
				const lat = parseFloat(gpsData.lat);
				const lng = parseFloat(gpsData.lon);
				if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
					return { lat, lng };
				}
			}
		}
		return { lat: 56.1304, lng: -106.3468 }; // Default Canada center
	}, [selectedModem, gpsFetcher.data]);

	// Reset initialization when selected modem changes
	useEffect(() => {
		setIsInitialized(false);
	}, [selectedModem?.id]);

	// Handle map updates when position changes
	useEffect(() => {
		if (map && mapPosition && !isInitialized) {
			console.log('🎯 Centering map on:', mapPosition);
			map.panTo(mapPosition);
			setIsInitialized(true);
		}
	}, [map, mapPosition, isInitialized]);

	return (
		<APIProvider apiKey={mapsAPIKey}>
			<Map
				onLoad={(map) => setMap(map)}
				style={{ width: '100%', height: '100vh' }}
				defaultCenter={mapPosition}
				defaultZoom={4}
				options={{
					gestureHandling: 'greedy',
					minZoom: 3,
					maxZoom: 18,
					restriction: {
						latLngBounds: {
							north: 83.5,
							south: 41.7,
							west: -141,
							east: -52.6,
						},
						strictBounds: true,
					},
					zoomControl: true,
					scrollwheel: true,
					draggable: true,
					mapTypeControl: false,
					scaleControl: true,
					streetViewControl: false,
					rotateControl: false,
					fullscreenControl: false,
					backgroundColor: '#e8d8c3',
					clickableIcons: false,
				}}
			>
				{services.map((service) =>
					service.modems?.map((modem) => {
						const gpsData = gpsFetcher.data?.data?.[modem.id]?.[0];
						if (!gpsData) return null;

						const lat = parseFloat(gpsData.lat);
						const lng = parseFloat(gpsData.lon);
						if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

						return (
							<Marker
								key={modem.id}
								position={{ lat, lng }}
								onClick={() => onSelectModem(modem)}
								icon={{
									url: `/assets/images/markers/pin-${modem.details?.data?.latency ? 'online' : 'offline'}.svg`,
									scaledSize: { width: 32, height: 40 },
									anchor: { x: 16, y: 40 },
								}}
							/>
						);
					})
				)}

				{selectedModem && gpsFetcher.data?.data?.[selectedModem.id]?.[0] && (
					<InfoWindow
						position={{
							lat: parseFloat(gpsFetcher.data.data[selectedModem.id][0].lat),
							lng: parseFloat(gpsFetcher.data.data[selectedModem.id][0].lon),
						}}
						onCloseClick={() => onSelectModem(null)}
					>
						<div className='info-window'>
							<h3>{selectedModem.name}</h3>
							<p>Status: {selectedModem.details?.data?.latency ? 'Online' : 'Offline'}</p>
							<Link to={`/modem/${selectedModem.type.toLowerCase()}/${selectedModem.id}`}>View Details</Link>
						</div>
					</InfoWindow>
				)}
			</Map>
		</APIProvider>
	);
}

export default function Dashboard() {
	const { servicesData, mapsAPIKey } = useLoaderData();
	const { userKits } = useUser();
	const [selectedModem, setSelectedModem] = useState(null);
	const gpsFetcher = useFetcher();

	// Get all modem IDs for GPS fetching
	const modemIds = useMemo(() => {
		if (!servicesData?.services) return [];
		return servicesData.services
			.flatMap((service) => service.modems || [])
			.filter((modem) => userKits.includes('ALL') || userKits.includes(modem.id))
			.map((modem) => modem.id);
	}, [servicesData?.services, userKits]);

	// Fetch GPS data
	useEffect(() => {
		if (modemIds.length && !gpsFetcher.data && gpsFetcher.state !== 'loading') {
			gpsFetcher.load(`/api/gps/query?modemIds=${modemIds.join(',')}`);
		}
	}, [modemIds]);

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<Suspense fallback={<LoadingSpinner />}>
						<Await resolve={servicesData}>
							{(resolvedData) => {
								const { services } = resolvedData;
								const showAllModems = userKits.includes('ALL');

								const filteredServices = services
									.map((service) => ({
										...service,
										modems: service.modems?.filter((modem) => showAllModems || userKits.includes(modem.id)) || [],
									}))
									.filter((service) => service.modems.length > 0);

								return (
									<ul className='modem-list'>
										{filteredServices.flatMap((service) =>
											service.modems?.map((modem) => (
												<li
													key={modem.id}
													className={`modem-item ${modem.details?.data?.latency ? 'online' : 'offline'}`}
												>
													<Link
														className='list-button'
														to={`/modem/${modem.type.toLowerCase()}/${modem.id}`}
														prefetch='intent'
													>
														<span className='modem-name'>{modem.name}</span>
														<span className={`status-indicator ${modem.details?.data?.latency ? 'online' : 'offline'}`} />
														<span className='modem-chevron material-icons'>chevron_right</span>
													</Link>
												</li>
											))
										)}
									</ul>
								);
							}}
						</Await>
					</Suspense>
				</div>
			</Sidebar>
			<main className='content content-full-width'>
				<Suspense fallback={<LoadingSpinner />}>
					<Await
						resolve={servicesData}
						errorElement={
							<div className='error-container'>
								<h3>Error loading map data</h3>
								<button onClick={() => window.location.reload()}>Retry Loading</button>
							</div>
						}
					>
						{(resolvedData) => (
							<ClientOnly fallback={<LoadingSpinner />}>
								{() => (
									<DashboardMap
										mapsAPIKey={mapsAPIKey}
										services={resolvedData.services}
										gpsFetcher={gpsFetcher}
										selectedModem={selectedModem}
										onSelectModem={setSelectedModem}
									/>
								)}
							</ClientOnly>
						)}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
}
