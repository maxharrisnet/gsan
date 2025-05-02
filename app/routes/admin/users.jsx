import { Form, useLoaderData, useActionData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { requireAdmin } from './utils/auth.server';
import { getAllUsers, createUser, updateUser, deleteUser } from './utils/auth.server';
import Layout from '~/components/layout/Layout';

export async function loader({ request }) {
	await requireAdmin(request);
	const users = await getAllUsers();
	return json({ users });
}

export async function action({ request }) {
	await requireAdmin(request);
	const formData = await request.formData();
	const action = formData.get('action');

	switch (action) {
		case 'create':
			const newUser = {
				email: formData.get('email'),
				password: formData.get('password'),
				firstName: formData.get('firstName'),
				lastName: formData.get('lastName'),
				role: formData.get('role'),
			};
			await createUser(newUser);
			break;
		case 'update':
			const userId = formData.get('userId');
			const updates = {
				email: formData.get('email'),
				firstName: formData.get('firstName'),
				lastName: formData.get('lastName'),
				role: formData.get('role'),
			};
			await updateUser(userId, updates);
			break;
		case 'delete':
			await deleteUser(formData.get('userId'));
			break;
	}

	return json({ success: true });
}

export default function UsersAdmin() {
	const { users } = useLoaderData();
	const actionData = useActionData();

	return (
		<Layout>
			<div className='admin-container'>
				<h1>User Management</h1>

				<div className='user-form'>
					<h2>Create New User</h2>
					<Form method='post'>
						<input
							type='hidden'
							name='action'
							value='create'
						/>
						<div className='form-group'>
							<label htmlFor='email'>Email</label>
							<input
								type='email'
								name='email'
								required
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='password'>Password</label>
							<input
								type='password'
								name='password'
								required
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='firstName'>First Name</label>
							<input
								type='text'
								name='firstName'
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='lastName'>Last Name</label>
							<input
								type='text'
								name='lastName'
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='role'>Role</label>
							<select name='role'>
								<option value='USER'>User</option>
								<option value='ADMIN'>Admin</option>
							</select>
						</div>
						<button
							type='submit'
							className='btn btn-primary'
						>
							Create User
						</button>
					</Form>
				</div>

				<div className='users-list'>
					<h2>Existing Users</h2>
					<table>
						<thead>
							<tr>
								<th>Email</th>
								<th>Name</th>
								<th>Role</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{users.map((user) => (
								<tr key={user.id}>
									<td>{user.email}</td>
									<td>{`${user.firstName || ''} ${user.lastName || ''}`}</td>
									<td>{user.role}</td>
									<td>
										<Form method='post'>
											<input
												type='hidden'
												name='action'
												value='delete'
											/>
											<input
												type='hidden'
												name='userId'
												value={user.id}
											/>
											<button
												type='submit'
												className='btn btn-danger'
											>
												Delete
											</button>
										</Form>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</Layout>
	);
}
