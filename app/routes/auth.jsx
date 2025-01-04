// app/routes/auth.jsx
import { authenticateShopifyCustomer, authenticateSonarUser } from '../utils/auth.server';

export async function action({ request }) {
	const formData = await request.formData();
	const loginType = formData.get('loginType');

	if (loginType === 'shopify') {
		return authenticateShopifyCustomer(formData);
	} else if (loginType === 'sonar') {
		return authenticateSonarUser(formData);
	}

	return { error: 'Invalid login type' };
}

export default function Auth() {
	return (
		<div>
			<h1>Login</h1>
			<Form method='post'>
				<select name='loginType'>
					<option value='shopify'>GSAN Customer</option>
					<option value='sonar'>Switch User</option>
				</select>
				{/* Add input fields for username/email and password */}
				<button type='submit'>Login</button>
			</Form>
		</div>
	);
}
