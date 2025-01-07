import { fetchStorefrontApi } from './api.server';
import { getSession } from './session.server';

export async function getProviderCustomers(request) {
	const session = await getSession(request.headers.get('Cookie'));
	const providerData = session.get('userData');

	if (!providerData || !providerData.is_provider) {
		throw new Error('Unauthorized access');
	}

	const query = `
    query GetCustomers($provider: String!) {
      customers(first: 100, query: "metafield_provider_namespace:provider_value:$provider") {
        edges {
          node {
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
      }
    }
  `;

	const variables = { provider: providerData.provider };

	const response = await fetchStorefrontApi({ query, variables });

	return response.data.customers.edges.map((edge) => {
		const customer = edge.node;
		const serviceMetafield = customer.metafields.edges.find((m) => m.node.key === 'service');
		const statusMetafield = customer.metafields.edges.find((m) => m.node.key === 'status');

		return {
			id: customer.id,
			name: `${customer.firstName} ${customer.lastName}`,
			email: customer.email,
			service: serviceMetafield ? serviceMetafield.node.value : 'N/A',
			status: statusMetafield ? statusMetafield.node.value : 'N/A',
		};
	});
}

export async function getProviderMetafields(providerId) {
	const query = `
    query GetProviderMetafields($providerId: ID!) {
      customer(id: $providerId) {
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

	const variables = { providerId };

	const response = await fetchStorefrontApi({ query, variables });

	return response.data.customer.metafields.edges.map((edge) => edge.node);
}
