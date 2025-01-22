import React from 'react';
import { Link } from '@remix-run/react';
import QuickStats from './QuickStats';
import ModemCard from './ModemCard';
import AlertList from './AlertList';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';

export default function ProviderDashboard({ userData, services }) {
	const mapsAPIKey = process.env.GOOGLE_MAPS_API_KEY;

	// Calculate overall stats
	const stats = services.reduce(
		(acc, service) => {
			acc.totalCustomers++;
			service.modems.forEach((modem) => {
				acc.totalModems++;
				acc[modem.status]++;

				// Calculate usage
				const priorityUsage = modem.usage?.[0]?.priority || 0;
				acc.totalUsage += priorityUsage;

				// Track alerts
				if (modem.alerts?.length > 0) {
					acc.activeAlerts += modem.alerts.length;
				}
			});
			return acc;
		},
		{
			totalCustomers: 0,
			totalModems: 0,
			online: 0,
			offline: 0,
			totalUsage: 0,
			activeAlerts: 0,
		}
	);

	// Get all modem locations
	const modemLocations = services.flatMap((service) =>
		service.modems
			.map((modem) => ({
				id: modem.id,
				name: modem.name,
				status: modem.status,
				customerName: service.name,
				position: {
					lat: modem.details?.gps?.latitude || 0,
					lng: modem.details?.gps?.longitude || 0,
				},
			}))
			.filter((modem) => modem.position.lat !== 0 && modem.position.lng !== 0)
	);

	// Get recent alerts across all services
	const recentAlerts = services
		.flatMap((service) =>
			service.modems.flatMap((modem) =>
				(modem.alerts || []).map((alert) => ({
					...alert,
					modemName: modem.name,
					customerName: service.name,
					modemId: modem.id,
					provider: service.provider,
				}))
			)
		)
		.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
		.slice(0, 5);

	return (
		<div className='dashboard provider-dashboard'>
			<div className='dashboard-header'>
				<h2>Service Provider Dashboard</h2>
				<QuickStats stats={stats} />
			</div>

			<div className='dashboard-grid'>
				<section className='service-overview'>
					<h3>Service Overview</h3>
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

				<section className='customer-list'>
					<div className='section-header'>
						<h3>Recent Customers</h3>
						<Link
							to='/customers'
							className='view-all'
						>
							View All
						</Link>
					</div>
					<div className='customer-grid'>
						{userData.recentCustomers?.slice(0, 5).map((customer) => (
							<div
								key={customer.id}
								className='customer-card'
							>
								<h4>
									{customer.firstName} {customer.lastName}
								</h4>
								<p>{customer.email}</p>
								<div className='customer-stats'>
									<span>Services: {customer.services?.length || 0}</span>
									<span>Status: {customer.status || 'Active'}</span>
								</div>
								<Link to={`/customers/${customer.id}`}>View Details</Link>
							</div>
						))}
					</div>
				</section>

				<section className='recent-alerts'>
					<div className='section-header'>
						<h3>Recent Alerts</h3>
						<Link
							to='/alerts'
							className='view-all'
						>
							View All
						</Link>
					</div>
					<AlertList alerts={userData.alerts} />
				</section>
			</div>

			<div className='dashboard-grid'>
				{/* Map Section */}
				<section className='map-section'>
					<div className='section-header'>
						<h3>Network Overview</h3>
						<Link
							to='/map'
							className='view-all'
						>
							View Full Map
						</Link>
					</div>
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
										title={`${modem.customerName} - ${modem.name}`}
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

				{/* Recent Alerts */}
				<section className='alerts-section'>
					<div className='section-header'>
						<h3>Recent Alerts</h3>
						<Link
							to='/alerts'
							className='view-all'
						>
							View All
						</Link>
					</div>
					<div className='alert-list'>
						{recentAlerts.length > 0 ? (
							recentAlerts.map((alert) => (
								<div
									key={alert.id}
									className={`alert-item alert-${alert.severity}`}
								>
									<div className='alert-header'>
										<strong>{alert.customerName}</strong>
										<span>{new Date(alert.timestamp).toLocaleString()}</span>
									</div>
									<p>{alert.message}</p>
									<Link
										to={`/modem/${alert.provider}/${alert.modemId}`}
										className='alert-link'
									>
										View Modem
									</Link>
								</div>
							))
						) : (
							<p className='text-success'>No active alerts</p>
						)}
					</div>
				</section>
			</div>

			{/* Customer List */}
			<section>
				<div className='section-header'>
					<h3>Customer Overview</h3>
					<Link
						to='/customers'
						className='view-all'
					>
						View All Customers
					</Link>
				</div>
				<div className='customer-grid'>
					{services.map((service) => (
						<div
							key={service.id}
							className='customer-card'
						>
							<h4>{service.name}</h4>
							<div className='customer-stats'>
								<span>{service.modems.length} Modems</span>
								<span>•</span>
								<span>{service.modems.filter((m) => m.status === 'online').length} Online</span>
								<span>•</span>
								<span>{service.modems.reduce((sum, m) => sum + (m.usage?.[0]?.priority || 0), 0).toFixed(1)} GB Used</span>
							</div>
							<div className='modem-list'>
								{service.modems.map((modem) => (
									<Link
										key={modem.id}
										to={`/modem/${service.provider}/${modem.id}`}
										className='modem-card'
									>
										<div className='modem-header'>
											<h5>{modem.name}</h5>
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
								))}
							</div>
						</div>
					))}
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
