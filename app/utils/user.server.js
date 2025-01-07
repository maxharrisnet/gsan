import { getSession } from './session.server';
import { fetchStorefrontApi } from './api.server';
import { getProviderMetafields } from './provider.server';

export async function getUserData(request) {
	const session = await getSession(request.headers.get('Cookie'));
	const customerAccessToken = session.get('customerAccessToken');

	if (!customerAccessToken) {
		return null;
	}

	const query = `
    query GetCustomerData($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        firstName
        lastName
        email
        metafields(first: 10) {
          edges {
            node {
              key
              value
            }
          }
        }
      }
    }
  `;

	const variables = { customerAccessToken };

	try {
		const response = await fetchStorefrontApi({ query, variables });
		const customerData = response.data.customer;

		const isProvider = customerData.metafields.edges.some((edge) => edge.node.key === 'is_provider' && edge.node.value === 'true');

		const providerName = isProvider ? customerData.metafields.edges.find((edge) => edge.node.key === 'provider_name')?.node.value : null;

		const userData = {
			id: customerData.id,
			name: `${customerData.firstName} ${customerData.lastName}`,
			email: customerData.email,
			isProvider,
			providerName,
		};

		if (isProvider) {
			const providerMetafields = await getProviderMetafields(customerData.id);
			userData.providerMetafields = providerMetafields;
		}

		return userData;
	} catch (error) {
		console.error('Error fetching user data:', error);
		return null;
	}
}
