import maintenanceStyles from '../styles/maintenance.css?url';

export function links() {
	return [{ rel: 'stylesheet', href: maintenanceStyles }];
}

export default function Maintenance() {
	return (
		<div className='maintenance-container'>
			<div className='maintenance-content'>
				<span className='material-icons maintenance-icon'>build</span>
				<h1>Under Maintenance</h1>
				<p>We're currently performing system updates to improve your experience.</p>
				<p className='maintenance-details'>
					Expected completion: <strong>2 hours</strong>
				</p>
				<div className='maintenance-contact'>
					<p>For urgent matters, please contact:</p>
					<a
						href='tel:+1234567890'
						className='contact-link'
					>
						<span className='material-icons'>phone</span>
						1-234-567-890
					</a>
					<a
						href='mailto:support@example.com'
						className='contact-link'
					>
						<span className='material-icons'>email</span>
						support@example.com
					</a>
				</div>
			</div>
		</div>
	);
}
