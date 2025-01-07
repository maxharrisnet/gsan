import { useActionData } from '@remix-run/react';
import { redirect } from '@remix-run/node';
import { fetchStorefrontApi } from '../utils/api.server';
import { createUserSession, getSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';

const customerLoginMutation = `
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {fetchStorefrontAp
        accessToken
      }
      customerUserErrors {
        message
      }
    }
  }
`;

// Loader to handle GET requests and serve the login page
export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	const customerAccessToken = session.get('customerAccessToken');

	// Redirect to the dashboard if the user is already logged in
	if (customerAccessToken) {
		return redirect('/dashboard');
	}

	// Render the login page if no customer session exists
	return {};
};

// Action to handle POST requests for customer login
export const action = async ({ request }) => {
	const formData = await request.formData();
	const email = formData.get('email');
	const password = formData.get('password');

	if (!email || !password) {
		return { errors: [{ message: 'Email and password are required.' }] }, { status: 400 };
	}

	try {
		const shop = process.env.SHOPIFY_STORE_DOMAIN;
		const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
		console.log('🦁 Storefront Access Token: ', storefrontAccessToken);

		if (!shop || !storefrontAccessToken) {
			throw new Error('Missing shop or storefront access token in environment variables');
		}

		const response = await fetchStorefrontApi({
			shop,
			storefrontAccessToken,
			query: customerLoginMutation,
			variables: { input: { email, password } },
		});

		const { customerAccessTokenCreate } = response.data;

		if (customerAccessTokenCreate.customerUserErrors.length) {
			return { errors: customerAccessTokenCreate.customerUserErrors }, { status: 401 };
		}

		const { accessToken, expiresAt } = customerAccessTokenCreate.customerAccessToken;

		// Save the user session and redirect to /dashboard
		return await createUserSession({ customerAccessToken: accessToken, expiresAt }, '/dashboard');
	} catch (error) {
		console.error('🐸 Error during customer login:', error);
		return { errors: [{ message: 'An unexpected error occurred. Please try again.' }] }, { status: 500 };
	}
};

export default function Login() {
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
					<form method='post'>
						<div className='form-group'>
							<label
								htmlFor='email'
								className='sr-only'
							>
								Email
							</label>
							<input
								type='email'
								id='email'
								name='email'
								placeholder='Email'
								required
							/>
							<label
								htmlFor='password'
								className='sr-only'
							>
								Password
							</label>
							<input
								type='password'
								id='password'
								name='password'
								placeholder='Password'
								required
							/>
							<button type='submit'>Login</button>
						</div>
						{actionData?.errors && (
							<div className='error-messages'>
								<h2>Errors:</h2>
								<ul>
									{actionData.errors.map((error, index) => (
										<li key={index}>{error.message}</li>
									))}
								</ul>
							</div>
						)}
					</form>
				</div>
			</div>
		</Layout>
	);
}
