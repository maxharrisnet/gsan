import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { getCustomerData } from '../gsan.server';
import { getSonarAccountData, getSonarAccoutUsageData, getSonarInventoryItems, getSonarServicePlan } from '../sonar.server';
import { getSession } from '../utils/session.server';
import Layout from '../components/layout/Layout';
import { useUser } from '../context/UserContext';
import styles from '../styles/profile.css?url';

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	const cookieHeader = request.headers.get('Cookie');
	if (!cookieHeader) {
		throw json({ message: 'No session found' }, { status: 401 });
	}

	const session = await getSession(cookieHeader);
	if (!session) {
		throw json({ message: 'Invalid session' }, { status: 401 });
	}

	// Debug the actual session data
	console.log('🔍 Session debug:', {
		sessionExists: Boolean(session),
		cookieExists: Boolean(cookieHeader),
		sessionData: session.data, // Access the data property directly
		userData: session.get('userData'), // Try to get the user data specifically
	});

	// Get tokens from userData if that's where they're stored
	const userData = session.get('userData');
	const customerAccessToken = userData?.customerAccessToken || session.get('customerAccessToken');
	const sonarAccountId = userData?.sonarAccountId || session.get('sonarAccountId');
	const shop = userData?.shop || session.get('shop');

	console.log('🔑 Auth tokens:', {
		customerAccessToken,
		sonarAccountId,
		shop,
		userData, // Log the entire userData object to see its structure
	});

	if (!customerAccessToken) {
		throw json({ message: 'Shopify authentication required' }, { status: 401 });
	}
	if (!sonarAccountId) {
		throw json({ message: 'Sonar authentication required' }, { status: 401 });
	}
	if (!shop) {
		throw json({ message: 'Shop information missing' }, { status: 401 });
	}

	try {
		const shopDomain = String(shop);

		const [shopifyData, sonarAccount, sonarUsage, inventoryItems] = await Promise.all([
			getCustomerData(customerAccessToken, shopDomain).catch((error) => {
				console.error('❌ Shopify API Error:', error);
				return null;
			}),
			getSonarAccountData(sonarAccountId).catch((error) => {
				console.error('❌ Sonar Account Error:', error);
				return { success: false };
			}),
			getSonarAccoutUsageData(sonarAccountId).catch((error) => {
				console.error('❌ Sonar Usage Error:', error);
				return { success: false };
			}),
			getSonarInventoryItems(sonarAccountId).catch((error) => {
				console.error('❌ Sonar Inventory Error:', error);
				return { success: false };
			}),
			getSonarServicePlan(sonarAccountId).catch((error) => {
				console.error('❌ Sonar Service Plan Error:', error);
				return null;
			}),
		]);

		if (!shopifyData) {
			throw json({ message: 'Failed to load Shopify data' }, { status: 500 });
		}

		return json({
			shopify: shopifyData,
			sonar: {
				account: sonarAccount?.success ? sonarAccount.customers : null,
				usage: sonarUsage?.success ? sonarUsage.data : null,
				inventory: inventoryItems?.success ? inventoryItems.data : null,
				servicePlan: sonarServicePlan?.success ? sonarServicePlan.data : null,
			},
		});
	} catch (error) {
		console.error('❌ Error in profile loader:', error);
		throw json(
			{
				message: 'Failed to load profile data',
				details: process.env.NODE_ENV === 'development' ? error.message : undefined,
			},
			{ status: 500 }
		);
	}
}

export default function Profile() {
	const { shopify, sonar } = useLoaderData();

	if (!shopify || !sonar) {
		return (
			<Layout>
				<div className='error-message'>Unable to load profile data. Please try again later.</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<main className='content'>
				<div className='profile-container'>
					<h1>Account Profile</h1>

					<div className='section'>
						<h2>Personal Information</h2>
						<div className='info-grid'>
							<div className='info-item'>
								<label>Name</label>
								<p>
									{shopify?.firstName || ''} {shopify?.lastName || ''}
								</p>
							</div>
							<div className='info-item'>
								<label>Email</label>
								<p>{shopify?.email || 'No email provided'}</p>
							</div>
							<div className='info-item'>
								<label>Account ID</label>
								<p>{sonar?.account?.id || 'N/A'}</p>
							</div>
						</div>
					</div>

					{sonar?.account && (
						<div className='section'>
							<h2>Service Details</h2>
							<div className='info-grid'>
								<div className='info-item'>
									<label>Account Status</label>
									<p className={`status status-${(sonar.account.status || '').toLowerCase()}`}>{sonar.account.status || 'Unknown'}</p>
								</div>
								<div className='info-item'>
									<label>Service Plan</label>
									<p>{sonar.account.service_plan || 'Not available'}</p>
								</div>
								{sonar?.usage && (
									<div className='info-item'>
										<label>Current Usage</label>
										<p>{sonar.usage.total_usage || '0'} GB</p>
									</div>
								)}
							</div>
						</div>
					)}

					{sonar?.inventory?.length > 0 && (
						<div className='section'>
							<h2>Equipment</h2>
							<div className='info-grid'>
								{sonar.inventory.map((item, index) => (
									<div
										key={index}
										className='info-item'
									>
										<label>{item?.type || 'Device'}</label>
										<p>{item?.model || 'Unknown model'}</p>
										<small>{item?.serial_number || 'No serial number'}</small>
									</div>
								))}
							</div>
						</div>
					)}

					{shopify?.orders?.edges?.length > 0 && (
						<div className='section'>
							<h2>Recent Orders</h2>
							<div className='orders-grid'>
								{shopify.orders.edges.map(({ node: order }) => (
									<div
										key={order.id}
										className='info-item'
									>
										<label>Order #{order.orderNumber}</label>
										<p>
											{order.lineItems.edges[0]?.node?.title || 'Unknown item'}
											<br />
											<small>
												{new Date(order.processedAt).toLocaleDateString()}
												{' - '}
												{order.totalPrice?.amount || '0'} {order.totalPrice?.currencyCode || 'USD'}
											</small>
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</main>
		</Layout>
	);
}
