export async function getCustomerData(customerAccessToken, shop) {
	if (!customerAccessToken) return null;

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
              orders(first: 10) {
                edges {
                  node {
                    id
                    orderNumber
                    totalPrice {
                      amount
                      currencyCode
                    }
                    processedAt
                    lineItems(first: 1) {
                      edges {
                        node {
                          title
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
				variables: { customerAccessToken },
			}),
		});

		const data = await response.json();
		if (!response.ok) throw new Error('Failed to fetch customer data');
		return data.data.customer;
	} catch (error) {
		console.error('Error fetching customer data:', error);
		return null;
	}
}
