import { json } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData, Form, useActionData } from '@remix-run/react';
import Layout from '../components/layout/Layout';
import styles from '../styles/profile.css?url';
import { requireUser, getUserById, updateUserPassword, updateUser } from '../utils/auth.server';
import bcrypt from 'bcryptjs';

export const links = () => [{ rel: 'stylesheet', href: styles }];

export async function loader({ request }) {
	const user = await requireUser(request);
	const userData = await getUserById(user.id);
	return json({ user: userData });
}

export async function action({ request }) {
	const user = await requireUser(request);
	const formData = await request.formData();
	const actionType = formData.get('actionType');

	if (actionType === 'updatePassword') {
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
		return json({ success: true, message: 'Password updated successfully' });
	}

	if (actionType === 'updateProfile') {
		const updates = {
			email: formData.get('email'),
			firstName: formData.get('firstName'),
			lastName: formData.get('lastName'),
			companyName: formData.get('companyName'),
			kits:
				formData
					.get('kits')
					?.split(',')
					.map((kit) => kit.trim()) || [],
		};

		await updateUser(user.id, updates);
		return json({ success: true, message: 'Profile updated successfully' });
	}

	return json({ error: 'Invalid action' });
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
					<Form
						method='post'
						className='profile-form'
					>
						<input
							type='hidden'
							name='actionType'
							value='updateProfile'
						/>

						<div className='form-group'>
							<label htmlFor='email'>Email</label>
							<input
								type='email'
								name='email'
								id='email'
								defaultValue={user.email}
								required
							/>
						</div>

						<div className='form-group'>
							<label htmlFor='firstName'>First Name</label>
							<input
								type='text'
								name='firstName'
								id='firstName'
								defaultValue={user.firstName || ''}
							/>
						</div>

						<div className='form-group'>
							<label htmlFor='lastName'>Last Name</label>
							<input
								type='text'
								name='lastName'
								id='lastName'
								defaultValue={user.lastName || ''}
							/>
						</div>

						<div className='form-group'>
							<label htmlFor='companyName'>Company Name</label>
							<input
								type='text'
								name='companyName'
								id='companyName'
								defaultValue={user.companyName || ''}
							/>
						</div>

						<div className='form-group'>
							<label htmlFor='kits'>Kits (comma-separated)</label>
							<input
								type='text'
								name='kits'
								id='kits'
								defaultValue={user.kits?.join(', ') || ''}
								placeholder='e.g., kit1, kit2, ALL'
							/>
						</div>

						<div className='form-group'>
							<label>Role</label>
							<p className='role-display'>{user.role}</p>
						</div>

						{actionData?.error && <div className='error-message'>{actionData.error}</div>}
						{actionData?.success && <div className='success-message'>{actionData.message}</div>}

						<button
							type='submit'
							className='btn btn-primary'
						>
							Update Profile
						</button>
					</Form>
				</div>

				<div className='password-form'>
					<h2>Change Password</h2>
					<Form method='post'>
						<input
							type='hidden'
							name='actionType'
							value='updatePassword'
						/>

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
						{actionData?.success && <div className='success-message'>{actionData.message}</div>}
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
