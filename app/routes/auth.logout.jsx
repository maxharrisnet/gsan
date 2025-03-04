import { getSession, destroySession } from '../utils/session.server';

export const loader = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	return new Response(null, {
		headers: {
			'Set-Cookie': await destroySession(session),
			Location: '/auth',
		},
		status: 302,
	});
};

export const action = async ({ request }) => {
	const session = await getSession(request.headers.get('Cookie'));
	console.log('🚪 Logging out and destroying session');

	return new Response(null, {
		headers: {
			// Clear both the session cookie and any other cookies
			'Set-Cookie': [await destroySession(session), 'gsan_customer_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly', 'mapRefreshed=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'].join(', '),
			Location: '/auth',
		},
		status: 302,
	});
};

// Add client-side script to clear localStorage and sessionStorage
export default function Logout() {
	return (
		<html>
			<body>
				<p>Logging out...</p>
				<script
					dangerouslySetInnerHTML={{
						__html: `
            // Clear any client-side storage
            try {
              sessionStorage.removeItem('mapRefreshed');
              localStorage.removeItem('lastViewedModem');
              
              // Any other app-specific storage items can be cleared here
              
              console.log("All session data cleared");
              
              // Redirect to login page
              window.location.href = "/auth";
            } catch (err) {
              console.error("Error clearing session data:", err);
              window.location.href = "/auth";
            }
          `,
					}}
				/>
			</body>
		</html>
	);
}
