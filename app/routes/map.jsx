// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link, useFetcher } from '@remix-run/react';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from '../api/api.gps';
import { loader as modemApiLoader } from '../api/api.modem';
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

		// Fetch services with retry logic
		const servicesPromise = fetchWithRetry(async () => {
			const { services } = await fetchServicesAndModemData();
			if (!services || !Array.isArray(services)) {
				throw new Error('Invalid services data received');
			}
			return services;
		});

		// Group modem IDs by provider with validation
		const modemsByProvider = await servicesPromise.then((services) => {
			const grouped = services.reduce((acc, service) => {
				if (!service.modems) return acc;

				service.modems.forEach((modem) => {
					if (modem?.id && modem?.type) {
						const provider = modem.type.toLowerCase();
						acc[provider] = acc[provider] || [];
						acc[provider].push(modem.id);
					}
				});
				return acc;
			}, {});

			if (Object.keys(grouped).length === 0) {
				console.warn('⚠️ No valid modems found in services');
			}
			return grouped;
		});

		// Fetch both GPS and status data with improved error handling
		const [gpsResults, statusResults] = await Promise.all([
			// GPS data fetching with provider-specific error handling
			Promise.all(
				Object.entries(modemsByProvider).map(async ([provider, ids]) => {
					try {
						const data = await fetchGPS(provider, ids, accessToken);
						return { provider, data, error: null };
					} catch (error) {
						console.error(`🔴 GPS fetch error for ${provider}:`, error);
						return {
							provider,
							data: {},
							error: {
								message: error.message,
								timestamp: new Date().toISOString(),
								provider,
								ids,
							},
						};
					}
				})
			),

			// Status data fetching with individual modem error handling
			Promise.all(
				Object.entries(modemsByProvider).flatMap(([provider, ids]) =>
					ids.map(async (modemId) => {
						try {
							const modemResponse = await modemApiLoader({
								params: { provider, modemId },
								request,
							});

							if (!modemResponse.ok) {
								throw new Error(`HTTP ${modemResponse.status}: ${modemResponse.statusText}`);
							}

							const data = await modemResponse.json();
							return {
								modemId,
								status: data.error ? 'offline' : data.status || 'offline',
								error: data.error ? data.details : null,
							};
						} catch (error) {
							console.error(`🔴 Status fetch error for modem ${modemId}:`, error);
							return {
								modemId,
								status: 'offline',
								error: {
									message: error.message,
									timestamp: new Date().toISOString(),
									provider,
									modemId,
								},
							};
						}
					})
				)
			),
		]);

		// Combine GPS data with error tracking
		const gpsData = gpsResults.reduce(
			(acc, { data, error }) => ({
				...acc,
				...data,
				...(error ? { _errors: [...(acc._errors || []), error] } : {}),
			}),
			{}
		);

		// Create status lookup with error tracking
		const statusLookup = statusResults.reduce((acc, { modemId, status, error }) => {
			acc[modemId] = status;
			if (error) {
				acc._errors = [...(acc._errors || []), error];
			}
			return acc;
		}, {});

		// Combine services with status data
		const servicesWithStatus = await servicesPromise.then((services) =>
			services.map((service) => ({
				...service,
				modems: service.modems?.map((modem) => ({
					...modem,
					status: statusLookup[modem.id] || 'offline',
					hasError: Boolean(statusLookup._errors?.find((e) => e.modemId === modem.id)),
				})),
			}))
		);

		return defer({
			servicesData: {
				services: servicesWithStatus,
				gpsData,
				errors: {
					gps: gpsData._errors || [],
					status: statusLookup._errors || [],
				},
			},
			googleMapsApiKey,
		});
	} catch (error) {
		console.error('🚨 Critical error in map loader:', error);
		return json(
			{
				error: true,
				message: 'Failed to load map data',
				details: {
					timestamp: new Date().toISOString(),
					errorType: error.name,
					message: error.message,
				},
			},
			{ status: 500 }
		);
	}
}

// Create a separate Map component for client-side rendering
function DashboardMap({ googleMapsApiKey, modemLocations, onSelectModem, selectedModem }) {
	const mapConfig = useMemo(
		() => ({
			center: modemLocations[0]?.position || { lat: 56.1304, lng: -106.3468 },
			zoom: modemLocations[0]?.position ? 4 : 3,
			options: {
				gestureHandling: 'cooperative',
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
				backgroundColor: '#f8f9fa',
				clickableIcons: false,
			},
		}),
		[modemLocations]
	);

	return (
		<APIProvider apiKey={googleMapsApiKey}>
			<div className='map-container'>
				<Map {...mapConfig}>
					{modemLocations.map((modem) => (
						<Marker
							key={modem.id}
							position={modem.position}
							title={modem.name}
							icon={{
								url: `/assets/images/markers/pin-${modem.status}.svg`,
								scaledSize: { width: 32, height: 40 },
								anchor: { x: 16, y: 40 },
							}}
							options={{
								optimized: true,
								zIndex: 1000,
								clickable: true,
							}}
							onClick={() => onSelectModem(modem)}
						/>
					))}

					{selectedModem && (
						<InfoWindow
							position={selectedModem.position}
							onCloseClick={() => onSelectModem(null)}
						>
							<div className='info-window'>
								<h3>{selectedModem.name}</h3>
								<p>Status: {selectedModem.status}</p>
								<p>Last Update: {selectedModem.lastUpdate.toLocaleString()}</p>
								<p>Lat: {selectedModem.position.lat.toFixed(6)}</p>
								<p>Lng: {selectedModem.position.lng.toFixed(6)}</p>
								{selectedModem.type && (
									<Link
										to={`/modem/${selectedModem.type.toLowerCase()}/${selectedModem.id}`}
										className='info-window-link'
									>
										<span className='modem-name'>{selectedModem.name.toUpperCase()}</span>
										<span className='modem-chevron material-icons'>chevron_right</span>
									</Link>
								)}
							</div>
						</InfoWindow>
					)}
				</Map>
			</div>
		</APIProvider>
	);
}

export default function Dashboard() {
	const { servicesData, googleMapsApiKey, error } = useLoaderData();
	const { userKits } = useUser();
	const [selectedModem, setSelectedModem] = useState(null);
	const gpsFetcher = useFetcher();

	// Memoize the modem IDs
	const modemIds = useMemo(() => {
		if (!servicesData?.services) return [];

		return servicesData.services
			.flatMap((service) => service.modems || [])
			.filter((modem) => userKits.includes('ALL') || userKits.includes(modem.id))
			.map((modem) => modem.id);
	}, [servicesData?.services, userKits]);

	// Fetch GPS data once
	useEffect(() => {
		if (modemIds.length > 0 && !gpsFetcher.data && gpsFetcher.state !== 'loading') {
			gpsFetcher.load(`/api/gps/query?modemIds=${modemIds.join(',')}`);
		}
	}, [modemIds]);

	// Memoize modem locations
	const modemLocations = useMemo(() => {
		if (!servicesData?.services || !gpsFetcher.data?.data) return [];

		const showAllModems = userKits.includes('ALL');
		const gpsData = gpsFetcher.data.data;

		return servicesData.services.flatMap((service) =>
			(service.modems || [])
				.filter((modem) => showAllModems || userKits.includes(modem.id))
				.map((modem) => {
					const gpsInfo = gpsData[modem.id]?.[0];
					if (!gpsInfo) return null;

					const lat = parseFloat(gpsInfo.lat);
					const lng = parseFloat(gpsInfo.lon);

					if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return null;

					return {
						id: modem.id,
						name: modem.name,
						status: modem.status || 'offline',
						type: modem.type,
						position: { lat, lng },
						lastUpdate: new Date(gpsInfo.timestamp * 1000),
					};
				})
				.filter(Boolean)
		);
	}, [servicesData?.services, gpsFetcher.data, userKits]);

	// Handle critical errors
	if (error) {
		return (
			<Layout>
				<div className='error-container'>
					<h2>Error Loading Map</h2>
					<p>{servicesData?.message || 'An unexpected error occurred'}</p>
					<button onClick={() => window.location.reload()}>Retry Loading</button>
				</div>
			</Layout>
		);
	}

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

								return filteredServices.length > 0 ? (
									<ul className='modem-list'>
										{filteredServices.flatMap((service) =>
											service.modems?.map((modem) => (
												<li
													key={modem.id}
													className={`modem-item status-${modem.status?.toLowerCase()}`}
												>
													<Link
														className='list-button'
														to={`/modem/${modem.type.toLowerCase()}/${modem.id}`}
														prefetch='intent'
													>
														<span className='modem-name'>{modem.name}</span>
														<span
															className={`status-indicator ${modem.status || 'offline'}`}
															title={`Status: ${modem.status || 'offline'}`}
														/>
														<span className='modem-chevron material-icons'>chevron_right</span>
													</Link>
												</li>
											))
										)}
									</ul>
								) : (
									<div className='empty-sidebar'>
										<p>No modems found in your kits</p>
									</div>
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
								<h3>Error loading dashboard data</h3>
								<button onClick={() => window.location.reload()}>Retry Loading</button>
							</div>
						}
					>
						{() => (
							<>
								{gpsFetcher.state === 'loading' && (
									<div className='loading-overlay'>
										<LoadingSpinner />
									</div>
								)}

								<ClientOnly fallback={<LoadingSpinner />}>
									{() => (
										<DashboardMap
											googleMapsApiKey={googleMapsApiKey}
											modemLocations={modemLocations}
											selectedModem={selectedModem}
											onSelectModem={setSelectedModem}
										/>
									)}
								</ClientOnly>
							</>
						)}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
}
