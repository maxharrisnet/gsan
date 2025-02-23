// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense, useState, useEffect, useMemo } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
import { loader as modemApiLoader } from './api.modem';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import LoadingSpinner from '../components/LoadingSpinner';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import dashboardStyles from '../styles/performance.css?url';
import { useUser } from '../context/UserContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader({ request }) {
	try {
		const accessToken = await getCompassAccessToken();
		const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
		const { services } = await fetchServicesAndModemData();

		// Group modem IDs by provider to minimize GPS API calls
		const modemsByProvider = services.reduce((acc, service) => {
			(service.modems || []).forEach((modem) => {
				if (modem.type) {
					const provider = modem.type.toLowerCase();
					acc[provider] = acc[provider] || [];
					acc[provider].push(modem.id);
				}
			});
			return acc;
		}, {});

		// Fetch both GPS and status data for all modems
		const [gpsResults, statusResults] = await Promise.all([
			Promise.all(
				Object.entries(modemsByProvider).map(async ([provider, ids]) => {
					try {
						const data = await fetchGPS(provider, ids, accessToken);
						return { provider, data };
					} catch (error) {
						console.error(`🚨 GPS fetch error for ${provider}:`, error);
						return { provider, data: {} };
					}
				})
			),

			Promise.all(
				Object.entries(modemsByProvider).flatMap(([provider, ids]) =>
					ids.map(async (modemId) => {
						try {
							const modemResponse = await modemApiLoader({
								params: { provider, modemId },
								request,
							});
							const data = await modemResponse.json();
							return { modemId, status: data.status };
						} catch (error) {
							console.error(`🔴 Error fetching status for modem ${modemId}:`, error);
							return { modemId, status: 'offline' };
						}
					})
				)
			),
		]);

		const gpsData = gpsResults.reduce((acc, { data }) => ({ ...acc, ...data }), {});

		const statusLookup = statusResults.reduce((acc, { modemId, status }) => {
			acc[modemId] = status;
			return acc;
		}, {});

		const servicesWithStatus = services.map((service) => ({
			...service,
			modems: service.modems?.map((modem) => ({
				...modem,
				status: statusLookup[modem.id] || 'offline',
			})),
		}));

		return defer({
			servicesData: {
				services: servicesWithStatus,
				gpsData,
			},
			googleMapsApiKey,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

export default function Dashboard() {
	const { servicesData, googleMapsApiKey } = useLoaderData();
	const { userKits } = useUser();
	const [selectedModem, setSelectedModem] = useState(null);

	const modemLocations = useMemo(() => {
		if (!servicesData?.services) return [];

		const showAllModems = userKits.includes('ALL');

		return servicesData.services.flatMap((service) =>
			(service.modems || [])
				.filter((modem) => showAllModems || userKits.includes(modem.id))
				.map((modem) => {
					const gpsInfo = servicesData.gpsData?.[modem.id]?.[0];
					return gpsInfo
						? {
								id: modem.id,
								name: modem.name,
								status: modem.status || 'offline',
								type: modem.type,
								position: {
									lat: parseFloat(gpsInfo.lat),
									lng: parseFloat(gpsInfo.lon),
								},
							}
						: null;
				})
				.filter(Boolean)
		);
	}, [servicesData, userKits]);

	// Update mapConfig to include North America bounds
	const mapConfig = useMemo(
		() => ({
			center: modemLocations[0]?.position || { lat: 56.1304, lng: -106.3468 }, // Center of Canada
			zoom: modemLocations[0]?.position ? 6 : 4,
			restriction: {
				latLngBounds: {
					north: 83.5, // Northern edge of Canadian territory (including Arctic islands)
					south: 41.7, // Southern edge of Canada
					west: -141, // Western edge of Canada (Alaska border)
					east: -52.6, // Eastern edge of Canada (Newfoundland)
				},
				strictBounds: true,
			},
		}),
		[modemLocations]
	);

	// Handle GPS data caching on the client side
	useEffect(() => {
		const handleGPSData = async (resolvedData) => {
			if (resolvedData?.gpsData) {
				try {
					localStorage.setItem(
						'shared_gps_cache',
						JSON.stringify({
							timestamp: Date.now(),
							data: resolvedData.gpsData,
						})
					);
					console.log('📱 GPS data cached in localStorage');
				} catch (error) {
					console.error('🚨 Error caching GPS data:', error);
				}
			}
		};

		// Subscribe to when data is resolved
		if (servicesData instanceof Promise) {
			servicesData.then(handleGPSData);
		}
	}, [servicesData]);

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<Suspense fallback={<LoadingSpinner />}>
						<Await resolve={servicesData}>
							{(resolvedData) => {
								const { services } = resolvedData;
								const showAllModems = userKits.includes('ALL');

								// Filter modems based on userKits
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

							return (
								<div className=''>
									{modemLocations.length > 0 && (
										<section className='map-section'>
											<div className='map-container'>
												<APIProvider apiKey={googleMapsApiKey}>
													<Map
														defaultCenter={mapConfig.center}
														defaultZoom={mapConfig.zoom}
														gestureHandling={'greedy'}
														disableDefaultUI={false}
														restriction={mapConfig.restriction}
														minZoom={3} // Prevent zooming out too far
													>
														{modemLocations.map((modem) => (
															<Marker
																key={modem.id}
																position={modem.position}
																title={modem.name}
																icon={{
																	url: `/assets/images/markers/pin-${modem.status || 'offline'}.svg`,
																	scaledSize: { width: 32, height: 40 },
																	anchor: { x: 16, y: 40 },
																}}
																onClick={() => setSelectedModem(modem)}
															/>
														))}

														{selectedModem && (
															<InfoWindow
																position={selectedModem.position}
																onCloseClick={() => setSelectedModem(null)}
															>
																<div className='info-window'>
																	<h3>{selectedModem.name}</h3>
																	<p>Status: {selectedModem.status}</p>
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
												</APIProvider>
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
