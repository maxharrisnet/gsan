import { useEffect, useState, useRef } from 'react';
import { useLoaderData, useNavigation } from '@remix-run/react';
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

const ReportsContent = ({ services }) => {
	const isLoadingRef = useRef(true);
	const [isClient, setIsClient] = useState(false);
	const webdatarocksRef = useRef(null);

	const calculateAverage = (arr) => (arr.length > 0 ? arr.reduce((sum, val) => sum + val, 0) / arr.length : 0);

	const flattenedData = services.flatMap((service) =>
		service.modems.map((modem) => {
			const latencyData = modem.data?.latency?.data || [];
			const throughputData = modem.data?.throughput?.data || {};
			const signalQualityData = modem.data?.signal?.data || [];
			const usageData = modem.usage || [];
			const totalPriority = usageData.reduce((sum, u) => sum + (u.priority || 0), 0).toFixed(2);
			const totalStandard = usageData.reduce((sum, u) => sum + (u.standard || 0), 0).toFixed(2);
			const usageLimit = modem.details?.meta?.usageLimit || 0;
			const dataOverage = Math.max(0, parseFloat(totalPriority) + parseFloat(totalStandard) - usageLimit).toFixed(2);

			return {
				Service: service.name,
				Status: modem.status === 'online' ? 'Online' : 'Offline',
				Kit: modem.id,
				PriorityData: totalPriority,
				StandardData: totalStandard,
				UsageLimit: usageLimit,
				DataOverage: dataOverage,
				AvgLatency: calculateAverage(latencyData.map((d) => d[1])).toFixed(3),
				AvgDownloadThroughput: calculateAverage(throughputData.download || []).toFixed(3),
				AvgUploadThroughput: calculateAverage(throughputData.upload || []).toFixed(3),
				AvgSignalQuality: `${calculateAverage(signalQualityData).toFixed(0)}%`,
				OptIn: 'No',
				MobilePlan: 'No',
			};
		})
	);

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
								columns: [{ uniqueName: 'Status' }, { uniqueName: 'Kit' }, { uniqueName: 'PriorityData', caption: 'Priority Data (GB)' }, { uniqueName: 'StandardData', caption: 'Standard Data (GB)' }, { uniqueName: 'UsageLimit', caption: 'Usage Limit (GB)' }, { uniqueName: 'DataOverage', caption: 'Data Overage (GB)' }, { uniqueName: 'AvgLatency', caption: 'Avg Latency (ms)' }, { uniqueName: 'AvgDownloadThroughput', caption: 'Avg Downlink Throughput (Mbps)' }, { uniqueName: 'AvgUploadThroughput', caption: 'Avg Uplink Throughput (Mbps)' }, { uniqueName: 'AvgSignalQuality', caption: 'Avg Signal Quality' }, { uniqueName: 'OptIn', caption: 'Opt In' }, { uniqueName: 'MobilePlan', caption: 'Mobile Plan' }],
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
										backgroundColor: '#4CAF50',
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
	const { services } = useLoaderData();
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
				<div className='reports-container'>{isClient && <ReportsContent services={services} />}</div>
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
