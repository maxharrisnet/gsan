import { json } from '@remix-run/node';
import { useLoaderData, useParams } from '@remix-run/react';
import { getSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';
// Only import customer-specific styles
import styles from '../styles/customers.css?url';

export function links() {
	// Only include customer-specific styles
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request, params }) {
	const session = await getSession(request.headers.get('Cookie'));
	const userData = session.get('userData');
	const { provider } = params;

	if (!userData) {
		throw json({ message: 'Not authenticated' }, { status: 401 });
	}

	// Validate provider
	// const validProviders = ['gsan', 'sonar'];
	// if (!validProviders.includes(provider)) {
	// 	throw json({ message: 'Invalid provider' }, { status: 400 });
	// }

	try {
		let customers = [];

		if (provider === 'gsan') {
			// Fetch Shopify customers
			const { shop } = userData;
			const response = await fetch(`https://${shop}/api/2024-01/graphql.json`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
				},
				body: JSON.stringify({
					query: `
            query {
              customers(
                first: 50,
                query: "metafield.namespace:gsan AND metafield.key:customer_type"
              ) {
                edges {
                  node {
                    id
                    firstName
                    lastName
                    email
                    defaultAddress {
                      city
                      province
                    }
                    metafields(first: 5) {
                      edges {
                        node {
                          namespace
                          key
                          value
                        }
                      }
                    }
                    orders(first: 1, sortKey: CREATED_AT, reverse: true) {
                      edges {
                        node {
                          id
                          financialStatus
                          currentTotalPrice {
                            amount
                            currencyCode
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          `,
				}),
			});

			const { data } = await response.json();
			customers = data?.customers?.edges || [];
		} else if (provider === 'sonar') {
			// Add Sonar customers fetch logic here
			// customers = await fetchSonarCustomers(userData);
		}

		return json({
			customers,
			provider: provider.toUpperCase(),
		});
	} catch (error) {
		console.error('Error fetching customers:', error);
		return json({ customers: [], provider: provider.toUpperCase() });
	}
}

export default function Customers() {
	const { customers, provider } = useLoaderData();
	const params = useParams();

	return (
		<Layout>
			<main className='content'>
				<div className='container'>
					<header className='section'>
						<div className='header-content'>
							<h1>{provider} Customers</h1>
							<div className='header-actions'>
								<select
									value={params.provider}
									onChange={(e) => (window.location.href = `/${e.target.value}/customers`)}
								>
									<option value='gsan'>GSAN</option>
									<option value='sonar'>SONAR</option>
								</select>
							</div>
						</div>
					</header>

					{/* Rest of your existing table code */}
				</div>
			</main>
		</Layout>
	);
}
