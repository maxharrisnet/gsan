// app/routes/performance.jsx
import { defer } from '@remix-run/node';
import { useLoaderData, Await, Link } from '@remix-run/react';
import { Suspense, useState } from 'react';
import { fetchServicesAndModemData, getCompassAccessToken } from '../compass.server';
import { fetchGPS } from './api.gps';
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
	console.log('🗺️ Google Maps API Key:', googleMapsApiKey);
	const { userKits } = useUser();
	const [selectedModem, setSelectedModem] = useState(null);

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<Suspense fallback={<LoadingSpinner />}>
						<Await resolve={servicesData}>
							{(resolvedData) => {
								const { services } = resolvedData;

								// Filter modems based on userKits
								const filteredServices = services
									.map((service) => ({
										...service,
										modems:
											service.modems?.filter((modem) => {
												// Handle null/undefined userKits
												if (!Array.isArray(userKits)) {
													console.warn('🚨 userKits is not an array:', userKits);
													return false;
												}

												// If userKits includes 'ALL', return all modems
												if (userKits.includes('ALL')) {
													return true;
												}

												// Ensure modem.id exists before comparison
												if (!modem?.id) {
													console.warn('⚠️ Modem missing ID:', modem);
													return false;
												}

												return userKits.includes(modem.id);
											}) || [],
									}))
									.filter((service) => service.modems.length > 0);

								console.log('🎯 Filtered services:', filteredServices.length);
								console.log('🔑 UserKits config:', userKits.includes('ALL') ? 'ALL ACCESS' : 'Limited Access');

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

							// Filter modems and get their locations
							const modemLocations = services.flatMap((service) =>
								(service.modems || [])
									.filter((modem) => userKits.includes(modem.id)) // Filter by user's kits
									.map((modem) => {
										const gpsInfo = gpsData[modem.id]?.[0];
										return gpsInfo
											? {
													id: modem.id,
													name: modem.name,
													status: modem.status,
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

							// Get the first modem's position for center, or use default Canada center
							const defaultCenter = { lat: 56.1304, lng: -106.3468 }; // Canada center
							const mapCenter = modemLocations[0]?.position || defaultCenter;
							const mapZoom = modemLocations[0]?.position ? 12 : 12; // Zoom closer if we have a modem

							return (
								<div className=''>
									{modemLocations.length > 0 && (
										<section className='map-section'>
											<div className='map-container'>
												<APIProvider apiKey={googleMapsApiKey}>
													<Map
														defaultCenter={mapCenter}
														defaultZoom={mapZoom}
														gestureHandling={'greedy'}
														disableDefaultUI={false}
													>
														{modemLocations.map((modem) => (
															<Marker
																key={modem.id}
																position={modem.position}
																title={modem.name}
																icon={{
																	url: `/assets/images/markers/pin-online.svg`,
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
