import { Link } from '@remix-run/react';

export default function ModemCard({ modem, service }) {
	const showLatency = (modem) => {
		return modem.details.data.latency && modem.details.data.latency.data.length > 0;
	};

	return (
		<div className='modem-card'>
			<div className='modem-header'>
				<div>
					<h4>{modem.name}</h4>
					<p>{service.name}</p>
				</div>
				<Link to={`/modem/${encodeURI(modem.type.toLowerCase())}/${modem.id}`}>View Details</Link>
			</div>

			<div className='latency-container'>
				{showLatency(modem) ? (
					<div className='latency-bar'>
						{modem.details.data.latency.data.map((latencyPoint, index) => {
							const latencyValue = latencyPoint[1];
							const latencyClass = getLatencyClass(latencyValue);
							const segmentWidth = (10 / 1440) * 100;
							return (
								<div
									key={index}
									className={`latency-segment ${latencyClass}`}
									style={{ width: `${segmentWidth}%` }}
								/>
							);
						})}
					</div>
				) : (
					<div className='empty-data'>No latency data available</div>
				)}
			</div>
		</div>
	);
}
