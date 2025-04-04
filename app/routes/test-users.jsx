import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { fetchSonarUsers } from '../sonar.server';

export async function loader() {
	try {
		const usersData = await fetchSonarUsers();

		// Log detailed information for debugging
		console.log('📊 Users Data Structure:', {
			totalUsers: usersData.data?.length || 0,
			sampleUser: usersData.data?.[0] || null,
			fields: usersData.data?.[0] ? Object.keys(usersData.data[0]) : [],
		});

		return json({
			success: true,
			users: usersData.data || [],
			metadata: {
				total: usersData.data?.length || 0,
				fields: usersData.data?.[0] ? Object.keys(usersData.data[0]) : [],
			},
		});
	} catch (error) {
		console.error('Failed to fetch users:', error);
		return json({
			success: false,
			error: error.message,
			details: error.response?.data,
		});
	}
}

export default function TestUsers() {
	const data = useLoaderData();

	if (!data.success) {
		return (
			<div style={{ padding: '20px', color: 'red' }}>
				<h1>Error Loading Users</h1>
				<pre>{JSON.stringify(data.error, null, 2)}</pre>
				{data.details && <pre>{JSON.stringify(data.details, null, 2)}</pre>}
			</div>
		);
	}

	return (
		<div style={{ padding: '20px' }}>
			<h1>Sonar Users Test Page</h1>

			<div style={{ marginBottom: '20px' }}>
				<h2>Metadata</h2>
				<p>Total Users: {data.metadata.total}</p>
				<p>Available Fields: {data.metadata.fields.join(', ')}</p>
			</div>

			<h2>Users List</h2>
			<table style={{ width: '100%', borderCollapse: 'collapse' }}>
				<thead>
					<tr>
						<th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>ID</th>
						<th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>Name</th>
						<th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>Email</th>
						<th style={{ textAlign: 'left', padding: '8px', borderBottom: '2px solid #ddd' }}>Role</th>
						{/* Add more columns based on available fields */}
					</tr>
				</thead>
				<tbody>
					{data.users.map((user) => (
						<tr key={user.id}>
							<td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.id}</td>
							<td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.name || `${user.first_name || ''} ${user.last_name || ''}`}</td>
							<td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.email}</td>
							<td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{user.role}</td>
						</tr>
					))}
				</tbody>
			</table>

			<div style={{ marginTop: '20px' }}>
				<h3>Raw Data:</h3>
				<pre
					style={{
						backgroundColor: '#f5f5f5',
						padding: '15px',
						overflow: 'auto',
						maxHeight: '500px',
					}}
				>
					{JSON.stringify(data.users, null, 2)}
				</pre>
			</div>
		</div>
	);
}
