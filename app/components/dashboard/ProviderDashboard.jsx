import React from 'react';
import { Link } from '@remix-run/react';
import QuickStats from './QuickStats';
import ModemCard from './ModemCard';
import AlertList from './AlertList';

export default function ProviderDashboard({ userData, services }) {
	const stats = [
		{ label: 'Total Customers', value: userData.customerCount || 0 },
		{ label: 'Active Services', value: services.length },
		{ label: 'Total Modems', value: services.reduce((acc, service) => acc + service.modems.length, 0) },
		{ label: 'Active Alerts', value: userData.alerts?.length || 0 },
	];

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
		</div>
	);
}
