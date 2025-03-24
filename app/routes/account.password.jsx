import { Form, useActionData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { updateSonarPassword } from '../sonar.server';
import Layout from '../components/layout/Layout';
import { getSession } from '../utils/session.server';

export async function action({ request }) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');

	if (!userData) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const formData = await request.formData();
	const currentPassword = formData.get('currentPassword');
	const newPassword = formData.get('newPassword');
	const confirmPassword = formData.get('confirmPassword');

	// Basic validation
	if (newPassword !== confirmPassword) {
		return json({ error: 'New passwords do not match' });
	}

	if (newPassword.length < 8) {
		return json({ error: 'Password must be at least 8 characters long' });
	}

	try {
		const result = await updateSonarPassword(userData.email, currentPassword, newPassword);

		if (!result.success) {
			return json({ error: result.error });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Password update error:', error);
		return json({ error: 'Failed to update password' });
	}
}

export default function ChangePassword() {
	const actionData = useActionData();

	return (
		<Layout>
			<div className='container'>
				<div className='content-centered'>
					<div className='account-section'>
						<h2>Change Password</h2>
						<Form method='post'>
							<div className='form-group'>
								<label htmlFor='currentPassword'>Current Password</label>
								<input
									type='password'
									id='currentPassword'
									name='currentPassword'
									required
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='newPassword'>New Password</label>
								<input
									type='password'
									id='newPassword'
									name='newPassword'
									required
									minLength={8}
								/>
							</div>

							<div className='form-group'>
								<label htmlFor='confirmPassword'>Confirm New Password</label>
								<input
									type='password'
									id='confirmPassword'
									name='confirmPassword'
									required
									minLength={8}
								/>
							</div>

							<button type='submit'>Update Password</button>

							{actionData?.error && <p className='error'>{actionData.error}</p>}
							{actionData?.success && <p className='success'>Password updated successfully!</p>}
						</Form>
					</div>
				</div>
			</div>
		</Layout>
	);
}
