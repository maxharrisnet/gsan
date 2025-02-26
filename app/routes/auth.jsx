import { Form, useActionData } from '@remix-run/react';
import { authenticateShopifyCustomer } from '../utils/user.server';
import authenticateSonarUser from '../sonar.server';
import Layout from '../components/layout/Layout';
import { json } from '@remix-run/node';

export async function action({ request }) {
	const formData = await request.formData();
	const loginType = formData.get('loginType');
	const email = formData.get('email');
	const password = formData.get('password');

	try {
		if (loginType === 'shopify') {
			const result = await authenticateShopifyCustomer(email, password, request);
			if (result.error) {
				return json({ error: result.error });
			}
			return result;
		} else if (loginType === 'sonar') {
			return authenticateSonarUser(formData);
		}

		return json({ error: 'Invalid login type' });
	} catch (error) {
		console.error('❌ Login error:', error);
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
							<select name='loginType'>
								<option value='shopify'>Switch Customer</option>
								<option value='sonar'>Sonar User</option>
							</select>
							<input
								type='text'
								name='email'
								placeholder='Email/Username'
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
