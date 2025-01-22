import { useRouteError } from '@remix-run/react';

export default function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className='error-container'>
			<h1>Oops! Something went wrong</h1>
			<p>{error.message || 'An unexpected error occurred.'}</p>
			{error.stack && process.env.NODE_ENV === 'development' && <pre className='error-stack'>{error.stack}</pre>}
		</div>
	);
}
