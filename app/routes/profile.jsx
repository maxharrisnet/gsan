import { json } from '@remix-run/node';
import { useLoaderData, useRouteLoaderData } from '@remix-run/react';
import { getCustomerData } from '../gsan.server';
import Layout from '../components/layout/Layout';
import styles from '../styles/profile.css?url';
import { getSession } from '../utils/session.server';
import { getSonarServicePlan } from '../sonar.server';

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

export async function loader({ request }) {
	try {
		const session = await getSession(request.headers.get('Cookie'));
		const userData = session.get('userData');

		const { customerAccessToken, shop, type } = userData;

		// Get Shopify customer data
		const shopifyCustomer = await getCustomerData(customerAccessToken, shop);
		console.log('🛍️ Shopify Customer Data:', shopifyCustomer);

		// Check if user is a Sonar user
		const isSonarUser = type === 'sonar';

		// Get Sonar service plan if user is a Sonar user
		const sonarServicePlan = isSonarUser ? await getSonarServicePlan(userData) : null;

		return json({
			sonarServicePlan,
			isSonarUser,
			shopifyCustomer,
		});
	} catch (error) {
		console.error('🔴 Profile loader error:', error);
		console.error('🔴 Error stack:', error.stack);

		return json(
			{
				message: 'Failed to load profile data',
				details: error.message,
				sonarServicePlan: null,
				isSonarUser: false,
				shopifyCustomer: null,
			},
			{ status: 500 }
		);
	}
}

export default function Profile() {
	const { sonarServicePlan, isSonarUser, shopifyCustomer } = useLoaderData();

	console.log('🔍 Profile Component Data:', {
		sonarServicePlan,
		isSonarUser,
		shopifyCustomer,
	});

	return (
		<Layout>
			<main className='content'>
				<div className='container'>
					{/* Profile Header */}
					<header className='section'>
						<h1>Profile</h1>
					</header>

					{/* Customer Info Section */}
					{shopifyCustomer ? (
						<div className='section'>
							<h2>Customer Information</h2>
							<div className='info-grid'>
								<div className='info-item'>
									<label>Name</label>
									<p>
										{shopifyCustomer.firstName} {shopifyCustomer.lastName}
									</p>
								</div>
								<div className='info-item'>
									<label>Email</label>
									<p>{shopifyCustomer.email}</p>
								</div>
								{shopifyCustomer.phone && (
									<div className='info-item'>
										<label>Phone</label>
										<p>{shopifyCustomer.phone}</p>
									</div>
								)}
							</div>

							{/* Address Section */}
							{shopifyCustomer.defaultAddress && (
								<div className='address-info'>
									<h3>Default Address</h3>
									<div className='info-grid'>
										<div className='info-item'>
											<label>Street</label>
											<p>{shopifyCustomer.defaultAddress.address1}</p>
											{shopifyCustomer.defaultAddress.address2 && <p>{shopifyCustomer.defaultAddress.address2}</p>}
										</div>
										<div className='info-item'>
											<label>Location</label>
											<p>
												{shopifyCustomer.defaultAddress.city}, {shopifyCustomer.defaultAddress.province} {shopifyCustomer.defaultAddress.zip}
											</p>
											<p>{shopifyCustomer.defaultAddress.country}</p>
										</div>
									</div>
								</div>
							)}
						</div>
					) : (
						<div className='section'>
							<p>No customer information available</p>
						</div>
					)}

					{/* Orders Section */}
					{shopifyCustomer?.orders?.edges?.length > 0 && (
						<div className='section'>
							<h2>Recent Orders</h2>
							<div className='orders-grid'>
								{shopifyCustomer.orders.edges.map(({ node: order }) => (
									<div
										key={order.id}
										className='order-item'
									>
										<h4>Order #{order.orderNumber}</h4>
										<p>
											Total: {order.totalPrice.amount} {order.totalPrice.currencyCode}
										</p>
										<p>Status: {order.fulfillmentStatus}</p>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Service Plan Section */}
					{isSonarUser && (
						<div className='section'>
							<h2>Service Plan Details</h2>
							{sonarServicePlan ? (
								<div className='info-grid'>
									<div className='info-item'>
										<label>Plan Name</label>
										<p>{sonarServicePlan.name}</p>
									</div>
								</div>
							) : (
								<p>Unable to load service plan information</p>
							)}
						</div>
					)}
				</div>
			</main>
		</Layout>
	);
}
