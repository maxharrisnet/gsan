import { useEffect, useRef } from 'react';
import { useLoaderData, Link } from '@remix-run/react';
import { json } from '@remix-run/node';
import { fetchModemData } from '../routes/api.modem';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import chartStyles from '../styles/charts.css?url';
import modemStyles from '../styles/modem.css?url';
import SatelliteMap from '../components/maps/SatelliteMap';

export const links = () => [
	{ rel: 'stylesheet', href: chartStyles },
	{ rel: 'stylesheet', href: modemStyles },
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
	},
];

export async function loader({ params }) {
	const { provider, modemId } = params;
	const data = await fetchModemData(modemId, provider);
	return json({ data });
}

export function clientLoader({ data }) {
	return {
		...data,
		mapReady: true,
	};
}

ChartJS.register(CategoryScale, LinearScale, PointElement, BarElement, LineElement, Title, Tooltip, Legend);

export default function ModemDetails() {
	const { data } = useLoaderData();
	const { modem, mapsAPIKey, gpsData, latencyData, throughputData, signalQualityData, obstructionData, usageData, uptimeData } = data;

	// Add safety checks for each data transformation
	const latencyTimestamps = Array.isArray(latencyData) ? latencyData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()) : [];
	const latencyValues = Array.isArray(latencyData) ? latencyData.map((entry) => entry[1]) : [];

	const throughputTimestamps = Array.isArray(throughputData) ? throughputData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()) : [];
	const throughputDownload = Array.isArray(throughputData) ? throughputData.map((entry) => entry[1]) : [];
	const throughputUpload = Array.isArray(throughputData) ? throughputData.map((entry) => entry[2]) : [];

	const signalQualityLabels = Array.isArray(signalQualityData) ? signalQualityData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()) : [];
	const signalQualityValues = Array.isArray(signalQualityData) ? signalQualityData.map((entry) => entry[1]) : [];

	const obstructionLabels = Array.isArray(obstructionData) ? obstructionData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()) : [];
	const obstructionValues = Array.isArray(obstructionData) ? obstructionData.map((entry) => entry[1] * 100) : [];

	const uptimeLabels = Array.isArray(uptimeData) ? uptimeData.map((entry) => new Date(entry[0] * 1000).toLocaleTimeString()) : [];
	const uptimeValues = Array.isArray(uptimeData) ? uptimeData.map((entry) => Math.ceil((entry[1] / 86400) * 10) / 10) : [];

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

	const usageChartRef = useRef(null);
	const signalQualityChartRef = useRef(null);
	const throughputChartRef = useRef(null);
	const latencyChartRef = useRef(null);
	const obstructionChartRef = useRef(null);
	const uptimeChartRef = useRef(null);

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
						<SatelliteMap
							center={[gpsData[0].lat, gpsData[0].lon]}
							markers={[
								{
									id: modem.id,
									lat: gpsData[0].lat,
									lng: gpsData[0].lon,
									name: modem.name,
									status: modem.status,
								},
							]}
						/>
					</section>
				)}
				<div className='chart-container'>
					<section className='section chart-wrapper'>
						<h2>Usage</h2>
						<Bar
							height='100'
							width='300'
							data={{
								labels: usageLabels,
								datasets: [
									{ label: 'Download (GB)', data: usagePriority },
									{ label: 'Upload (GB)', data: usageUnlimited },
								],
							}}
							options={{
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
							height='100'
							width='300'
							data={{
								labels: signalQualityLabels,
								datasets: [{ label: 'Signal Quality (%)', data: signalQualityValues }],
							}}
							options={{
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
							height='100'
							width='300'
							data={{
								labels: throughputTimestamps,
								datasets: [
									{ label: 'Download (Mbps)', data: throughputDownload },
									{ label: 'Upload (Mbps)', data: throughputUpload },
								],
							}}
							options={{
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
							height='100'
							width='300'
							data={{
								labels: latencyTimestamps,
								datasets: [{ label: 'Latency (ms)', data: latencyValues }],
							}}
							options={{
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
							height='100'
							width='300'
							data={{
								labels: obstructionLabels,
								datasets: [{ label: 'Obstruction (%)', data: obstructionValues }],
							}}
							options={{
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
							height='100'
							width='300'
							data={{
								labels: uptimeLabels,
								datasets: [{ label: 'Uptime (%)', data: uptimeValues }],
							}}
							options={{
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
