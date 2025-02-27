import { getSession, createUserSession } from './session.server';
import { fetchServicesAndModemData } from '../compass.server';

// Helper for Storefront API
const fetchStorefrontApi = async ({ shop, storefrontAccessToken, query, variables }) => {
	try {
		const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
			},
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Storefront API error: ${errorText}`);
		}

		const result = await response.json();
		return result;
	} catch (error) {
		console.error('Error in Storefront API call:', error);
		throw error;
	}
};

export async function authenticateShopifyCustomer(email, password, request) {
	const customerLoginMutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
        }
        customerUserErrors {
          message
        }
      }
    }
  `;

	try {
		const response = await fetchStorefrontApi({
			shop: process.env.SHOPIFY_STORE_DOMAIN,
			storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			query: customerLoginMutation,
			variables: { input: { email, password } },
		});

		const { customerAccessTokenCreate } = response.data;

		if (customerAccessTokenCreate.customerUserErrors.length) {
			console.log('🚫 Login failed:', customerAccessTokenCreate.customerUserErrors);
			return { error: customerAccessTokenCreate.customerUserErrors[0].message };
		}

		const accessToken = customerAccessTokenCreate.customerAccessToken.accessToken;

		// Updated query with correct metafields syntax
		const customerQuery = `
      query CustomerDetails($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          firstName
          lastName
          email
          metafields(identifiers: [
            {
              namespace: "custom",
              key: "kits"
            }
          ]) {
            value
            key
          }
        }
      }
    `;

		const customerResponse = await fetchStorefrontApi({
			shop: process.env.SHOPIFY_STORE_DOMAIN,
			storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			query: customerQuery,
			variables: { customerAccessToken: accessToken },
		});

		console.log('👤 Customer Response:', customerResponse);

		if (!customerResponse?.data?.customer) {
			console.error('❌ No customer data in response:', customerResponse);
			return { error: 'Failed to fetch customer data' };
		}

		const customer = customerResponse.data.customer;
		const kitsMetafield = customer.metafields.find((m) => m.key === 'kits');
		if (kitsMetafield?.value === 'ALL') {
			const { services } = await fetchServicesAndModemData();
			const allKits = services.flatMap((service) => service.modems?.map((modem) => modem.id)).filter(Boolean);
			kitsMetafield.value = allKits.join(',');
		}

		const userData = {
			customerAccessToken: accessToken,
			shop: process.env.SHOPIFY_STORE_DOMAIN,
			email,
			type: 'shopify',
			metafields: {
				kits: kitsMetafield?.value || '',
			},
			primaryKitPath: `/modem/starlink/${kitsMetafield?.value?.split(',')[0]?.trim()}`,
		};

		console.log('✅ Authentication successful, creating session with:', userData);

		const kits = userData.metafields.kits.split(',').map((kit) => kit.trim());
		const primaryKitPath = userData.primaryKitPath;

		if (kits.length === 0) {
			return createUserSession(userData, '/no-kits');
		}

		// If kits includes 'ALL', fetch all available kits from the API
		if (kits.includes('ALL')) {
			try {
				const { services } = await fetchServicesAndModemData();
				// Ensure we await and properly handle the services data
				if (!services || services.length === 0) {
					console.error('🚫 No services found');
					return createUserSession(userData, '/no-kits');
				}

				// Get the first available kit ID from the services
				const firstAvailableKit = services.flatMap((service) => service.modems?.map((modem) => modem.id)).filter(Boolean)[0];

				if (!firstAvailableKit) {
					console.error('🚫 No available kits found in services');
					return createUserSession(userData, '/no-kits');
				}

				const kitPath = `/modem/starlink/${firstAvailableKit}`;

				console.log('🎯 Selected first available kit:', kitPath);
				return createUserSession(userData, kitPath);
			} catch (error) {
				console.error('❌ Error fetching services for ALL kits:', error);
				return { error: 'Failed to fetch available kits' };
			}
		}

		// For non-ALL cases, use the first kit from the user's list
		console.log('🎯 Redirecting to:', primaryKitPath);
		return createUserSession(userData, primaryKitPath);
	} catch (error) {
		console.error('❌ Authentication error:', error);
		return { error: 'An unexpected error occurred during authentication' };
	}
}

export async function getUserData(request) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');
	const customerAccessToken = userData?.customerAccessToken;
	const shop = process.env.SHOPIFY_STORE_DOMAIN;

	if (!customerAccessToken) {
		return null;
	}

	try {
		const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				query: `
          query($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              id
              firstName
              lastName
              email
            }
          }
        `,
				variables: { customerAccessToken },
			}),
		});
		const data = await response.json();
		if (response.ok && data?.data?.customer) {
			return data.data.customer;
		} else {
			console.error('Error fetching customer data:', data.errors || response.statusText);
			return null;
		}
	} catch (error) {
		console.error('Error during customer data fetch:', error);
		return null;
	}
}
