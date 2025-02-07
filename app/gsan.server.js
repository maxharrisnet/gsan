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

export async function fetchShopifyOrderData(modemId) {
	try {
		console.log('🛍️ Fetching Shopify order data for modem:', modemId);

		const response = await fetch(`https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
			},
			body: JSON.stringify({
				query: `
          query($modemId: String!) {
            orders(first: 10, query: "line_items_property_modem_id:$modemId") {
              edges {
                node {
                  id
                  orderNumber
                  createdAt
                  processedAt
                  currentTotalPrice {
                    amount
                    currencyCode
                  }
                  totalPrice {
                    amount
                    currencyCode
                  }
                  fulfillmentStatus
                  financialStatus
                  nextBillingDate
                }
              }
            }
          }
        `,
				variables: { modemId },
			}),
		});

		if (!response.ok) {
			throw new Error(`Shopify API error: ${response.status}`);
		}

		const { data } = await response.json();
		const orders = data?.orders?.edges?.map((edge) => edge.node) || [];
		console.log('🛍️ Shopify orders received:', orders);

		// Get the latest order
		const latestOrder = orders[0];

		return {
			total_orders: orders.length,
			active_services: orders.filter((o) => o.financialStatus === 'PAID').length,
			last_order_date: latestOrder?.createdAt,
			order_status: latestOrder?.fulfillmentStatus || 'UNFULFILLED',
			next_billing_date: latestOrder?.nextBillingDate,
			monthly_cost: latestOrder?.currentTotalPrice?.amount,
			last_payment_amount: latestOrder?.totalPrice?.amount,
			last_payment_date: latestOrder?.processedAt,
			payment_status: latestOrder?.financialStatus,
		};
	} catch (error) {
		console.error('🚨 Error fetching Shopify order data:', error);
		return {};
	}
}
