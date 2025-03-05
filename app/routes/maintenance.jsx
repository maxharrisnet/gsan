import maintenanceStyles from '../styles/maintenance.css?url';

export function links() {
	return [{ rel: 'stylesheet', href: maintenanceStyles }];
}

export default function Maintenance() {
	return (
		<div className='maintenance-container'>
			<img
				src='/assets/images/switch-logo.png'
				alt='Switch Logo'
				className='login-logo'
			/>
			<div className='maintenance-content'>
				<span className='material-icons maintenance-icon'>build</span>
				<h1>Under Maintenance</h1>
				<p>We're currently performing system updates to improve your experience.</p>

				<div className='maintenance-contact'>
					<p>For urgent matters, please contact:</p>
					<a
						href='tel:+18776283801'
						className='contact-link'
					>
						<span className='material-icons'>phone</span>+1 (877) 628-3801
					</a>
					<a
						href='info@switch.ca'
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
