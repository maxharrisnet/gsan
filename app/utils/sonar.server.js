export async function getSonarServicePlan(accountId) {
	try {
		const response = await fetch(`${SONAR_API_URL}/api/v1/service_plans/${accountId}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${SONAR_API_KEY}`,
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();
		return data;
	} catch (error) {
		console.error('🔴 Error fetching Sonar service plan:', error);
		return null;
	}
}
