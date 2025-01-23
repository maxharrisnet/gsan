import { redirect } from '@remix-run/node';
import { getSession, createUserSession } from './session.server';

const shop = process.env.SHOPIFY_STORE_DOMAIN;
const storefrontAccessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

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
	console.log(' 🍕 Authenticating Shopify customer...');
	console.log('⛄ Email:', email);
	console.log('⛄ Password:', password);
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
		const session = await getSession(request.headers.get('Cookie'));
		const response = await fetchStorefrontApi({
			shop: process.env.SHOPIFY_STORE_DOMAIN,
			storefrontAccessToken: process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			query: customerLoginMutation,
			variables: { input: { email, password } },
		});

		console.log('🍕 Shopify customer login response:', response);

		const { customerAccessTokenCreate } = response.data;

		if (customerAccessTokenCreate.customerUserErrors.length) {
			console.log('🍕 Shopify customer login failed:', customerAccessTokenCreate.customerUserErrors);
			return { errors: customerAccessTokenCreate.customerUserErrors };
		}

		const accessToken = customerAccessTokenCreate.customerAccessToken.accessToken;

		// Use createUserSession instead of direct session manipulation
		return createUserSession({ customerAccessToken: accessToken }, 'customer', '/');
	} catch (error) {
		console.error('🍕 Error during Shopify customer login:', error);
		return {
			success: false,
			errors: [{ message: 'An unexpected error occurred. Please try again.' }],
		};
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
