export default function QuickStats({ stats }) {
	return (
		<div className='quick-stats'>
			{stats.map((stat) => (
				<div
					key={stat.label}
					className='stat-card'
				>
					<h3>{stat.label}</h3>
					<p>{stat.value}</p>
				</div>
			))}
		</div>
	);
}
