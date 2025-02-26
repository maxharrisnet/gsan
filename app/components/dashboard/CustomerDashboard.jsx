import QuickStats from './QuickStats';
import ModemCard from './ModemCard';
import AlertList from './AlertList';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import { Link } from '@remix-run/react';

export default function CustomerDashboard({ userData, services }) {
	const mapsAPIKey = process.env.GOOGLE_MAPS_API_KEY;

	// Calculate stats
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

	// Get modem locations for map
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
		<div className='dashboard customer-dashboard'>
			<div className='dashboard-header'>
				<h2>Customer Dashboard</h2>
				<QuickStats stats={stats} />
			</div>

			<section className='service-status'>
				<h3>Your Services</h3>
				{services.map((service) => (
					<div key={service.id}>
						{service.modems.map((modem) => (
							<ModemCard
								key={modem.id}
								modem={modem}
								service={service}
							/>
						))}
					</div>
				))}
			</section>

			<section className='account-info'>
				<h3>Account Information</h3>
				<div className='info-grid'>
					<div>
						<strong>Account ID:</strong> {userData.id}
					</div>
					<div>
						<strong>Name:</strong> {userData.firstName} {userData.lastName}
					</div>
					<div>
						<strong>Email:</strong> {userData.email}
					</div>
					<div>
						<strong>Account Type:</strong> {userData.accountType}
					</div>
				</div>
			</section>

			{/* Map Section */}
			{modemLocations.length > 0 && (
				<section className='map-section'>
					<h3>Modem Locations</h3>
					<div style={{ height: '400px' }}>
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
			)}

			{/* Modems List */}
			<section>
				<h3>Your Modems</h3>
				<div className='customer-grid'>
					{services.map((service) =>
						service.modems.map((modem) => (
							<Link
								key={modem.id}
								to={`/modem/${service.provider}/${modem.id}`}
								className='modem-card'
							>
								<div className='modem-header'>
									<h4>{modem.name || modem.id}</h4>
									<span className={`status-badge ${modem.status}`}>{modem.status}</span>
								</div>
								<div className='latency-container'>
									<div className='latency-bar'>
										{modem.data?.latency?.data?.[0] ? (
											<div
												className={`latency-segment ${getLatencyClass(modem.data.latency.data[0][1])}`}
												style={{ width: '100%' }}
											>
												{modem.data.latency.data[0][1]}ms
											</div>
										) : (
											<div className='empty-data-bar'>No latency data</div>
										)}
									</div>
								</div>
							</Link>
						))
					)}
				</div>
			</section>
		</div>
	);
}

function getLatencyClass(latency) {
	if (latency < 50) return 'latency-green';
	if (latency < 150) return 'latency-orange';
	return 'latency-red';
}
