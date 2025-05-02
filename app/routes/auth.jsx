import { Form, useActionData, Link } from '@remix-run/react';
import { json } from '@remix-run/node';
import { verifyLogin } from '../utils/auth.server';
import { createUserSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';

export async function action({ request }) {
	const formData = await request.formData();
	const email = formData.get('email');
	const password = formData.get('password');

	const user = await verifyLogin(email, password);

	if (!user) {
		return json({ error: 'Invalid email or password' });
	}

	return createUserSession(user, '/map');
}

export default function Auth() {
	const actionData = useActionData();

	return (
		<Layout>
			<div className='container auth-container'>
				<div className='content-centered'>
					<img
						src='/assets/images/switch-logo.png'
						alt='Switch Logo'
						className='login-logo'
					/>
					<h1>Login</h1>
					<Form
						method='post'
						className='auth-form'
					>
						<div className='form-group '>
							<label htmlFor='email'>Email</label>
							<input
								type='email'
								name='email'
								id='email'
								required
							/>
						</div>
						<div className='form-group'>
							<label htmlFor='password'>Password</label>
							<input
								type='password'
								name='password'
								id='password'
								required
							/>
						</div>
						{actionData?.error && <div className='error-message'>{actionData.error}</div>}
						<button
							type='submit'
							className='btn btn-primary'
						>
							Login
						</button>
					</Form>
					<div>
						<Link to='reset-password'>Forgot Password</Link>
					</div>
				</div>
			</div>
		</Layout>
	);
}
