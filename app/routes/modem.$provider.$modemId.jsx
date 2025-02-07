import { useEffect, useRef } from 'react';
import { useLoaderData, Link } from '@remix-run/react';
import { loader } from './api.modem';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import chartStyles from '../styles/charts.css?url';
import modemStyles from '../styles/modem.css?url';

export const links = () => [
	{ rel: 'stylesheet', href: chartStyles },
	{ rel: 'stylesheet', href: modemStyles },
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
	},
];

export { loader };

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend);

// Update the global chart defaults
ChartJS.defaults.global = {
	responsive: true,
	maintainAspectRatio: false,
	height: 100,
	plugins: {
		legend: {
			position: 'bottom',
			labels: {
				color: '#374151',
				font: {
					family: 'Inter',
					size: 12,
				},
			},
		},
		tooltip: {
			mode: 'index',
			intersect: false,
			backgroundColor: 'rgba(17, 24, 39, 0.9)',
			titleColor: '#fff',
			bodyColor: '#fff',
			borderColor: '#374151',
			borderWidth: 1,
		},
	},
	scales: {
		x: {
			grid: {
				color: '#e5e7eb',
				drawBorder: false,
			},
			ticks: {
				color: '#6b7280',
				font: {
					family: 'Inter',
					size: 11,
				},
			},
		},
		y: {
			beginAtZero: true,
			grid: {
				color: '#e5e7eb',
				drawBorder: false,
			},
			ticks: {
				color: '#6b7280',
				font: {
					family: 'Inter',
					size: 11,
				},
			},
		},
	},
	elements: {
		line: {
			tension: 0.1,
			borderWidth: 2,
		},
		point: {
			radius: 0,
			hoverRadius: 4,
		},
	},
};

// Update the time formatting
const formatTime = (timestamp) => {
	return new Date(timestamp * 1000)
		.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		})
		.replace(/\s?(AM|PM)/, ' $1')
		.toUpperCase();
};

export default function ModemDetails() {
	const { modem, mapsAPIKey, gpsData, latencyData, throughputData, signalQualityData, obstructionData, usageData, uptimeData } = useLoaderData();

	const latencyTimestamps = latencyData.map((entry) => formatTime(entry[0]));
	const latencyValues = latencyData.map((entry) => entry[1]);

	const throughputTimestamps = throughputData.map((entry) => formatTime(entry[0]));
	const throughputDownload = throughputData.map((entry) => entry[1]);
	const throughputUpload = throughputData.map((entry) => entry[2]);

	const signalQualityLabels = signalQualityData.map((entry) => formatTime(entry[0]));
	const signalQualityValues = signalQualityData.map((entry) => entry[1]);

	const obstructionLabels = obstructionData.map((entry) => formatTime(entry[0]));
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
	const uptimeLabels = uptimeData.map((entry) => formatTime(entry[0]));
	const uptimeValues = uptimeData.map((entry) => Math.ceil((entry[1] / 86400) * 10) / 10);

	const usageChartRef = useRef(null);
	const signalQualityChartRef = useRef(null);
	const throughputChartRef = useRef(null);
	const latencyChartRef = useRef(null);
	const obstructionChartRef = useRef(null);
	const uptimeChartRef = useRef(null);

	useEffect(() => {
		return () => {
			// Clean up chart instances on component unmount to prevent reuse issues
			if (usageChartRef.current) {
				usageChartRef.current.destroy();
				usageChartRef.current = null;
			}
			if (signalQualityChartRef.current) {
				signalQualityChartRef.current.destroy();
				signalQualityChartRef.current = null;
			}
			if (throughputChartRef.current) {
				throughputChartRef.current.destroy();
				throughputChartRef.current = null;
			}
			if (latencyChartRef.current) {
				latencyChartRef.current.destroy();
				latencyChartRef.current = null;
			}
			if (obstructionChartRef.current) {
				obstructionChartRef.current.destroy();
				obstructionChartRef.current = null;
			}
			if (uptimeChartRef.current) {
				uptimeChartRef.current.destroy();
				uptimeChartRef.current = null;
			}
		};
	}, []);

	return (
		<Layout>
			<Sidebar>
				<div className='sidebar-header'>
					<h1 className='provider-name'>Switch Canada</h1>
				</div>
				<div className='search-container'>
					<input
						type='search'
						placeholder='Search'
						className='search-input'
					/>
				</div>

				<h2 className='select-device-heading'>Select a Device</h2>
				<Link
					to={`/modem/${modem.provider}`}
					className='list-button back-link'
				>
					<span className='material-icons'>chevron_left</span>
					<span>Switch Canada-{modem.id}</span>
				</Link>

				<div className='devices-section'>
					<button className='list-button section-toggle'>
						<span>Modems</span>
						<span className='material-icons'>expand_more</span>
					</button>

					<div className='modem-list'>
						<div className='modem-item active'>
							<div className='modem-info'>
								<span className='status-badge online'>Online</span>
								<h3 className='modem-name'>{modem.name}</h3>
								<p className='modem-id'>{modem.id}</p>
							</div>
							<div className='provider-brand'>
								<span>STARLINK</span>
							</div>
						</div>
					</div>
				</div>
			</Sidebar>

			<main className='content content-full-width'>
				{gpsData && gpsData.length > 0 && (
					<section className='map-wrapper'>
						<APIProvider apiKey={mapsAPIKey}>
							<Map
								style={{ width: '100%', height: '60vh' }}
								defaultCenter={{ lat: gpsData[0].lat, lng: gpsData[0].lon }}
								defaultZoom={8}
								gestureHandling={'greedy'}
								disableDefaultUI={true}
							>
								<Marker position={{ lat: gpsData[0].lat, lng: gpsData[0].lon }} />
							</Map>
						</APIProvider>
					</section>
				)}
				<div className='chart-container'>
					<section className='section chart-wrapper'>
						<h2>Usage</h2>
						<Bar
							height='60'
							width='300'
							data={{
								labels: usageLabels,
								datasets: [
									{
										label: 'Download (GB)',
										data: usagePriority,
										borderColor: '#2563eb',
										backgroundColor: 'rgba(37, 99, 235, 0.3)',
										fill: true,
									},
									{
										label: 'Upload (GB)',
										data: usageUnlimited,
										borderColor: '#16a34a',
										backgroundColor: 'rgba(22, 163, 74, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}GB`, stepSize: 1 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
					<section className='section chart-wrapper'>
						<h2>Signal Quality</h2>
						<Line
							height='60'
							width='300'
							data={{
								labels: signalQualityLabels,
								datasets: [
									{
										label: 'Signal Quality (%)',
										data: signalQualityValues,
										borderColor: '#16a34a',
										backgroundColor: 'rgba(22, 163, 74, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}%`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
					<section className='section chart-wrapper'>
						<h2>Throughput</h2>
						<Line
							height='60'
							width='300'
							data={{
								labels: throughputTimestamps,
								datasets: [
									{
										label: 'Download (Mbps)',
										data: throughputDownload,
										borderColor: '#2563eb',
										backgroundColor: 'rgba(37, 99, 235, 0.3)',
										fill: true,
									},
									{
										label: 'Upload (Mbps)',
										data: throughputUpload,
										borderColor: '#16a34a',
										backgroundColor: 'rgba(22, 163, 74, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}Mbps`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
					<section className='section chart-wrapper'>
						<h2>Latency</h2>
						<Line
							height='60'
							width='300'
							data={{
								labels: latencyTimestamps,
								datasets: [
									{
										label: 'Latency (ms)',
										data: latencyValues,
										borderColor: '#2563eb',
										backgroundColor: 'rgba(37, 99, 235, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}ms`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
					<section className='section chart-wrapper'>
						<h2>Obstruction</h2>
						<Line
							height='60'
							width='300'
							data={{
								labels: obstructionLabels,
								datasets: [
									{
										label: 'Obstruction (%)',
										data: obstructionValues,
										borderColor: '#dc2626',
										backgroundColor: 'rgba(220, 38, 38, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}%`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
					<section className='section chart-wrapper'>
						<h2>Uptime</h2>
						<Line
							height='60'
							width='300'
							data={{
								labels: uptimeLabels,
								datasets: [
									{
										label: 'Uptime (%)',
										data: uptimeValues,
										borderColor: '#16a34a',
										backgroundColor: 'rgba(22, 163, 74, 0.3)',
										fill: true,
									},
								],
							}}
							options={{
								...ChartJS.defaults.global,
								scales: {
									y: {
										ticks: { callback: (value) => `${value}%`, stepSize: 20 },
										beginAtZero: true,
									},
								},
							}}
						/>
					</section>
				</div>
			</main>
		</Layout>
	);
}
