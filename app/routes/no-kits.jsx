import { Link } from '@remix-run/react';
import Layout from '../components/layout/Layout';

export default function NoKits() {
	return (
		<Layout>
			<main className='content content-centered'>
				<div className='error-banner card'>
					<span className='material-icons'>error_outline</span>
					<div>
						<h2>No Kits Assigned</h2>
						<p>There are no kits assigned to your account.</p>
						<p>Please contact support if you believe this is an error.</p>
					</div>
					<Link
						to='/auth'
						className='button'
					>
						Back to Login
					</Link>
				</div>
			</main>
		</Layout>
	);
}
