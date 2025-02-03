import { useEffect, useState, Suspense } from 'react';
import { useLoaderData, Await } from '@remix-run/react';
import { defer } from '@remix-run/node';
import { fetchServicesAndModemData } from '../compass.server';
// import { useUser } from '../context/UserContext';
import Layout from './../components/layout/Layout';
import Sidebar from './../components/layout/Sidebar';
import reportStyles from '../styles/reports.css?url';

export const links = () => [
	{ rel: 'stylesheet', href: reportStyles },
	{
		rel: 'stylesheet',
		href: 'https://cdn.webdatarocks.com/latest/webdatarocks.min.css',
	},
];

export const loader = async ({ params }) => {
	try {
		console.log('🏈 Loading reports data for provider:', params.provider);
		const servicesData = await fetchServicesAndModemData();

		// Return immediate data instead of deferring
		return { servicesData };
	} catch (error) {
		console.error('🚨 Error loading reports:', error);
		throw new Response('Error loading reports data', { status: 500 });
	}
};

function ReportsContent({ data, WebDataRocks }) {
	if (!data || !WebDataRocks) return null;

	const flattenedData = data.services.flatMap((service) =>
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
				PriorityData: totalPriority,
				StandardData: totalStandard,
				UsageLimit: modem.details?.meta?.usageLimit || 'N/A',
				AvgLatency: avgLatency,
				AvgDownloadThroughput: avgDownload,
				AvgUploadThroughput: avgUpload,
				AvgSignalQuality: avgSignal,
				AvgUptime: avgUptime,
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
}

export default function Reports() {
	const { servicesData } = useLoaderData();
	const [WebDataRocks, setWebDataRocks] = useState(null);

	useEffect(() => {
		let mounted = true;

		const loadWebDataRocks = async () => {
			try {
				const module = await import('@webdatarocks/react-webdatarocks');
				if (mounted) {
					setWebDataRocks(() => module.default);
				}
			} catch (error) {
				console.error('🚨 Failed to load WebDataRocks:', error);
			}
		};

		loadWebDataRocks();

		return () => {
			mounted = false;
		};
	}, []);

	return (
		<Layout>
			<Sidebar>
				<div className='reports-sidebar'>
					<h2>Usage Reports</h2>
					<p>Data for all services</p>
				</div>
			</Sidebar>
			<main className='content'>
				{!WebDataRocks ? (
					<div className='loading-container'>
						<div className='loading-spinner'></div>
						<p>Loading reporting tool...</p>
					</div>
				) : (
					<ReportsContent
						data={servicesData}
						WebDataRocks={WebDataRocks}
					/>
				)}
			</main>
		</Layout>
	);
}

// Helper function to calculate averages
const calculateAverage = (arr) => (arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0);
