import React from 'react';

export default function AlertList({ alerts = [] }) {
	if (!alerts.length) {
		return <p>No active alerts</p>;
	}

	return (
		<div className='alert-list'>
			{alerts.map((alert) => (
				<div
					key={alert.id}
					className={`alert-item alert-${alert.type}`}
				>
					<h4>{alert.title}</h4>
					<p>{alert.message}</p>
					<small>{new Date(alert.timestamp).toLocaleString()}</small>
				</div>
			))}
		</div>
	);
}
