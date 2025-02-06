import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getSession } from '../utils/session.server';
import { getCustomerData } from '../gsan.server';
import { getSonarAccountData, getSonarAccoutUsageData, getSonarServicePlan } from '../sonar.server';
import Layout from '../components/layout/Layout';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import styles from '../styles/dashboard.css?url';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	const cookieHeader = request.headers.get('Cookie');
	const session = await getSession(cookieHeader);
	const userData = session.get('userData');

	if (!userData) {
		throw json({ message: 'Not authenticated' }, { status: 401 });
	}

	const { customerAccessToken, shop } = userData;

	try {
		const [shopifyData, sonarAccount, sonarUsage, servicePlan] = await Promise.all([getCustomerData(customerAccessToken, shop), getSonarAccountData(userData.sonarAccountId), getSonarAccoutUsageData(userData.sonarAccountId), getSonarServicePlan(userData.sonarAccountId)]);

		return json({
			customer: shopifyData,
			account: sonarAccount?.success ? sonarAccount.data : null,
			usage: sonarUsage?.success ? sonarUsage.data : null,
			plan: servicePlan?.success ? servicePlan.data : null,
		});
	} catch (error) {
		console.error('Dashboard data fetch error:', error);
		throw json({ message: 'Failed to load dashboard data' }, { status: 500 });
	}
}

export default function Dashboard() {
	const data = useLoaderData();

	// Usage data for chart
	const usageData = {
		labels: data.usage?.daily_usage?.map((day) => day.date) || [],
		datasets: [
			{
				label: 'Daily Usage (GB)',
				data: data.usage?.daily_usage?.map((day) => day.amount) || [],
				borderColor: 'rgb(75, 192, 192)',
				tension: 0.1,
			},
		],
	};

	const chartOptions = {
		responsive: true,
		maintainAspectRatio: false,
		scales: {
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: 'GB Used',
				},
			},
			x: {
				title: {
					display: true,
					text: 'Date',
				},
			},
		},
	};

	return (
		<Layout>
			<div className='container'>
				<div className='dashboard'>
					<header className='dashboard-header'>
						<h1>Welcome, {data.customer?.firstName || 'Customer'}</h1>
						<div className='status-indicator'>
							<span className={`status ${data.account?.status?.toLowerCase()}`}>{data.account?.status || 'Unknown'}</span>
						</div>
					</header>

					<div className='dashboard-grid'>
						{/* Current Plan */}
						<div className='dashboard-card plan-info'>
							<h2>Current Plan</h2>
							<div className='plan-details'>
								<p className='plan-name'>{data.plan?.name || 'Standard Plan'}</p>
								<p className='plan-speed'>
									Download: {data.plan?.download_speed || '0'} Mbps
									<br />
									Upload: {data.plan?.upload_speed || '0'} Mbps
								</p>
							</div>
						</div>

						{/* Usage Summary */}
						<div className='dashboard-card usage-summary'>
							<h2>Data Usage</h2>
							<div className='usage-details'>
								<div className='usage-stat'>
									<label>Monthly Usage</label>
									<p>{data.usage?.total_usage || '0'} GB</p>
								</div>
								<div className='usage-stat'>
									<label>Data Cap</label>
									<p>{data.plan?.data_cap || 'Unlimited'}</p>
								</div>
								<div className='usage-meter'>
									<div
										className='usage-bar'
										style={{
											width: `${Math.min((data.usage?.total_usage / data.plan?.data_cap) * 100, 100)}%`,
										}}
									/>
								</div>
							</div>
						</div>

						{/* Connection Status */}
						<div className='dashboard-card connection-status'>
							<h2>Connection Status</h2>
							<div className='status-details'>
								<div className='status-item'>
									<label>Signal Strength</label>
									<p>{data.account?.signal_strength || 'N/A'}</p>
								</div>
								<div className='status-item'>
									<label>Latency</label>
									<p>{data.account?.latency || '0'} ms</p>
								</div>
							</div>
						</div>

						{/* Usage Graph with unique ID */}
						<div className='dashboard-card usage-graph'>
							<h2>Usage History</h2>
							<div className='chart-container'>
								<Line
									id='usage-history-chart'
									data={usageData}
									options={chartOptions}
								/>
							</div>
						</div>

						{/* If you have multiple charts, give each one a unique ID */}
						{data.account?.latency_history && (
							<div className='dashboard-card latency-graph'>
								<h2>Latency History</h2>
								<div className='chart-container'>
									<Line
										id='latency-history-chart'
										data={{
											labels: data.account.latency_history.map((point) => point.timestamp),
											datasets: [
												{
													label: 'Latency (ms)',
													data: data.account.latency_history.map((point) => point.value),
													borderColor: 'rgb(234, 179, 8)',
													tension: 0.1,
												},
											],
										}}
										options={chartOptions}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</Layout>
	);
}
