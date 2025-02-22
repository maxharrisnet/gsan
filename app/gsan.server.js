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
              phone
              createdAt
              updatedAt
              tags
              acceptsMarketing
              addresses(first: 10) {
                edges {
                  node {
                    id
                    address1
                    address2
                    city
                    province
                    zip
                    country
                    phone
                    name
                    company
                  }
                }
              }
              defaultAddress {
                id
                address1
                address2
                city
                province
                zip
                country
                phone
                name
                company
              }
              orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
                edges {
                  node {
                    id
                    name
                    orderNumber
                    processedAt
                    statusUrl
                    currencyCode
                    totalPrice {
                      amount
                      currencyCode
                    }
                    subtotalPrice {
                      amount
                      currencyCode
                    }
                    totalShippingPrice {
                      amount
                      currencyCode
                    }
                    lineItems(first: 5) {
                      edges {
                        node {
                          title
                          quantity
                          originalTotalPrice {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                    fulfillmentStatus
                    financialStatus
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
