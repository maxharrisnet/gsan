import { useLoaderData, Form, useActionData } from '@remix-run/react';
import Layout from '../components/layout/Layout';
import { getSession } from '../utils/session.server';
import { redirect } from '@remix-run/node';

export async function loader({ request }) {
	// Get session data directly
	const session = await getSession(request.headers.get('Cookie'));
	console.log('Profile session data:', JSON.stringify(session.data, null, 2));

	// Check for authentication data
	const userData = session.get('userData');

	if (!userData) {
		console.log('No user data found in session');
		return redirect('/auth');
	}

	// Return the user data to display in profile
	return {
		user: {
			id: userData.id || userData.accountId || 'external-user',
			email: userData.email || userData.username || 'N/A',
			firstName: userData.firstName || '',
			lastName: userData.lastName || '',
			companyName: userData.company || '',
			kits: userData.metafields?.kits?.split(',').map((k) => k.trim()) || [],
			role: userData.role || 'USER',
			type: userData.type || 'sonar',
		},
	};
}

export default function Profile() {
	const { user } = useLoaderData();

	return (
		<Layout>
			<section className='content'>
				<div className='profile-container'>
					<h1>My Profile</h1>
					<div className='profile-wrapper'>
						<div className='profile-info'>
							<h2>Account Information</h2>
							<div className='user-details'>
								<div className='detail-row'>
									<span className='label'>Email/Username:</span>
									<span>{user.email}</span>
								</div>
								{user.firstName && (
									<div className='detail-row'>
										<span className='label'>First Name:</span>
										<span>{user.firstName}</span>
									</div>
								)}
								{user.lastName && (
									<div className='detail-row'>
										<span className='label'>Last Name:</span>
										<span>{user.lastName}</span>
									</div>
								)}
								{user.companyName && (
									<div className='detail-row'>
										<span className='label'>Company:</span>
										<span>{user.companyName}</span>
									</div>
								)}
								<div className='detail-row'>
									<span className='label'>Account Type:</span>
									<span>{user.type}</span>
								</div>
								{user.kits && user.kits.length > 0 && (
									<div className='detail-row'>
										<span className='label'>Kits:</span>
										<span>{user.kits.join(', ')}</span>
									</div>
								)}
							</div>

							<div className='note'>
								<p>This profile information is read-only. To update your account details, please contact support.</p>
							</div>
						</div>
					</div>
				</div>
			</section>
		</Layout>
	);
}
