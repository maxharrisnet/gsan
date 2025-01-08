export const loader = async ({ request }) => {
	const url = new URL(request.url);
	const shop = url.searchParams.get('shop');

	console.log('🔐 Request URL:', request);
	console.log('🔐 Shop:', shop);

	try {
		const { admin } = await shopify.authenticate.admin(request, shop);
		console.log('🎉 Admin:', admin);

		const storefrontTokenResponse = await admin.graphql(
			`#graphql
      mutation StorefrontAccessTokenCreate($input: StorefrontAccessTokenInput!) {
        storefrontAccessTokenCreate(input: $input) {
          userErrors {
            field
            message
          }
          storefrontAccessToken {
            accessToken
            accessScopes {
              handle
            }
          }
        }
      }`,
			{
				input: {
					title: 'GSAN Storefront Token',
					accessScopes: ['unauthenticated_read_product_listings', 'unauthenticated_read_customers', 'unauthenticated_read_checkouts'],
				},
			}
		);

		console.log('💠 Storefront Token Response:', storefrontTokenResponse);

		const { storefrontAccessTokenCreate } = storefrontTokenResponse;
		if (storefrontAccessTokenCreate.userErrors.length > 0) {
			console.error('Error creating storefront access token:', storefrontAccessTokenCreate.userErrors);
			throw new Error(`Error creating storefront access token: ${storefrontAccessTokenCreate.userErrors.map((error) => error.message).join(', ')}`);
		}

		const accessToken = storefrontAccessTokenCreate.storefrontAccessToken.accessToken;
		return {
			access_token: accessToken,
			expires_in: 0, // Shopify storefront access tokens do not expire
		};
	} catch (error) {
		console.error('Error:', error);
		return { error: 'Failed to create storefront access token' }, { status: 500 };
	}
};
