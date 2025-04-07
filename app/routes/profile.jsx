import { json } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData, Form, useActionData } from '@remix-run/react';
import { getCustomerData } from '../gsan.server';
import Layout from '../components/layout/Layout';
import styles from '../styles/profile.css?url';
import { getSession } from '../utils/session.server';
import { getSonarServicePlan } from '../sonar.server';
import { requireUser, getUserById, updateUserPassword } from '../utils/auth.server';
import bcrypt from 'bcryptjs';

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	const user = await requireUser(request);
	const userData = await getUserById(user.id);
	return json({ user: userData });
}

export async function action({ request }) {
	const user = await requireUser(request);
	const formData = await request.formData();
	const currentPassword = formData.get('currentPassword');
	const newPassword = formData.get('newPassword');
	const confirmPassword = formData.get('confirmPassword');

	if (newPassword !== confirmPassword) {
		return json({ error: 'New passwords do not match' });
	}

	// Verify current password
	const currentUser = await getUserById(user.id);
	if (!currentUser) {
		return json({ error: 'User not found' });
	}

	const isValid = await bcrypt.compare(currentPassword, currentUser.password);
	if (!isValid) {
		return json({ error: 'Current password is incorrect' });
	}

	await updateUserPassword(user.id, newPassword);
	return json({ success: true });
}

export default function Profile() {
	const { user } = useLoaderData();
	const actionData = useActionData();

	return (
		<Layout>
			<div className='profile-container'>
				<h1>My Profile</h1>

				<div className='profile-info'>
					<h2>Account Information</h2>
					<p>
						<strong>Email:</strong> {user.email}
					</p>
					<p>
						<strong>Name:</strong> {`${user.firstName || ''} ${user.lastName || ''}`}
					</p>
					<p>
						<strong>Role:</strong> {user.role}
					</p>
				</div>

				<div className='password-form'>
					<h2>Change Password</h2>
					<Form method='post'>
						<div className='form-group'>
							<label htmlFor='currentPassword'>Current Password</label>
							<input
								type='password'
								name='currentPassword'
								id='currentPassword'
								required
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='newPassword'>New Password</label>
							<input
								type='password'
								name='newPassword'
								id='newPassword'
								required
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='confirmPassword'>Confirm New Password</label>
							<input
								type='password'
								name='confirmPassword'
								id='confirmPassword'
								required
							/>
						</div>
						{actionData?.error && <div className='error-message'>{actionData.error}</div>}
						{actionData?.success && <div className='success-message'>Password updated successfully</div>}
						<button
							type='submit'
							className='btn btn-primary'
						>
							Update Password
						</button>
					</Form>
				</div>
			</div>
		</Layout>
	);
}
