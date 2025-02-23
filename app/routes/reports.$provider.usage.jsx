import { defer } from '@remix-run/node';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useLoaderData, useNavigation, Await } from '@remix-run/react';
import { fetchServicesAndModemData } from '../compass.server';
import Layout from './../components/layout/Layout';
import reportStyles from '../styles/reports.css?url';
import { loader as modemApiLoader } from './api.modem';
import { useUser } from '../context/UserContext';

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

		console.log('🍎 modemData:', modemData);

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

const ReportsContent = ({ services }) => {
	const { userKits } = useUser();
	const isLoadingRef = useRef(true);
	const [isClient, setIsClient] = useState(false);
	const webdatarocksRef = useRef(null);

	const calculateAverage = (arr) => {
		if (!Array.isArray(arr) || arr.length === 0) return 0;
		return arr.reduce((sum, val) => sum + val, 0) / arr.length;
	};

	const flattenedData = services.flatMap((service) =>
		service.modems
			.filter((modem) => userKits.includes('ALL') || userKits.includes(modem.id))
			.map((modem) => {
				const details = modem?.details || {};
				const data = details?.data || {};
				const meta = modem?.details?.meta || {};
				const latencyData = Array.isArray(data?.latency?.data) ? data.latency.data : [];
				// Check if there's any recent latency data (within last hour)
				const hasRecentLatencyData = latencyData.some((dataPoint) => {
					const timestamp = dataPoint?.[0];
					console.log('🎯 Timestamp:', timestamp);
					if (!timestamp) return false;
					// Convert seconds to milliseconds for JavaScript Date
					const dataTime = new Date(timestamp * 1000);
					const oneHourAgo = new Date(Date.now() - 3600000); // 1 hour in milliseconds
					console.log('🎯 Data time:', dataTime.toISOString());
					console.log('🎯 One hour ago:', oneHourAgo.toISOString());
					return dataTime > oneHourAgo;
				});

				const status = hasRecentLatencyData ? 'online' : 'offline';
				console.log('🎯 Latency data exists:', !!latencyData.length);
				console.log('🎯 Has recent data:', hasRecentLatencyData);
				console.log('🎯 Final status:', status);

				// Usage Data
				const usageData = Array.isArray(details?.usage) ? details.usage : [];
				const totalPriority = usageData.reduce((sum, u) => sum + (Number(u?.priority) || 0), 0).toFixed(2);
				const totalStandard = usageData.reduce((sum, u) => sum + (Number(u?.unlimited) || 0), 0).toFixed(2);
				const usageLimit = Number(meta?.usageLimit) || 0;
				const dataOverage = Math.max(0, parseFloat(totalPriority) + parseFloat(totalStandard) - usageLimit).toFixed(2);

				// Latency
				const avgLatency = calculateAverage(Array.isArray(latencyData) ? latencyData.map((d) => Number(d?.[1]) || 0) : []).toFixed(3);

				// Throughtput
				const throughputData = Array.isArray(data?.throughput?.data) ? data.throughput.data : [];
				const avgDownload = calculateAverage(Array.isArray(throughputData) ? throughputData.map((d) => Number(d?.[1]) || 0) : []).toFixed(3);
				const avgUpload = calculateAverage(Array.isArray(throughputData) ? throughputData.map((d) => Number(d?.[2]) || 0) : []).toFixed(3);

				// Signal Quality
				const signalQualityData = Array.isArray(data?.signal?.data) ? data.signal.data : [];
				const avgSignal = `${calculateAverage(Array.isArray(signalQualityData) ? signalQualityData.map((d) => Number(d?.[1]) || 0) : []).toFixed(0)}%`;

				return {
					Service: service?.name || 'Unknown',
					Status: status.charAt(0).toUpperCase() + status.slice(1), // Capitalize status
					Kit: modem?.id || 'Unknown',
					PriorityData: totalPriority,
					StandardData: totalStandard,
					UsageLimit: usageLimit,
					DataOverage: dataOverage,
					AvgLatency: avgLatency,
					AvgDownloadThroughput: avgDownload,
					AvgUploadThroughput: avgUpload,
					AvgSignalQuality: avgSignal,
				};
			})
	);

	console.log('🍎 flattenedData:', flattenedData);

	if (flattenedData.length === 0) {
		return (
			<div className='no-data-message'>
				<p>No data available for your assigned kits.</p>
			</div>
		);
	}

	useEffect(() => {
		setIsClient(true);
	}, []);

	useEffect(() => {
		if (!isClient) return;

		let mounted = true;
		const initializeWebDataRocks = async () => {
			try {
				if (typeof WebDataRocks === 'undefined') {
					const script = document.createElement('script');
					script.src = 'https://cdn.webdatarocks.com/latest/webdatarocks.js';
					script.async = true;

					await new Promise((resolve, reject) => {
						script.onload = resolve;
						script.onerror = reject;
						document.head.appendChild(script);
					});
				}

				if (mounted && webdatarocksRef.current) {
					webdatarocksRef.current.innerHTML = '';

					new WebDataRocks({
						container: webdatarocksRef.current,
						toolbar: {
							visible: true,
						},
						beforetoolbarcreated: function (toolbar) {
							let tabs = toolbar.getTabs();
							toolbar.getTabs = function () {
								tabs = tabs.filter((tab) => {
									return ['wdr-tab-export', 'wdr-tab-fullscreen'].includes(tab.id);
								});
								const exportTab = tabs.find((tab) => tab.id === 'wdr-tab-export');
								if (exportTab) {
									exportTab.title = 'Download';
									exportTab.icon = toolbar.icons.export;
								}
								return tabs;
							};
						},
						height: 600,
						width: '100%',
						report: {
							dataSource: {
								data: flattenedData,
							},
							options: {
								grid: {
									type: 'flat',
									showHierarchies: false,
									showTotals: false,
									showGrandTotals: 'off',
								},
								configuratorActive: false,
								configuratorButton: false,
								showAggregations: false,
								showFilter: false,
								sorting: 'off',
							},
							slice: {
								rows: [{ uniqueName: 'Service' }],
								columns: [{ uniqueName: 'Status' }, { uniqueName: 'Kit' }, { uniqueName: 'PriorityData', caption: 'Priority Data (GB)' }, { uniqueName: 'StandardData', caption: 'Standard Data (GB)' }, { uniqueName: 'UsageLimit', caption: 'Usage Limit (GB)' }, { uniqueName: 'DataOverage', caption: 'Data Overage (GB)' }, { uniqueName: 'AvgLatency', caption: 'Avg Latency (ms)' }, { uniqueName: 'AvgDownloadThroughput', caption: 'Avg Download (Mbps)' }, { uniqueName: 'AvgUploadThroughput', caption: 'Avg Upload (Mbps)' }, { uniqueName: 'AvgSignalQuality', caption: 'Avg Signal Quality' }],
							},
							formats: [
								{
									name: 'Status',
									textAlign: 'left',
								},
								{
									name: 'dataFormat',
									decimalPlaces: 2,
									textAlign: 'right',
								},
							],
							conditions: [
								{
									formula: "#value = 'Online'",
									format: {
										backgroundColor: '#4bc08a',
										color: 'white',
										fontFamily: 'Arial',
										fontSize: '12px',
									},
								},
								{
									formula: "#value = 'Offline'",
									format: {
										backgroundColor: '#dc3545',
										color: 'white',
										fontFamily: 'Arial',
										fontSize: '12px',
									},
								},
							],
							styles: {
								table: {
									backgroundColor: '#ffffff',
									borderColor: '#e0e0e0',
									fontFamily: 'Arial',
									fontSize: '12px',
									color: '#333333',
								},
								toolbar: {
									backgroundColor: '#f5f5f5',
									borderColor: '#e0e0e0',
									fontFamily: 'Arial',
									fontSize: '12px',
								},
								header: {
									backgroundColor: '#f5f5f5',
									borderColor: '#e0e0e0',
									fontFamily: 'Arial',
									fontSize: '12px',
									color: '#333333',
									fontWeight: 'bold',
								},
							},
						},
					});
				}
			} catch (error) {
				console.error('🚨 Failed to load WebDataRocks:', error);
			} finally {
				if (mounted) {
					isLoadingRef.current = false;
				}
			}
		};

		initializeWebDataRocks();
		return () => {
			mounted = false;
		};
	}, [isClient, flattenedData]);

	if (!isClient) {
		return <div>Loading reports...</div>;
	}

	return <div ref={webdatarocksRef} />;
};

const Reports = () => {
	const { servicesData } = useLoaderData();
	const navigation = useNavigation();
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	if (navigation.state === 'loading' && navigation.formData) {
		return (
			<Layout>
				<div>Loading...</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<section className='content'>
				<div className='reports-container'>
					{isClient && servicesData && (
						<Suspense fallback={<div>Loading reports...</div>}>
							<Await resolve={servicesData}>{(resolvedData) => <ReportsContent services={resolvedData.services} />}</Await>
						</Suspense>
					)}
				</div>
			</section>
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
