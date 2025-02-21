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

		// Add console logs for debugging
		console.log('🔑 Google Maps API Key:', googleMapsApiKey ? 'Present' : 'Missing');

		const servicesPromise = fetchServicesAndModemData()
			.then(async ({ services }) => {
				console.log('🌍 Initial services data:', services);

				const modemsByProvider = services.reduce((acc, service) => {
					(service.modems || []).forEach((modem) => {
						if (modem.type) {
							acc[modem.type.toLowerCase()] = acc[modem.type.toLowerCase()] || [];
							acc[modem.type.toLowerCase()].push(modem.id);
						}
					});
					return acc;
				}, {});

				console.log('📡 Modems grouped by provider:', modemsByProvider);

				const gpsDataPromises = Object.entries(modemsByProvider).map(async ([provider, ids]) => {
					try {
						console.log(`🗺️ Fetching GPS for ${provider} with IDs:`, ids);
						const gpsData = await fetchGPS(provider, ids, accessToken);
						console.log(`✅ GPS data received for ${provider}:`, gpsData);
						return { provider, data: gpsData };
					} catch (error) {
						console.error(`🚨 GPS fetch error for ${provider}:`, error);
						return { provider, data: {} };
					}
				});

				const gpsResults = await Promise.all(gpsDataPromises);
				console.log('🌎 All GPS results:', gpsResults);

				const gpsDataMap = gpsResults.reduce((acc, { data }) => ({ ...acc, ...data }), {});
				console.log('🗺️ Final GPS data map:', gpsDataMap);

				return {
					services,
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

// Add status-based marker icons
const getMarkerIcon = (status) => {
	const statusMap = {
		online: 'pin-online.svg',
		offline: 'pin-offline.svg',
		warning: 'pin-warning.svg',
		default: 'pin-default.svg',
	};
	return `/assets/images/markers/${statusMap[status?.toLowerCase()] || statusMap.default}`;
};

export default function Dashboard() {
	const { servicesData, googleMapsApiKey } = useLoaderData();
	const { userKits } = useUser();
	const [selectedModem, setSelectedModem] = useState(null);

	// Add map state management
	const [mapInstance, setMapInstance] = useState(null);
	const [bounds, setBounds] = useState(null);

	// Function to fit map to markers
	const fitMapToBounds = (locations) => {
		if (mapInstance && locations.length > 0) {
			const bounds = new google.maps.LatLngBounds();
			locations.forEach((location) => {
				bounds.extend(location.position);
			});
			mapInstance.fitBounds(bounds);
		}
	};

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
												// If userKits includes 'ALL', grant access to all modems
												if (userKits.includes('ALL')) {
													console.log(`📡 Modem ${modem.id}: Access granted (ALL)`);
													return true;
												}

												const hasAccess = userKits.includes(modem.id);
												console.log(`�� Modem ${modem.id}: ${hasAccess ? 'Has Access' : 'No Access'}`);
												return hasAccess;
											}) || [],
									}))
									.filter((service) => service.modems.length > 0);

								console.log('🔍 Filtered Services:', filteredServices);

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
							console.log('🗺️ Map Page GPS Data:', gpsData);

							if (!services || !Array.isArray(services) || services.length === 0) {
								return (
									<div className='empty-state card'>
										<h3>No Services Available</h3>
										<p>No active services found for this account.</p>
									</div>
								);
							}

							// Filter modems and get their locations
							const modemLocations = services.flatMap((service) => {
								console.log('🏢 Processing service:', service.name || 'Unknown Service');
								return (service.modems || [])
									.filter((modem) => {
										const hasAccess = userKits.includes(modem.id);
										console.log(`📡 Modem ${modem.id}: ${hasAccess ? 'Has Access' : 'No Access'}`);
										return hasAccess;
									})
									.map((modem) => {
										const gpsInfo = gpsData[modem.id]?.[0];
										console.log(`🗺️ GPS Info for ${modem.id}:`, gpsInfo);

										if (!gpsInfo) {
											console.log(`⚠️ No GPS data found for modem ${modem.id}`);
											return null;
										}

										if (!gpsInfo.lat || !gpsInfo.lon) {
											console.log(`⚠️ Invalid GPS coordinates for modem ${modem.id}:`, gpsInfo);
											return null;
										}

										return {
											id: modem.id,
											name: modem.name,
											status: modem.status,
											type: modem.type,
											position: {
												lat: parseFloat(gpsInfo.lat),
												lng: parseFloat(gpsInfo.lon),
											},
										};
									})
									.filter(Boolean);
							});

							console.log('📍 Final modem locations:', modemLocations);

							// Get the first modem's position for center, or use default Canada center
							const defaultCenter = { lat: 56.1304, lng: -106.3468 }; // Canada center
							const mapCenter = modemLocations[0]?.position || defaultCenter;
							const mapZoom = modemLocations[0]?.position ? 12 : 12; // Zoom closer if we have a modem

							return (
								<div className='map-wrapper'>
									{modemLocations.length > 0 && (
										<section className='map-section'>
											<div className='map-container'>
												{console.log(`Google Maps API Key:`, googleMapsApiKey)}

												<APIProvider apiKey={googleMapsApiKey}>
													<Map
														defaultCenter={mapCenter}
														defaultZoom={mapZoom}
														gestureHandling={'greedy'}
														disableDefaultUI={false}
														onLoad={(map) => {
															setMapInstance(map);
															fitMapToBounds(modemLocations);
														}}
													>
														{modemLocations.map((modem) => (
															<Marker
																key={modem.id}
																position={modem.position}
																title={modem.name}
																icon={{
																	url: getMarkerIcon(modem.status),
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
																	<p className={`status status-${selectedModem.status?.toLowerCase()}`}>Status: {selectedModem.status}</p>
																	<p>
																		Coordinates: {selectedModem.position.lat.toFixed(6)}, {selectedModem.position.lng.toFixed(6)}
																	</p>
																	{selectedModem.type && (
																		<Link
																			to={`/modem/${selectedModem.type.toLowerCase()}/${selectedModem.id}`}
																			className='info-window-link'
																		>
																			View Details
																			<span className='material-icons'>chevron_right</span>
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
