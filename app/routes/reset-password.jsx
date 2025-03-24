import Layout from '../components/layout/Layout';
import { Form, useActionData } from '@remix-run/react';
import { json } from '@remix-run/node';
import { requestPasswordReset } from '../sonar.server';

export async function action({ request }) {
	const formData = await request.formData();
	const email = formData.get('email');

	try {
		const result = await requestPasswordReset(email);

		if (!result.success) {
			return json({ error: result.error });
		}

		return json({
			success: true,
			message: 'Password reset instructions have been sent to your email',
		});
	} catch (error) {
		console.error('Password reset request error:', error);
		return json({ error: 'Failed to request password reset' });
	}
}

export default function ResetPassword() {
	const actionData = useActionData();

	return (
		<Layout>
			<div className='container'>
				<div className='content-centered'>
					<div className='reset-password-container'>
						<h2>Reset Password</h2>
						<Form method='post'>
							<div className='form-group'>
								<label htmlFor='email'>Email Address</label>
								<input
									type='email'
									id='email'
									name='email'
									required
								/>
							</div>

							<button type='submit'>Request Password Reset</button>

							{actionData?.error && <p className='error'>{actionData.error}</p>}
							{actionData?.success && <p className='success'>{actionData.message}</p>}
						</Form>
					</div>
				</div>
			</div>
		</Layout>
	);
}
