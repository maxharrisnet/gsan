import { useEffect, useRef, Suspense, useMemo, useState } from 'react';
import { useLoaderData, Link, Await, useRouteError, isRouteErrorResponse, useFetcher } from '@remix-run/react';
import { loader as modemApiLoader } from '../api/api.modem';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Filler, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import chartStyles from '../styles/charts.css?url';
import modemStyles from '../styles/modem.css?url';
import { useUser } from '../context/UserContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { defer } from '@remix-run/node';
import { fetchServicesAndModemData } from '../compass.server';
import { ClientOnly } from 'remix-utils/client-only';

export const links = () => [
	{ rel: 'stylesheet', href: chartStyles },
	{ rel: 'stylesheet', href: modemStyles },
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
	},
];

export async function loader({ params, request }) {
	try {
		// Get current modem details from the existing API loader
		const modemDetails = await modemApiLoader({ params, request });
		const data = await modemDetails.json();

		const servicesPromise = fetchServicesAndModemData()
			.then(({ services }) => {
				// Update services to determine status based on latency data
				const updatedServices = services.map((service) => ({
					...service,
					modems: service.modems?.map((modemItem) => ({
						...modemItem,
						// Modem is online if it has latency data
						status: modemItem.details?.data?.latency ? 'online' : 'offline',
					})),
				}));

				return { services: updatedServices };
			})
			.catch((error) => {
				console.error('🍎 Error fetching modem:', error);
				return { services: [] };
			});

		// Return both sets of data
		return defer({
			servicesData: servicesPromise,
			...data,
		});
	} catch (error) {
		console.error('🚨 Error in loader:', error);
		throw new Response('Error loading data', { status: 500 });
	}
}

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Filler, Title, Tooltip, Legend, ArcElement);

// Update the timestamp formatting function
const formatTimestamp = (timestamp) => {
	return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
};

// Add these map options outside the component
const mapOptions = {
	gestureHandling: 'greedy',
	disableDefaultUI: true,
	minZoom: 3,
	maxZoom: 18,
};

// Create a separate Map component to handle client-side rendering
function ModemMap({ mapsAPIKey, modem, gpsFetcher }) {
	const mapPosition = useMemo(() => {
		const gpsData = gpsFetcher.data?.data?.[modem.id]?.[0];

		if (gpsData) {
			const lat = parseFloat(gpsData.lat);
			const lng = parseFloat(gpsData.lon);

			if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
				return { lat, lng };
			}
		}

		return { lat: 56.1304, lng: -106.3468 }; // Default Canada center
	}, [modem?.id, gpsFetcher.data?.data]);

	return (
		<APIProvider apiKey={mapsAPIKey}>
			<Map
				style={{ width: '100%', height: '60vh' }}
				center={mapPosition}
				zoom={6}
				options={{
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
				}}
			>
				{gpsFetcher.state === 'loading' && (
					<div className='map-loading-overlay'>
						<LoadingSpinner />
					</div>
				)}

				{gpsFetcher.data?.data?.[modem.id]?.[0] && (
					<Marker
						position={mapPosition}
						icon={{
							url: `/assets/images/markers/pin-online.svg`,
							scaledSize: { width: 32, height: 40 },
							anchor: { x: 16, y: 40 },
						}}
						options={{
							optimized: true,
							zIndex: 1000,
							clickable: true,
						}}
					/>
				)}
			</Map>
		</APIProvider>
	);
}

export default function ModemDetails() {
	const { error, details, modem = {}, mapsAPIKey, latencyData = [], throughputData = [], signalQualityData = [], obstructionData = [], usageData = [], uptimeData = [], servicesData } = useLoaderData();
	const { userKits } = useUser();
	const gpsFetcher = useFetcher();

	const usageChartRef = useRef(null);
	const signalQualityChartRef = useRef(null);
	const throughputChartRef = useRef(null);
	const latencyChartRef = useRef(null);
	const obstructionChartRef = useRef(null);
	const uptimeChartRef = useRef(null);

	useEffect(() => {
		const charts = {
			usage: usageChartRef.current,
			signal: signalQualityChartRef.current,
			throughput: throughputChartRef.current,
			latency: latencyChartRef.current,
			obstruction: obstructionChartRef.current,
			uptime: uptimeChartRef.current,
		};

		return () => {
			// Use captured values in cleanup
			Object.values(charts).forEach((chart) => chart?.destroy());
		};
	}, []);

	useEffect(() => {
		if (modem?.id && !gpsFetcher.data && gpsFetcher.state !== 'loading') {
			gpsFetcher.load(`/api/gps/query?modemIds=${modem.id}`);
		}
	}, [modem?.id]);

	if (error) {
		return (
			<Layout>
				<Sidebar>
					<div className='dashboard-sidebar'>
						<h1 className='select-device-heading'>Switch</h1>
					</div>
				</Sidebar>
				<main className='content content-full-width qqq'>
					<div className='error-banner card'>
						<span className='material-icons'>error_outline</span>
						<div>
							<h2>Error Loading Modem Data</h2>
							<p>{details.message}</p>
							<div className='error-actions'>
								<button
									onClick={() => window.location.reload()}
									className='retry-button'
								>
									<span className='material-icons'>refresh</span>
									Retry
								</button>
							</div>
						</div>
					</div>
				</main>
			</Layout>
		);
	}

	const latencyTimestamps = latencyData?.map?.((entry) => formatTimestamp(entry[0])) || [];
	const throughputTimestamps = throughputData.map((entry) => formatTimestamp(entry[0]));
	const signalQualityLabels = signalQualityData.map((entry) => formatTimestamp(entry[0]));
	const obstructionLabels = obstructionData.map((entry) => formatTimestamp(entry[0]));
	const uptimeLabels = uptimeData.map((entry) => formatTimestamp(entry[0]));

	const latencyValues = latencyData?.map?.((entry) => entry[1]) || [];

	const throughputDownload = throughputData.map((entry) => entry[1]);
	const throughputUpload = throughputData.map((entry) => entry[2]);

	const signalQualityValues = signalQualityData.map((entry) => entry[1]);

	const obstructionValues = obstructionData.map((entry) => entry[1] * 100);

	const currentDate = new Date();
	const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

	const monthlyUsageData = usageData
		.filter((entry) => {
			const entryDate = new Date(entry.date);
			return entryDate >= startOfMonth && entryDate <= currentDate;
		})
		.sort((a, b) => new Date(a.date) - new Date(b.date)); // Ensure chronological order

	const usageLabels = [];
	const usagePriority = [];
	const usageUnlimited = [];

	monthlyUsageData.forEach((day) => {
		usageLabels.push(
			new Date(day.date).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
			})
		);
		usagePriority.push(day.priority ?? 0);
		usageUnlimited.push(day.unlimited ?? 0);
	});

	const uptimeValues = uptimeData.map((entry) => Math.ceil((entry[1] / 86400) * 10) / 10);

	// Update the usage calculations to properly parse the usage limit
	const usageLimit = parseFloat(modem?.meta?.usageLimit) || 0;
	const totalUsage = monthlyUsageData.reduce((sum, day) => {
		return sum + (parseFloat(day.priority) || 0) + (parseFloat(day.unlimited) || 0);
	}, 0);

	const totalUsageGB = totalUsage.toFixed(2);
	const usageLimitGB = usageLimit.toFixed(2);

	// Add a log to verify the parsed values

	// Set global defaults for Chart.js
	ChartJS.defaults.global = {
		...ChartJS.defaults.global,
		responsive: true,
		maintainAspectRatio: false,
		height: 200,
		plugins: {
			legend: {
				display: false,
				position: 'bottom',
			},
		},
		elements: {
			point: {
				radius: 0,
				hoverRadius: 5,
				hoverBorderWidth: 1,
				backgroundColor: '#3986a8',
				borderColor: '#3986a8',
			},
			bar: {
				backgroundColor: '#3986a8',
				borderWidth: 1,
			},
			line: {
				hitRadius: 15,
				borderCapStyle: 'round',
				borderColor: '#3986a8',
				borderWidth: 1,
				fill: true,
				fillColor: '#3986a8',
				fillTarget: 'origin',
			},
		},
	};

	ChartJS.defaults.global.height = 200;
	ChartJS.defaults.plugins.legend.display = false;
	ChartJS.defaults.plugins.legend.position = 'bottom';
	ChartJS.defaults.elements.point.radius = 0;
	ChartJS.defaults.elements.point.hoverRadius = 5;
	ChartJS.defaults.elements.point.hoverBorderWidth = 1;
	ChartJS.defaults.elements.point.backgroundColor = '#3986a8';
	ChartJS.defaults.elements.point.borderColor = '#3986a8';

	// Bar Chart Defaults
	ChartJS.defaults.elements.bar.backgroundColor = '#3986a8';
	ChartJS.defaults.elements.bar.borderWidth = 1;

	// Line Chart Defaults
	ChartJS.defaults.elements.line.hitRadius = 15;
	ChartJS.defaults.elements.line.borderCapStyle = 'round';
	ChartJS.defaults.elements.line.borderColor = '#3986a8';
	ChartJS.defaults.elements.line.borderWidth = 1;
	ChartJS.defaults.elements.line.fill = true;

	const renderChartSection = (title, data, chart, errorKey) => {
		if (error && errorKey === 'usageOverview') {
			return (
				<section className='section chart-wrapper'>
					<h2>{title}</h2>
					<div className='error-banner card'>
						<span className='material-icons'>error_outline</span>
						<p>Unable to load {title.toLowerCase()} data</p>
					</div>
				</section>
			);
		}

		if (!data || data.length === 0) {
			return (
				<section className='section chart-wrapper'>
					<h2>{title}</h2>
					<div className='no-data-message'>
						<span className='material-icons'>info_outline</span>
						<p>No {title.toLowerCase()} data available</p>
					</div>
				</section>
			);
		}

		return (
			<section className='section chart-wrapper'>
				<h2>{title}</h2>
				{chart}
			</section>
		);
	};

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<h2 className='select-device-heading'>Select a Modem</h2>

					<Suspense
						fallback={
							<div className='loading-container'>
								<LoadingSpinner />
							</div>
						}
					>
						<Await
							resolve={servicesData}
							errorElement={
								<div className='error-sidebar'>
									<span className='material-icons'>error_outline</span>
									<p>Failed to load devices</p>
								</div>
							}
						>
							{(resolvedData) => {
								if (!resolvedData?.services?.length) {
									return (
										<div className='empty-sidebar'>
											<p>No modems found in your kits</p>
										</div>
									);
								}

								const { services } = resolvedData;
								const filteredServices = services
									.map((service) => ({
										...service,
										modems: service.modems?.filter((modem) => userKits.includes('ALL') || userKits.some((kit) => kit === modem.id)) || [],
									}))
									.filter((service) => service.modems.length > 0);

								return (
									<ul className='modem-list'>
										{filteredServices.flatMap((service) =>
											service.modems?.map((modemItem) => (
												<li
													key={modemItem.id}
													className={`modem-item ${modemItem.id === modem.id ? 'active' : ''} status-${modemItem.status || 'offline'}`}
												>
													{modemItem.details?.data?.latency ? (
														<Link
															className='list-button'
															to={`/modem/${modemItem.type.toLowerCase()}/${modemItem.id}`}
															prefetch='intent'
														>
															<span className='modem-name'>{modemItem.name}</span>
															<span
																className='status-indicator online'
																title='Status: online'
															/>
															<span className='modem-chevron material-icons'>chevron_right</span>
														</Link>
													) : (
														<div className='list-button disabled'>
															<span className='modem-name'>{modemItem.name}</span>
															<span
																className='status-indicator offline'
																title='Status: offline'
															/>
															<span className='modem-chevron material-icons'>block</span>
														</div>
													)}
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

			<main className='content content-full-width xxx'>
				{!modem?.data && (
					<div className='error-banner card'>
						<span className='material-icons'>warning</span>
						<p>Limited data available for this modem</p>
					</div>
				)}

				<Suspense
					fallback={
						<div className='map-wrapper'>
							<LoadingSpinner />
						</div>
					}
				>
					<Await
						resolve={servicesData}
						errorElement={
							<div className='error-container'>
								<h3>Error loading modem data</h3>
								<button onClick={() => window.location.reload()}>Retry Loading</button>
							</div>
						}
					>
						{() => (
							<section className='map-wrapper'>
								<ClientOnly fallback={<LoadingSpinner />}>
									{() => (
										<ModemMap
											mapsAPIKey={mapsAPIKey}
											modem={modem}
											gpsFetcher={gpsFetcher}
										/>
									)}
								</ClientOnly>
							</section>
						)}
					</Await>
				</Suspense>

				<section className='chart-container'>
					<div className='overview-charts-container'>
						{renderChartSection(
							'Usage Overview',
							usageData,
							<div className='usage-stats'>
								<div className='usage-chart'>
									<Doughnut
										height='100'
										width='200'
										data={{
											labels: [`Usage: ${totalUsageGB} GB`, `Monthly Limit: ${usageLimitGB} GB`],
											datasets: [
												{
													data: [parseFloat(totalUsageGB), Math.max(parseFloat(usageLimitGB) - parseFloat(totalUsageGB), 0)],
													backgroundColor: ['#3986a8', '#f3f4f6'],
													borderWidth: 0,
													radius: '80%',
												},
											],
										}}
										options={{
											cutout: '70%',
											plugins: {
												legend: {
													display: true,
													position: 'top',
													labels: {
														padding: 20,
														usePointStyle: true,
														pointStyle: 'circle',
														font: { size: 14 },
													},
												},
												tooltip: {
													callbacks: {
														label: (context) => context.label,
													},
												},
											},
										}}
									/>
								</div>
								<div className='usage-disclaimer'>
									<p>Data usage for current month. Data usage tracking is not immediate and may be delayed by 24 hours or more.</p>
								</div>
							</div>,
							'usageOverview'
						)}

						{renderChartSection(
							'Current Signal Quality',
							signalQualityData,
							<div className='signal-quality-chart'>
								<Doughnut
									height='100'
									width='300'
									data={{
										labels: ['Signal Quality', 'Remaining'],
										datasets: [
											{
												data: [signalQualityData[signalQualityData.length - 1]?.[1] || 0, 100 - (signalQualityData[signalQualityData.length - 1]?.[1] || 0)],
												backgroundColor: ['#4bc0c0', '#f3f4f6'],
												borderWidth: 0,
												radius: '80%',
											},
										],
									}}
									options={{
										cutout: '70%',
										plugins: {
											legend: {
												display: true,
												position: 'top',
												labels: {
													padding: 20,
													usePointStyle: true,
													pointStyle: 'circle',
													font: { size: 14 },
													generateLabels: (chart) => [
														{
															text: `Signal Quality: ${signalQualityData[signalQualityData.length - 1]?.[1] || 0}%`,
															fillStyle: '#4bc0c0',
															strokeStyle: '#4bc0c0',
															pointStyle: 'circle',
															index: 0,
														},
													],
												},
											},
										},
									}}
								/>
							</div>,
							'signalQuality'
						)}
					</div>
					{renderChartSection(
						'Usage',
						usageData,
						<div className='usage-stats'>
							<div className='usage-chart'>
								<Bar
									height='100'
									width='300'
									data={{
										labels: usageLabels,
										datasets: [
											{ label: 'Download (GB)', data: usagePriority, fill: true, backgroundColor: '#3986a8', borderColor: '#3986a8', borderWidth: 2, borderJoinStyle: 'round' },
											{ label: 'Upload (GB)', data: usageUnlimited, fill: true, backgroundColor: '#4bc0c0', borderColor: '#4bc0c0', borderWidth: 2, borderJoinStyle: 'round' },
										],
									}}
									options={{
										plugins: {
											title: {
												display: true,
												text: [`Total Usage: ${totalUsage.toFixed(2)} GB`],
												padding: { bottom: 30 },
												font: { size: 12 },
												color: '#666',
											},
										},
										scales: {
											y: {
												ticks: { callback: (value) => `${value}GB`, stepSize: 5 },
												beginAtZero: true,
											},
										},
									}}
								/>
							</div>
							<div className='usage-disclaimer'>
								<p>Data usage tracking is not immediate and may be delayed by 24 hours or more. Counting shown is for informational purposes only and final overages reflected in monthly invoice are accurate.</p>
							</div>
						</div>,
						'usage'
					)}
					{renderChartSection(
						'Signal Quality',
						signalQualityData,
						<Line
							height='100'
							width='300'
							data={{
								labels: signalQualityLabels,
								datasets: [
									{
										label: 'Signal Quality (%)',
										data: signalQualityValues,
										fill: true,
										backgroundColor: 'rgba(57, 134, 168, 0.2)',
										borderColor: '#3986a8',
										borderWidth: 2,
										borderJoinStyle: 'round',
									},
								],
							}}
							options={{
								scales: {
									y: {
										ticks: { callback: (value) => `${value}%`, stepSize: 50 },
										beginAtZero: true,
									},
								},
							}}
						/>,
						'signalQuality'
					)}
					{renderChartSection(
						'Throughput',
						throughputData,
						<Line
							height='100'
							width='300'
							data={{
								labels: throughputTimestamps,
								datasets: [
									{
										label: 'Download (Mbps)',
										data: throughputDownload,
										fill: true,
										backgroundColor: 'rgba(57, 134, 168, 0.2)',
										borderColor: '#3986a8',
										borderWidth: 2,
										borderJoinStyle: 'round',
									},
									{
										label: 'Upload (Mbps)',
										data: throughputUpload,
										fill: true,
										backgroundColor: 'rgba(75, 192, 192, 0.2)',
										borderColor: '#4bc0c0',
										borderWidth: 2,
										borderJoinStyle: 'round',
									},
								],
							}}
							options={{
								scales: {
									y: {
										ticks: { callback: (value) => `${value}Mbps`, stepSize: 1 },
										beginAtZero: true,
									},
								},
							}}
						/>,
						'throughput'
					)}
					{renderChartSection(
						'Latency',
						latencyData,
						<Line
							height='100'
							width='300'
							data={{
								labels: latencyTimestamps,
								datasets: [{ label: 'Latency (ms)', data: latencyValues, fill: true, backgroundColor: 'rgba(57, 134, 168, 0.2)', borderColor: '#3986a8', borderWidth: 2, borderJoinStyle: 'round' }],
							}}
							options={{
								scales: {
									y: {
										ticks: { callback: (value) => `${value}ms`, stepSize: 10 },
										beginAtZero: true,
									},
								},
							}}
						/>,
						'latency'
					)}
					{renderChartSection(
						'Obstruction',
						obstructionData,
						<Line
							height='100'
							width='300'
							data={{
								labels: obstructionLabels,
								datasets: [{ label: 'Obstruction (%)', data: obstructionValues, fill: true, backgroundColor: 'rgba(57, 134, 168, 0.2)', borderColor: '#3986a8', borderWidth: 2, borderJoinStyle: 'round' }],
							}}
							options={{
								scales: {
									y: {
										ticks: { callback: (value) => `${value}%`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>,
						'obstruction'
					)}
					{renderChartSection(
						'Uptime',
						uptimeData,
						<Line
							height='100'
							width='300'
							data={{
								labels: uptimeLabels,
								datasets: [{ label: 'Uptime (Days)', data: uptimeValues, fill: true, backgroundColor: 'rgba(57, 134, 168, 0.2)', borderColor: '#3986a8', borderWidth: 2, borderJoinStyle: 'round' }],
							}}
							options={{
								scales: {
									y: {
										ticks: { stepSize: 2 },
										beginAtZero: true,
									},
								},
							}}
						/>,
						'uptime'
					)}
				</section>
			</main>
		</Layout>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();
	const isProd = process.env.NODE_ENV === 'production';

	return (
		<Layout>
			<main className='content content-full-width www'>
				<div className='error-banner card'>
					<span className='material-icons'>{isRouteErrorResponse(error) ? 'error_outline' : 'warning'}</span>
					<div className='error-content'>
						<h2 className='error-title'>{isRouteErrorResponse(error) ? `Error ${error.status}: ${error.statusText}` : 'Unable to Load Modem Data'}</h2>
						<p className='error-message'>{isRouteErrorResponse(error) ? error.data : 'There was a problem loading the modem details. Please try again later.'}</p>
						{!isProd && (
							<details className='error-details'>
								<summary>Technical Details</summary>
								<pre>{error.message || JSON.stringify(error, null, 2)}</pre>
							</details>
						)}
						<div className='error-actions'>
							<button
								onClick={() => window.location.reload()}
								className='retry-button'
							>
								<span className='material-icons'>refresh</span>
								Retry
							</button>
						</div>
					</div>
				</div>
			</main>
		</Layout>
	);
}
