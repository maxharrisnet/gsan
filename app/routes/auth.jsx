import { Form, useActionData } from '@remix-run/react';
import { authenticateShopifyCustomer, authenticateSonarUser } from '../utils/user.server';
import Layout from '../components/layout/Layout';

export async function action({ request }) {
	const formData = await request.formData();
	const loginType = formData.get('loginType');
	const email = formData.get('email');
	const password = formData.get('password');

	if (loginType === 'shopify') {
		return authenticateShopifyCustomer(email, password, request);
	} else if (loginType === 'sonar') {
		return authenticateSonarUser(formData);
	}

	return { error: 'Invalid login type' };
}

export default function Auth() {
	const actionData = useActionData();

	return (
		<Layout>
			<div className='container'>
				<h1>GSAN Customer Portal</h1>
				<div className='content-centered'>
					<img
						src='/assets/images/GSAN-logo.png'
						alt='GSAN Logo'
						className='login-logo'
					/>
					<Form method='post'>
						<div className='form-group'>
							<select name='loginType'>
								<option value='shopify'>GSAN Customer</option>
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
