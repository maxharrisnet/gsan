import { useEffect, useState, useRef } from 'react';
import { useLoaderData } from '@remix-run/react';
import { fetchServicesAndModemData } from '../compass.server';
import Layout from './../components/layout/Layout';
import reportStyles from '../styles/reports.css?url';

export const loader = async ({ request }) => {
	try {
		console.log('🏈 Loading reports data...');
		const servicesData = await fetchServicesAndModemData();

		return { services: servicesData.services };
	} catch (error) {
		console.error('🚨 Error loading reports:', error);
		throw new Response('Error loading reports data', { status: 500 });
	}
};

const Reports = () => {
	console.log('🏈 Rendering reports');
	const { services } = useLoaderData();
	const [isLoading, setIsLoading] = useState(true);
	const webdatarocksRef = useRef(null);

	// Helper function to calculate averages
	const calculateAverage = (arr) => (arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0);

	// Flatten and compute the necessary fields
	const flattenedData = services.flatMap((service) =>
		service.modems.map((modem) => {
			// Extract data safely
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
				UsageLimit: modem.details.meta.usageLimit || 'N/A', // in GB, or fallback
				AvgLatency: avgLatency, // in ms
				AvgDownloadThroughput: avgDownload, // in Mbps
				AvgUploadThroughput: avgUpload, // in Mbps
				AvgSignalQuality: avgSignal, // in %
				AvgUptime: avgUptime, // in %
			};
		})
	);

	useEffect(() => {
		let mounted = true;

		const initializeWebDataRocks = async () => {
			try {
				// Import the WebDataRocks script directly
				await import('@webdatarocks/webdatarocks/webdatarocks.js');
				
				if (mounted && webdatarocksRef.current) {
					// Access WebDataRocks from window object
					new window.WebDataRocks({
						container: webdatarocksRef.current,
						toolbar: true,
						height: 600,
						width: '100%',
						report: {
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
						},
					});
				}
				setIsLoading(false);
			} catch (error) {
				console.error('Failed to load WebDataRocks:', error);
				setIsLoading(false);
			}
		};

		initializeWebDataRocks();
		return () => {
			mounted = false;
		};
	}, [flattenedData]);

	return (
		<Layout>
			<main className='content'>
				<section className='section'>{isLoading ? <div>Loading...</div> : <div ref={webdatarocksRef} />}</section>
			</main>
		</Layout>
	);
};

export default Reports;

export const links = () => [
	{ rel: 'stylesheet', href: reportStyles },
	{
		rel: 'stylesheet',
		href: 'https://cdn.webdatarocks.com/latest/webdatarocks.min.css',
	},
];
