import { Form, useActionData, redirect } from '@remix-run/react';
import { authenticateShopifyCustomer } from '../utils/user.server';
import authenticateSonarUser from '../sonar.server';
import Layout from '../components/layout/Layout';
import { json } from '@remix-run/node';
import { getSession } from '../utils/session.server';
import { createUserSession } from '../utils/session.server';

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

			// Get user's kits after successful authentication
			const session = await getSession(request.headers.get('Cookie'));
			const userData = session.get('userData');
			const userKits = userData?.metafields?.kits ? userData.metafields.kits.split(',').map((kit) => kit.trim()) : [];

			// If no kits, redirect to error page
			if (!userKits.length) {
				return redirect('/no-kits');
			}

			// Get first kit ID (excluding 'ALL')
			const firstKitId = userKits.find((kit) => kit !== 'ALL') || userKits[0];

			// Create session and redirect to modem page
			return createUserSession(userData, `/modem/starlink/${firstKitId}`);
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
