import React from 'react';
import QuickStats from './QuickStats';
import ModemCard from './ModemCard';
import AlertList from './AlertList';

export default function CustomerDashboard({ userData, services }) {
	const stats = [
		{ label: 'Active Services', value: services.length },
		{ label: 'Total Modems', value: services.reduce((acc, service) => acc + service.modems.length, 0) },
		{ label: 'Account Status', value: userData.status || 'Active' },
	];

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
				</div>
			</section>
		</div>
	);
}
