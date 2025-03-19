import { Form, useActionData } from '@remix-run/react';
import authenticateSonarUser from '../sonar.server';
import Layout from '../components/layout/Layout';
import { json } from '@remix-run/node';
import { createUserSession } from '../utils/session.server';

export async function action({ request }) {
	const formData = await request.formData();
	const username = formData.get('username');
	const password = formData.get('password');

	console.log('🔍 Login attempt for username:', username);

	try {
		console.log('🔄 Calling authenticateSonarUser...');
		const result = await authenticateSonarUser(username, password);
		console.log('🔄 Authentication result:', JSON.stringify(result, null, 2));

		if (!result || !result.success) {
			console.log('❌ Authentication failed:', result?.error || 'No error details');
			return json({ error: result?.error || 'Authentication failed' });
		}

		console.log('✅ Authentication successful, creating session');
		// Create user session if authentication successful
		return createUserSession(result.userData, '/map');
	} catch (error) {
		console.error('❌ Login error:', error.message);
		console.error('Error stack:', error.stack);
		return json({ error: 'An unexpected error occurred during login' });
	}
}

export default function Auth() {
	const actionData = useActionData();

	return (
		<Layout>
			<div className='container'>
				<div className='content-centered'>
					<img
						src='/assets/images/switch-logo.png'
						alt='Switch Logo'
						className='login-logo'
					/>
					<Form method='post'>
						<div className='form-group'>
							<input
								type='text'
								name='username'
								placeholder='Username'
								required
							/>
							<input
								type='password'
								name='password'
								placeholder='Password'
								required
							/>
							<button type='submit'>Login</button>
						</div>
						{actionData?.error && <p className='error'>{actionData.error}</p>}
					</Form>
				</div>
			</div>
		</Layout>
	);
}
