export async function getProviderCustomers(providerId) {
	// Implement fetching customers for a specific provider
}

export async function getProviderMetafields(providerId) {
	// Implement fetching provider-specific metafields
}

export async function validateCustomerAccess(customerData) {
	// Check if wholesale customer
	const isWholesale = customerData.metafields?.edges?.find((edge) => edge.node.namespace === 'gsan' && edge.node.key === 'is_wholesale_customer')?.node.value === 'true';

	if (!isWholesale) {
		throw new Error('Please contact sales@gsan.co for wholesale access');
	}

	// Get kits access list
	const kitsMetafield = customerData.metafields?.edges?.find((edge) => edge.node.namespace === 'gsan' && edge.node.key === 'kits')?.node.value;

	if (!kitsMetafield) {
		throw new Error('No kits have been assigned to your account');
	}

	// Get company name
	const companyName = customerData.metafields?.edges?.find((edge) => edge.node.namespace === 'gsan' && edge.node.key === 'company_name')?.node.value;

	return {
		isWholesale,
		kits: kitsMetafield === 'ALL' ? 'ALL' : kitsMetafield.split(',').map((k) => k.trim()),
		companyName,
	};
}

// Helper to check if user has access to a specific kit
export function hasKitAccess(userKits, kitId) {
	if (!userKits) return false;
	if (userKits === 'ALL') return true;
	return userKits.includes(kitId);
}
