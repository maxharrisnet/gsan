import { useEffect, useRef, Suspense } from 'react';
import { useLoaderData, Link, Await } from '@remix-run/react';
import { loader as modemApiLoader } from './api.modem';
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
		// Get modem details from the existing API loader
		const modemDetails = await modemApiLoader({ params, request });
		const modemData = await modemDetails.json();

		// Fetch services data
		const servicesPromise = fetchServicesAndModemData()
			.then(({ services }) => ({
				services,
			}))
			.catch((error) => {
				console.error('🍎 Error fetching services:', error);
				return { services: [] };
			});

		// Return both sets of data
		return defer({
			servicesData: servicesPromise,
			...modemData,
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
		hour12: false, // This will use 24-hour format
	});
};

export default function ModemDetails() {
	const { modem = {}, mapsAPIKey, gpsData = [], latencyData = [], throughputData = [], signalQualityData = [], obstructionData = [], usageData = [], uptimeData = [], errors = {}, servicesData } = useLoaderData();
	const { userKits } = useUser();

	// Move all useRef hooks here
	const usageChartRef = useRef(null);
	const signalQualityChartRef = useRef(null);
	const throughputChartRef = useRef(null);
	const latencyChartRef = useRef(null);
	const obstructionChartRef = useRef(null);
	const uptimeChartRef = useRef(null);

	// Move useEffect here
	useEffect(() => {
		// Capture current ref values
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

	// Check if we have any data at all
	const hasNoData = !modem?.data && !gpsData.length;

	// Fix map rendering
	const mapPosition = gpsData?.[0] ? { lat: parseFloat(gpsData[0].lat), lng: parseFloat(gpsData[0].lon) } : { lat: 39.8283, lng: -98.5795 }; // Default to US center

	if (hasNoData) {
		return (
			<Layout>
				<Sidebar>
					<div className='dashboard-sidebar'>
						<h2 className='select-device-heading'>Select a Device</h2>
						<Link
							to='/map'
							className='list-button back-link'
						>
							<span className='material-icons'>arrow_back</span>
							<span>Back to Map</span>
						</Link>
					</div>
				</Sidebar>
				<main className='content content-full-width'>
					<div className='error-banner card'>
						<span className='material-icons'>error_outline</span>
						<div>
							<p className='error-message'>No data available for this modem</p>
							<p className='error-details'>The modem may be offline or there might be connectivity issues</p>
						</div>
					</div>
				</main>
			</Layout>
		);
	}

	// Then update all timestamp formatting:
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

	// Replace the current usage data filtering with this:
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

	// Update the usage calculations to be consistent
	const totalUsage = monthlyUsageData.reduce((sum, day) => {
		return sum + (parseFloat(day.priority) || 0) + (parseFloat(day.unlimited) || 0);
	}, 0);

	// First, get the usage limit from modem data
	const usageLimit = modem?.meta?.usageLimit || 0;

	const totalUsageGB = totalUsage.toFixed(2); // Use the same totalUsage value
	const usageLimitGB = (usageLimit || 0).toFixed(2);

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

	// Helper function to render a chart section with error handling
	const renderChartSection = (title, data, chart, errorKey) => {
		if (errors[errorKey]) {
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
					<h2 className='select-device-heading'>Select a Device</h2>
					<Link
						to={`/map`}
						className='list-button back-link'
					>
						<span className='material-icons'>chevron_left</span>
						<span>Back to Map</span>
					</Link>

					<Suspense fallback={<LoadingSpinner />}>
						<Await resolve={servicesData}>
							{(resolvedData) => {
								const { services } = resolvedData;

								// Filter modems based on userKits
								const filteredServices = services
									.map((service) => ({
										...service,
										modems: service.modems?.filter((modem) => userKits.includes(modem.id)) || [],
									}))
									.filter((service) => service.modems.length > 0);

								return filteredServices.length > 0 ? (
									<ul className='modem-list'>
										{filteredServices.flatMap((service) =>
											service.modems?.map((modemItem) => (
												<li
													key={modemItem.id}
													className={`modem-item ${modemItem.id === modem.id ? 'active' : ''} status-${modemItem.status?.toLowerCase()}`}
												>
													<Link
														className='list-button'
														to={`/modem/${modemItem.type.toLowerCase()}/${modemItem.id}`}
														prefetch='intent'
													>
														<span className='modem-name'>{modemItem.name}</span>
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
				{!modem?.data && (
					<div className='error-banner card'>
						<span className='material-icons'>warning</span>
						<p>Limited data available for this modem</p>
					</div>
				)}

				{gpsData?.length > 0 && (
					<section className='map-wrapper'>
						<APIProvider apiKey={mapsAPIKey}>
							<Map
								style={{ width: '100%', height: '60vh' }}
								defaultCenter={mapPosition}
								defaultZoom={8}
								gestureHandling={'greedy'}
								disableDefaultUI={true}
							>
								<Marker position={mapPosition} />
							</Map>
						</APIProvider>
					</section>
				)}
				<section className='chart-container'>
					<div className='overview-charts-container'>
						{renderChartSection(
							'Usage Overview',
							usageData,
							<div className='usage-stats'>
								<div className='usage-chart'>
									<Doughnut
										height='100'
										width='300'
										data={{
											labels: [`Current Usage: ${totalUsageGB} GB`, `Monthly Limit: ${usageLimitGB} GB`],
											datasets: [
												{
													data: [parseFloat(totalUsageGB), Math.max(parseFloat(usageLimitGB) - parseFloat(totalUsageGB), 0)],
													backgroundColor: ['#3986a8', '#f3f4f6'],
													borderWidth: 0,
												},
											],
										}}
										options={{
											cutout: '70%',
											plugins: {
												legend: {
													display: true,
													position: 'bottom',
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
									<p>Data usage for current month.</p>
									<p>Data usage tracking is not immediate and may be delayed by 24 hours or more.</p>
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
											},
										],
									}}
									options={{
										cutout: '70%',
										plugins: {
											legend: {
												display: true,
												position: 'bottom',
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
