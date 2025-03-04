import { redirect } from '@remix-run/node';
import { getSession, destroySession } from '../utils/session.server';

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	return redirect('/auth', {
		headers: {
			'Set-Cookie': await destroySession(session),
		},
	});
};

export default function Logout() {
	const navigate = useNavigate();

	useEffect(() => {
		// Clear all client-side storage
		sessionStorage.clear();
		localStorage.clear();
		console.log('✅ Storage cleared');

		// Trigger server-side session destruction via loader
		fetch('/auth/logout')
			.then(() => navigate('/auth', { replace: true }))
			.catch(() => navigate('/auth', { replace: true }));
	}, [navigate]);

	return <p>Logging out...</p>;
}
