import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '../utils/session.server';
import { fetchServicesAndModemData } from '../compass.server';
import { fetchShopifyOrderData, getCustomerData } from '../gsan.server';
import Layout from '../components/layout/Layout';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from '../styles/dashboard.css?url';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');

	if (!userData) {
		throw json({ message: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { customerAccessToken, shop } = userData;
		const { services } = await fetchServicesAndModemData();
		const firstService = services?.[0];
		const firstModem = firstService?.modems?.[0];

		// Get Shopify customer data using the same method as profile page
		const shopifyCustomer = await getCustomerData(customerAccessToken, shop);
		// console.log('🛍️ Dashboard Customer Data:', shopifyCustomer);

		// Add customer data to modem details
		if (firstModem) {
			firstModem.details = {
				...firstModem.details,
				firstName: shopifyCustomer?.firstName,
				lastName: shopifyCustomer?.lastName,
				email: shopifyCustomer?.email,
				phone: shopifyCustomer?.phone,
				defaultAddress: shopifyCustomer?.defaultAddress,
			};
		}

		const orderData = await fetchShopifyOrderData(firstModem?.id);

		// Merge order data with modem details
		if (firstModem) {
			firstModem.details = {
				...firstModem.details,
				...orderData,
			};
		}

		console.log('🌽 First Modem Details:', firstModem?.details);

		if (!firstModem) {
			return json({
				error: 'No modem found',
				modem: null,
				latencyData: [],
				throughputData: [],
				signalQualityData: [],
				obstructionData: [],
				usageData: [],
				uptimeData: [],
			});
		}

		// Extract metrics from the correct nested structure
		const { latency = { data: [] }, throughput = { data: [] }, signal = { data: [] }, obstruction = { data: [] }, uptime = { data: [] } } = firstModem.details?.data || {};

		const usage = firstModem.details?.usage || [];

		return json({
			modem: firstModem,
			latencyData: latency.data || [],
			throughputData: throughput.data || [],
			signalQualityData: signal.data || [],
			obstructionData: obstruction.data || [],
			usageData: usage,
			uptimeData: uptime.data || [],
		});
	} catch (error) {
		console.error('Dashboard data fetch error:', error);
		console.error(error.stack);
		throw json({ message: 'Failed to load dashboard data' }, { status: 500 });
	}
}

export default function Dashboard() {
	const data = useLoaderData();

	// Update the timestamp formatting
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

	// Update the data processing
	const latencyTimestamps = Array.isArray(data.latencyData) ? data.latencyData.map((entry) => (entry?.[0] ? formatTime(entry[0]) : '')) : [];

	const latencyValues = Array.isArray(data.latencyData) ? data.latencyData.map((entry) => entry?.[1] || 0) : [];

	const throughputTimestamps = Array.isArray(data.throughputData) ? data.throughputData.map((entry) => (entry?.[0] ? formatTime(entry[0]) : '')) : [];

	const throughputDownload = Array.isArray(data.throughputData) ? data.throughputData.map((entry) => entry?.[1] || 0) : [];

	const throughputUpload = Array.isArray(data.throughputData) ? data.throughputData.map((entry) => entry?.[2] || 0) : [];

	// Update chart colors and options
	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
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
					callback: (value) => throughputTimestamps[value],
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
		fill: true,
	};

	// Update datasets with higher opacity and explicit fill settings
	const datasets = [
		{
			label: 'Download (Mbps)',
			data: throughputDownload,
			borderColor: '#2563eb',
			backgroundColor: 'rgba(37, 99, 235, 0.3)',
			fill: true,
			tension: 0.1,
		},
		{
			label: 'Upload (Mbps)',
			data: throughputUpload,
			borderColor: '#16a34a',
			backgroundColor: 'rgba(22, 163, 74, 0.3)',
			fill: true,
			tension: 0.1,
		},
	];

	// Add a loading state or fallback for when data isn't available
	if (!data.modem) {
		return (
			<Layout>
				<div className='container'>
					<div className='dashboard'>
						<header className='dashboard-header'>
							<h1>Dashboard</h1>
						</header>
						<div className='dashboard-grid'>
							<div className='dashboard-card'>
								<p>No active modem data available</p>
							</div>
						</div>
					</div>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<main className='content'>
				<div className='container'>
					{/* Dashboard Header */}
					<header className='section'>
						<h1>Dashboard</h1>
						<div className='status-indicator'>
							<span className={`status ${data.modem?.details?.status || 'unknown'}`}>{data.modem?.details?.status || 'Unknown'}</span>
						</div>
					</header>

					{/* Two Column Layout for Customer and Billing */}
					<div className='dashboard-two-columns'>
						{/* Customer Info Card */}
						<div className='section'>
							<h2>Customer Details</h2>
							<div className='info-grid'>
								<div className='info-item'>
									<label>Name</label>
									<p>
										{data.modem?.details?.firstName} {data.modem?.details?.lastName}
									</p>
								</div>
								<div className='info-item'>
									<label>Email</label>
									<p>{data.modem?.details?.email}</p>
								</div>
								<div className='info-item'>
									<label>Phone</label>
									<p>{data.modem?.details?.phone}</p>
								</div>
								{data.modem?.details?.defaultAddress && (
									<>
										<div className='info-item'>
											<label>Address</label>
											<p>{data.modem?.details?.defaultAddress.address1}</p>
										</div>
										<div className='info-item'>
											<label>Location</label>
											<p>
												{data.modem?.details?.defaultAddress.city}, {data.modem?.details?.defaultAddress.province}
											</p>
										</div>
									</>
								)}
							</div>
						</div>

						{/* Billing Info Card */}
						<div className='section'>
							<h2>Service & Billing</h2>
							<div className='info-grid'>
								<div className='info-item'>
									<label>Active Services</label>
									<p>{data.modem?.details?.active_services || '1'}</p>
								</div>
								<div className='info-item'>
									<label>Monthly Cost</label>
									<p>${data.modem?.details?.monthly_cost || '0.00'}</p>
								</div>
								<div className='info-item'>
									<label>Next Billing Date</label>
									<p>{new Date(data.modem?.details?.next_billing_date || Date.now()).toLocaleDateString()}</p>
								</div>
								<div className='info-item'>
									<label>Last Payment</label>
									<p>${data.modem?.details?.last_payment_amount || '0.00'}</p>
								</div>
								<div className='info-item'>
									<label>Payment Status</label>
									<p className={`status ${data.modem?.details?.payment_status || 'unknown'}`}>{data.modem?.details?.payment_status || 'Unknown'}</p>
								</div>
							</div>
						</div>
					</div>

					{/* System Info Card */}
					<div className='section'>
						<h2>System Information</h2>
						<div className='info-grid'>
							<div className='info-item'>
								<label>Hardware Version</label>
								<p>{data.modem?.details?.hardware_version || 'Unknown'}</p>
							</div>
							<div className='info-item'>
								<label>Software Version</label>
								<p>{data.modem?.details?.software_version || 'Unknown'}</p>
							</div>
							<div className='info-item'>
								<label>Uptime</label>
								<p>{data.modem?.details?.uptime || '0'} hours</p>
							</div>
							<div className='info-item'>
								<label>Last Updated</label>
								<p>{new Date(data.modem?.details?.last_update || Date.now()).toLocaleString()}</p>
							</div>
							<div className='info-item'>
								<label>Signal Quality</label>
								<p>{data.modem?.details?.signal_quality || '0'}%</p>
							</div>
						</div>
					</div>

					{/* Throughput Chart */}
					<div className='section'>
						<h2>Current Throughput</h2>
						<div className='chart-container'>
							<Line
								id='throughput-chart'
								data={{
									labels: throughputTimestamps,
									datasets: datasets,
								}}
								options={chartOptions}
							/>
						</div>
					</div>

					{/* Latency Chart */}
					<div className='section'>
						<h2>Current Latency</h2>
						<div className='chart-container'>
							<Line
								id='latency-chart'
								data={{
									labels: latencyTimestamps,
									datasets: [
										{
											label: 'Latency (ms)',
											data: latencyValues,
											borderColor: '#2563eb',
											backgroundColor: 'rgba(37, 99, 235, 0.3)',
											fill: 'origin',
											tension: 0.1,
										},
									],
								}}
								options={chartOptions}
							/>
						</div>
					</div>
				</div>
			</main>
		</Layout>
	);
}
