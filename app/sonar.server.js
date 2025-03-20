import axios from 'axios';

const SONAR_API_URL = 'https://switch.sonar.software/api/v1';
const SONAR_API_USERNAME = process.env.SONAR_API_USERNAME;
const SONAR_API_PASSWORD = process.env.SONAR_API_PASSWORD;
const sonarAuth = Buffer.from(`${SONAR_API_USERNAME}:${SONAR_API_PASSWORD}`).toString('base64');

const authenticateSonarUser = async function (username, password) {
	console.log(`🔐 Attempting Sonar authentication for user: ${username}`);

	try {
		const response = await axios.post(
			`${SONAR_API_URL}/customer_portal/auth`,
			{
				username,
				password,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Basic ${sonarAuth}`,
				},
			}
		);

		console.log('📤 Received response from Sonar API');

		if (response.data && response.data.data) {
			console.log('✅ Authentication successful');

			// Extract account ID from authentication response
			const accountId = response.data.data.account_id;

			// Fetch custom fields for this account
			const customFieldsResult = await getSonarCustomFields(accountId);
			console.log('🔄 Custom fields result:', customFieldsResult);

			// Find the kits metafield (assuming the custom field is named "kits" or has a known ID)
			// You may need to adjust this based on how your Sonar custom fields are set up
			let kitsValue = '';
			if (customFieldsResult.success && customFieldsResult.data) {
				// Option 1: If you know the custom_field_id for kits
				const kitsField = customFieldsResult.data.find((field) => field.custom_field_id === 1);

				// Option 2: If the data itself identifies the field as "kits"
				// const kitsField = customFieldsResult.data.find(field => {
				//   // Logic to identify the kits field - may need additional API call
				//   // to get field definitions if not in the current response
				// });

				if (kitsField) {
					kitsValue = kitsField.data || '';
				}
			}

			// Create userData object with metafields similar to Shopify structure
			const userData = {
				accountId,
				username,
				type: 'sonar',
				metafields: {
					kits: kitsValue,
				},
				mapRefreshed: false,
				// Include other relevant user data from response.data.data
				...response.data.data,
			};

			return { success: true, userData };
		} else {
			console.log('❌ Authentication failed: No data in response');
			return { success: false, error: 'Sonar authentication failed' };
		}
	} catch (error) {
		console.error('❌ Sonar authentication error:', error.message);
		return { success: false, error: 'Sonar authentication failed' };
	}
};

export default authenticateSonarUser;

export const getSonarCustomFields = async function (accountId) {
	try {
		console.log(`📊 Fetching custom fields for account: ${accountId}`);

		const response = await axios.get(`${SONAR_API_URL}/entity_custom_fields/account/${accountId}`, {
			headers: {
				Authorization: `Basic ${sonarAuth}`,
			},
		});

		if (response.data && response.data.data) {
			console.log(`✅ Retrieved ${response.data.data.length} custom fields`);
			return { success: true, data: response.data.data };
		} else {
			console.log('⚠️ No custom fields data found in response');
			return { success: false, error: 'Sonar custom fields not found' };
		}
	} catch (error) {
		console.error('❌ Error fetching custom fields:', error.message);
		return { success: false, error: 'Failed to fetch custom fields' };
	}
};

export const getSonarServicePlan = async function (accountId) {
	try {
		const response = await axios.get(`${SONAR_API_URL}/accounts/${accountId}/service_plan`, {
			headers: {
				Authorization: `Basic ${sonarAuth}`,
			},
		});
		return { success: true, data: response.data.data };
	} catch (error) {
		return { success: false, error: 'Failed to fetch service plan' };
	}
};
