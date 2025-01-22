import { useEffect, useRef } from 'react';
import { useLoaderData, Link } from '@remix-run/react';
import { loader as modemLoader } from './api.modem';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';
// import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import chartStyles from '../styles/charts.css?url';
import modemStyles from '../styles/modem.css?url';

export const links = () => [
	{ rel: 'stylesheet', href: chartStyles },
	{ rel: 'stylesheet', href: modemStyles },
];

// Use the existing loader from api.modem
export const loader = modemLoader;

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend);

// Consolidate all chart defaults into one object
const chartDefaults = {
	responsive: true,
	maintainAspectRatio: false,
	height: 200,
	plugins: {
		legend: {
			display: true,
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
		line: {
			hitRadius: 15,
			borderCapStyle: 'round',
			borderWidth: 1,
			tension: 0.1,
			fill: true,
			borderColor: '#3986a8',
		},
		bar: {
			backgroundColor: '#3986a8',
			borderWidth: 1,
		},
	},
	scales: {
		y: {
			beginAtZero: true,
		},
	},
};

export default function ModemDetails() {
	const { modem, gpsData, latencyData, throughputData, signalQualityData, obstructionData, usageData, uptimeData, mapsAPIKey } = useLoaderData();

	const latencyTimestamps = latencyData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString());
	const latencyValues = latencyData.map((entry) => entry[1]);

	const throughputTimestamps = throughputData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString());
	const throughputDownload = throughputData.map((entry) => entry[1]);
	const throughputUpload = throughputData.map((entry) => entry[2]);

	const signalQualityLabels = signalQualityData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString());
	const signalQualityValues = signalQualityData.map((entry) => entry[1]);

	const obstructionLabels = obstructionData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString());
	const obstructionValues = obstructionData.map((entry) => entry[1] * 100);

	// Filter and process usage data for the last 14 days
	const currentDate = new Date();
	const usageDayOffset = new Date();
	usageDayOffset.setDate(currentDate.getDate() - 14);

	const weeklyUsageData = usageData.filter((entry) => {
		const entryDate = new Date(entry.date);
		return entryDate >= usageDayOffset && entryDate <= currentDate;
	});

	const usageLabels = [];
	const usagePriority = [];
	const usageUnlimited = [];

	if (Array.isArray(weeklyUsageData) && weeklyUsageData.length > 0) {
		weeklyUsageData.forEach((day) => {
			usageLabels.push(new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
			usagePriority.push(day.priority ?? 0);
			usageUnlimited.push(day.unlimited ?? 0);
		});
	}
	const uptimeLabels = uptimeData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString());
	const uptimeValues = uptimeData.map((entry) => Math.ceil((entry[1] / 86400) * 10) / 10);

	// Chart refs
	const chartRefs = {
		usage: useRef(null),
		signalQuality: useRef(null),
		throughput: useRef(null),
		latency: useRef(null),
		obstruction: useRef(null),
		uptime: useRef(null),
	};

	// Cleanup chart instances on unmount
	useEffect(() => {
		return () => {
			Object.values(chartRefs).forEach((ref) => {
				if (ref.current) {
					ref.current.destroy();
					ref.current = null;
				}
			});
		};
	}, []);

	return (
		<Layout>
			<Sidebar>
				<div className='modem-sidebar'>
					<h2>{modem.name}</h2>
					<p className='capitalize'>{modem.type}</p>
					<Link
						to='/dashboard'
						className='bar-button'
					>
						<svg
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='feather feather-arrow-left'
						>
							<line
								x1='19'
								y1='12'
								x2='5'
								y2='12'
							></line>
							<polyline points='12 19 5 12 12 5'></polyline>
						</svg>
						<span>{modem.id}</span>
						<span className='sr-only'>Back</span>
					</Link>
				</div>
			</Sidebar>

			<main className='content'>
				<div className='modem-details-grid'>
					{/* Status Overview */}
					<section className='status-overview card'>
						<h3>Status Overview</h3>
						<div className='stats-grid'>
							<div className='stat-item'>
								<span>Signal Quality</span>
								<span className={getSignalQualityClass(signalQualityData[signalQualityData.length - 1]?.[1])}>{signalQualityData[signalQualityData.length - 1]?.[1]}%</span>
							</div>
							<div className='stat-item'>
								<span>Current Latency</span>
								<span className={getLatencyClass(latencyValues[latencyValues.length - 1])}>{latencyValues[latencyValues.length - 1]}ms</span>
							</div>
							<div className='stat-item'>
								<span>Uptime</span>
								<span>{uptimeData[uptimeData.length - 1]?.[1]} days</span>
							</div>
						</div>
					</section>

					{/* Charts Section */}
					<section className='charts-grid'>
						<div className='chart-container card'>
							<h3>Latency</h3>
							<Line
								data={{
									labels: latencyTimestamps,
									datasets: [
										{
											label: 'Latency (ms)',
											data: latencyValues,
											borderColor: 'rgb(75, 192, 192)',
											tension: 0.1,
										},
									],
								}}
								options={chartDefaults}
							/>
						</div>

						<div className='chart-container card'>
							<h3>Throughput</h3>
							<Line
								data={{
									labels: throughputData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()),
									datasets: [
										{
											label: 'Download (Mbps)',
											data: throughputData.map((entry) => entry[1]),
											borderColor: 'rgb(54, 162, 235)',
											tension: 0.1,
										},
										{
											label: 'Upload (Mbps)',
											data: throughputData.map((entry) => entry[2]),
											borderColor: 'rgb(255, 99, 132)',
											tension: 0.1,
										},
									],
								}}
								options={chartDefaults}
							/>
						</div>

						{/* Keep other existing charts */}
					</section>

					{gpsData && gpsData.length > 0 && (
						<section className='map-section card'>
							<h3>Location</h3>
							{/* Add your Google Maps component here */}
						</section>
					)}
				</div>
			</main>
		</Layout>
	);
}

// Helper functions
function getSignalQualityClass(quality) {
	if (quality >= 80) return 'text-success';
	if (quality >= 60) return 'text-warning';
	return 'text-error';
}

function getLatencyClass(latency) {
	if (latency < 50) return 'text-success';
	if (latency < 150) return 'text-warning';
	return 'text-error';
}

export { ErrorBoundary };
