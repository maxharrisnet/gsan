import { useEffect, useState, Suspense } from 'react';
import { useLoaderData, Await } from '@remix-run/react';
import { json, defer } from '@remix-run/node';
import { fetchServicesAndModemData } from '../compass.server';
// import { useUser } from '../context/UserContext';
import Layout from './../components/layout/Layout';
import Sidebar from './../components/layout/Sidebar';
import ErrorBoundary from '../components/ErrorBoundary';
import reportStyles from '../styles/reports.css?url';

export const links = () => [{ rel: 'stylesheet', href: reportStyles }];

export const loader = async ({ request }) => {
	try {
		console.log('🏈 Loading reports data...');
		const servicesPromise = fetchServicesAndModemData().then((response) => response.json());
		return defer({
			servicesData: servicesPromise,
		});
	} catch (error) {
		console.error('Error loading reports:', error);
		throw new Response('Error loading reports data', { status: 500 });
	}
};

const Reports = () => {
	console.log('🏈 Rendering reports');
	const { servicesData } = useLoaderData();
	const [WebDataRocks, setWebDataRocks] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	// Helper function to calculate averages
	const calculateAverage = (arr) => (arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0);

	// Flatten and compute the necessary fields
	const flattenedData = servicesData.services.flatMap((service) =>
		service.modems.map((modem) => {
			// Extract data safely with null checks
			const latencyData = modem.data?.latency?.data || [];
			const throughputData = modem.data?.throughput?.data || {};
			const signalQualityData = modem.data?.signal?.data || [];
			const uptimeData = modem.data?.uptime?.data || [];
			const usageData = modem.usage || [];

			// Calculate averages and totals
			const avgLatency = calculateAverage(latencyData).toFixed(2);
			const avgDownload = calculateAverage(throughputData.download || []).toFixed(2);
			const avgUpload = calculateAverage(throughputData.upload || []).toFixed(2);
			const avgSignal = calculateAverage(signalQualityData).toFixed(2);
			const avgUptime = calculateAverage(uptimeData).toFixed(2);

			const totalPriority = usageData.reduce((sum, u) => sum + (u.priority || 0), 0).toFixed(2);
			const totalStandard = usageData.reduce((sum, u) => sum + (u.standard || 0), 0).toFixed(2);

			return {
				Service: service.name,
				Status: modem.status === 'online' ? 'Online' : 'Offline',
				Kit: service.id,
				PriorityData: totalPriority, // in GB
				StandardData: totalStandard, // in GB
				UsageLimit: modem.details?.meta?.usageLimit || 'N/A', // in GB, or fallback
				AvgLatency: avgLatency, // in ms
				AvgDownloadThroughput: avgDownload, // in Mbps
				AvgUploadThroughput: avgUpload, // in Mbps
				AvgSignalQuality: avgSignal, // in %
				AvgUptime: avgUptime, // in %
			};
		})
	);

	useEffect(() => {
		import('@webdatarocks/react-webdatarocks')
			.then((module) => {
				setWebDataRocks(() => module.default);
				setIsLoading(false);
			})
			.catch((error) => {
				console.error('Failed to load WebDataRocks:', error);
				setError('Failed to load reporting tool');
				setIsLoading(false);
			});
	}, []);

	if (isLoading) {
		return (
			<Layout>
				<Sidebar>
					<div className='reports-sidebar'>
						<h2>Usage Reports</h2>
					</div>
				</Sidebar>
				<main className='content'>
					<div className='loading-container'>
						<div className='loading-spinner'></div>
						<p>Loading reports...</p>
					</div>
				</main>
			</Layout>
		);
	}

	if (error) {
		return (
			<Layout>
				<Sidebar>
					<div className='reports-sidebar'>
						<h2>Usage Reports</h2>
					</div>
				</Sidebar>
				<main className='content'>
					<div className='error-container card'>
						<h3>Error</h3>
						<p>{error}</p>
					</div>
				</main>
			</Layout>
		);
	}

	return (
		<Layout>
			<Sidebar>
				<div className='reports-sidebar'>
					<h2>Usage Reports</h2>
					<p>Data for all services</p>
				</div>
			</Sidebar>
			<main className='content'>
				<Suspense
					fallback={
						<div className='loading-container'>
							<div className='loading-spinner'></div>
						</div>
					}
				>
					<Await
						resolve={servicesData}
						errorElement={<div className='error-container'>Error loading reports data</div>}
					>
						{(resolvedData) => {
							const services = resolvedData.services;
							const flattenedData = services.flatMap((service) =>
								service.modems.map((modem) => {
									// Extract data safely with null checks
									const latencyData = modem.data?.latency?.data || [];
									const throughputData = modem.data?.throughput?.data || {};
									const signalQualityData = modem.data?.signal?.data || [];
									const uptimeData = modem.data?.uptime?.data || [];
									const usageData = modem.usage || [];

									// Calculate averages and totals
									const avgLatency = calculateAverage(latencyData).toFixed(2);
									const avgDownload = calculateAverage(throughputData.download || []).toFixed(2);
									const avgUpload = calculateAverage(throughputData.upload || []).toFixed(2);
									const avgSignal = calculateAverage(signalQualityData).toFixed(2);
									const avgUptime = calculateAverage(uptimeData).toFixed(2);

									const totalPriority = usageData.reduce((sum, u) => sum + (u.priority || 0), 0).toFixed(2);
									const totalStandard = usageData.reduce((sum, u) => sum + (u.standard || 0), 0).toFixed(2);

									return {
										Service: service.name,
										Status: modem.status === 'online' ? 'Online' : 'Offline',
										Kit: service.id,
										PriorityData: totalPriority, // in GB
										StandardData: totalStandard, // in GB
										UsageLimit: modem.details?.meta?.usageLimit || 'N/A', // in GB, or fallback
										AvgLatency: avgLatency, // in ms
										AvgDownloadThroughput: avgDownload, // in Mbps
										AvgUploadThroughput: avgUpload, // in Mbps
										AvgSignalQuality: avgSignal, // in %
										AvgUptime: avgUptime, // in %
									};
								})
							);

							return (
								<section className='reports-container card'>
									<h3>Usage Reports</h3>
									<WebDataRocks
										toolbar={true}
										width='100%'
										height='600px'
										report={{
											dataSource: {
												data: flattenedData,
											},
											slice: {
												rows: [{ uniqueName: 'Service' }, { uniqueName: 'Kit' }],
												columns: [{ uniqueName: 'Measures' }],
												measures: [
													{ uniqueName: 'PriorityData', aggregation: 'sum', caption: 'Priority Data (GB)' },
													{ uniqueName: 'StandardData', aggregation: 'sum', caption: 'Standard Data (GB)' },
													{ uniqueName: 'UsageLimit', aggregation: 'sum', caption: 'Usage Limit (GB)' },
													{ uniqueName: 'AvgLatency', aggregation: 'average', caption: 'Avg Latency (ms)' },
													{ uniqueName: 'AvgDownloadThroughput', aggregation: 'average', caption: 'Avg Download (Mbps)' },
													{ uniqueName: 'AvgUploadThroughput', aggregation: 'average', caption: 'Avg Upload (Mbps)' },
													{ uniqueName: 'AvgSignalQuality', aggregation: 'average', caption: 'Avg Signal Quality (%)' },
												],
											},
											options: {
												grid: {
													type: 'compact',
													showTotals: true,
													showGrandTotals: 'on',
												},
											},
										}}
									/>
								</section>
							);
						}}
					</Await>
				</Suspense>
			</main>
		</Layout>
	);
};

export default Reports;

export { ErrorBoundary };
