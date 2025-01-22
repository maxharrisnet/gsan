// app/routes/dashboard.jsx
import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { fetchServicesAndModemData } from '../compass.server';
import Layout from '../components/layout/Layout';
import Sidebar from '../components/layout/Sidebar';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import dashboardStyles from '../styles/dashboard.css?url';

export const links = () => [{ rel: 'stylesheet', href: dashboardStyles }];

export async function loader() {
	try {
		const response = await fetchServicesAndModemData();
		const { services } = await response.json();

		if (!services) {
			throw new Error('No services data available');
		}

		// Calculate total modems and status counts
		const stats = services.reduce(
			(acc, service) => {
				service.modems.forEach((modem) => {
					acc.total++;
					acc[modem.status]++;
				});
				return acc;
			},
			{ total: 0, online: 0, offline: 0 }
		);

		return json({ services, stats });
	} catch (error) {
		console.error('Error loading dashboard:', error);
		throw new Response('Error loading dashboard data', { status: 500 });
	}
}

export default function Dashboard() {
	const { services, stats } = useLoaderData();
	const mapsAPIKey = process.env.GOOGLE_MAPS_API_KEY;

	// Extract modem locations for map
	const modemLocations = services.flatMap((service) =>
		service.modems
			.map((modem) => ({
				id: modem.id,
				name: modem.name,
				status: modem.status,
				position: {
					lat: modem.details?.gps?.latitude || 0,
					lng: modem.details?.gps?.longitude || 0,
				},
			}))
			.filter((modem) => modem.position.lat !== 0 && modem.position.lng !== 0)
	);

	return (
		<Layout>
			<Sidebar>
				<div className='dashboard-sidebar'>
					<h2>Dashboard</h2>
					<div className='stats-overview'>
						<div className='stat-item'>
							<span>Total Modems</span>
							<span className='stat-value'>{stats.total}</span>
						</div>
						<div className='stat-item'>
							<span>Online</span>
							<span className='stat-value text-success'>{stats.online}</span>
						</div>
						<div className='stat-item'>
							<span>Offline</span>
							<span className='stat-value text-error'>{stats.offline}</span>
						</div>
					</div>
				</div>
			</Sidebar>

			<main className='content'>
				<div className='dashboard-grid'>
					{/* Map Section */}
					<section className='map-section card'>
						<h3>Modem Locations</h3>
						<div className='map-container'>
							<APIProvider apiKey={mapsAPIKey}>
								<Map
									defaultCenter={{ lat: 39.8283, lng: -98.5795 }}
									defaultZoom={4}
									gestureHandling={'greedy'}
									disableDefaultUI={false}
								>
									{modemLocations.map((modem) => (
										<Marker
											key={modem.id}
											position={modem.position}
											title={modem.name}
											icon={{
												url: `/assets/markers/${modem.status}.png`,
												scaledSize: { width: 30, height: 30 },
											}}
										/>
									))}
								</Map>
							</APIProvider>
						</div>
					</section>

					{/* Modems Grid */}
					<section className='modems-grid'>
						{services.map((service) =>
							service.modems.map((modem) => (
								<Link
									key={modem.id}
									to={`/modem/${modem.type}/${modem.id}`}
									className='modem-card card'
								>
									<div className='modem-card-header'>
										<h4>{modem.name}</h4>
										<span className={`status-badge ${modem.status}`}>{modem.status}</span>
									</div>
									<div className='modem-metrics'>
										<div className='metric'>
											<span>Signal</span>
											<span className={getSignalQualityClass(modem.data?.signal?.data?.[0]?.[1])}>{modem.data?.signal?.data?.[0]?.[1]}%</span>
										</div>
										<div className='metric'>
											<span>Latency</span>
											<span className={getLatencyClass(modem.data?.latency?.data?.[0]?.[1])}>{modem.data?.latency?.data?.[0]?.[1]}ms</span>
										</div>
										<div className='metric'>
											<span>Usage</span>
											<span>{(modem.usage?.[0]?.priority || 0).toFixed(1)} GB</span>
										</div>
									</div>
								</Link>
							))
						)}
					</section>
				</div>
			</main>
		</Layout>
	);
}

// Helper functions (same as in modem details)
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
