import React from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { Link, Form } from '@remix-run/react';

const Header = () => {
	const location = useLocation();
	const path = location.pathname;
	const userContext = useUser(); // Retrieve the context
	if (!userContext) {
		console.error('Header rendered without UserContext');
		return null;
	}
	const { currentUser, shop } = userContext;
	const isGsanPage = path.includes('/gsan') || currentUser?.authType === 'shopify';
	const isSwitchPage = path.includes('/switch') || currentUser?.authType === 'sonar';

	const userType = isGsanPage ? 'gsan' : 'switch';

	return (
		<header className='header'>
			<div className='header-container'>
				<div className='logo'>
					{/* {isGsanPage && ( */}
					<a href='/'>
						<img
							src='/assets/images/GSAN-logo.png'
							alt='GSAN Logo'
						/>
					</a>
					{/* )} */}
					{/* {!isGsanPage && (
						<a href='/'>
							<img
								src='/assets/images/switch-logo.png'
								alt='Switch Logo'
							/>
						</a>
					)} */}
				</div>
				<nav className='nav'>
					<ul className='nav-list'>
						<li className='nav-item'>
							<Link to={`/map`}>Map</Link>
						</li>
						<li className='nav-item'>
							<Link to={`/performance`}>Performance</Link>
						</li>
						<li className='nav-item'>
							<Link to={`/reports/starlink/usage`}>Reports</Link>
						</li>
						<li className='nav-item'>
							<Link to={`/customers`}>Customers</Link>
						</li>{' '}
					</ul>
					<div className='user-avatar'>
						<img
							src='/assets/images/avatar.svg'
							alt='User Avatar'
							height='30'
							width='30'
						/>
						<Form
							method='post'
							action='/auth/logout'
						>
							<button
								className='logout-button'
								type='submit'
							>
								Logout
							</button>
						</Form>
					</div>
				</nav>
			</div>
		</header>
	);
};

export default Header;
