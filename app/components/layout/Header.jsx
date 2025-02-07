import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { Link, Form, NavLink } from '@remix-run/react';

const Header = () => {
	const location = useLocation();
	const path = location.pathname;
	const userContext = useUser();
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	if (!userContext) {
		console.error('Header rendered without UserContext');
		return null;
	}
	const { currentUser } = userContext;
	const isProvider = currentUser?.role === 'provider';
	const isGsanPage = path.includes('/gsan') || currentUser?.authType === 'shopify';
	const isSwitchPage = path.includes('/switch') || currentUser?.authType === 'sonar';
	const providerType = isGsanPage ? 'gsan' : 'sonar';
	const userType = isGsanPage ? 'gsan' : 'switch';

	return (
		<header className='header'>
			<div className='header-container'>
				<div className='logo'>
					{/* {isGsanPage && ( */}
					<Link to='/'>
						<img
							src='/assets/images/GSAN-logo.png'
							alt='GSAN Logo'
						/>
					</Link>

					{/* )} */}
					{/* {!isGsanPage && (
						<Link to='/'>
							<img
								src='/assets/images/switch-logo.png'
								alt='Switch Logo'
							/>
						</Link>
					)} */}
				</div>
				<nav className='nav'>
					<ul className='nav-list'>
						<li className='nav-item'>
							<NavLink
								to={`/dashboard`}
								className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
							>
								Dashboard
							</NavLink>
						</li>
						<li className='nav-item'>
							<NavLink
								to={`/map`}
								className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
							>
								Map
							</NavLink>
						</li>
						<li className='nav-item'>
							<NavLink
								to={`/performance`}
								className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
							>
								Performance
							</NavLink>
						</li>
						<li className='nav-item'>
							<NavLink
								to={`/reports/starlink/usage`}
								className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
							>
								Reports
							</NavLink>
						</li>
						{/* Only show Customers section to providers */}
						{isProvider && (
							<li className='nav-item nav-dropdown'>
								<NavLink
									to={`/${providerType}/customers`}
									className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
								>
									Customers
								</NavLink>
								<ul className='nav-dropdown-content'>
									<li>
										<NavLink
											to={`/${providerType}/users/manage`}
											className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
										>
											Add New User
										</NavLink>
									</li>
								</ul>
							</li>
						)}
					</ul>
					<div
						className='user-avatar'
						ref={dropdownRef}
					>
						<button
							className='avatar-button'
							onClick={() => setShowDropdown(!showDropdown)}
						>
							<img
								src='/assets/images/avatar.svg'
								alt='User Avatar'
								height='30'
								width='30'
							/>
						</button>

						{showDropdown && (
							<div className='avatar-dropdown'>
								<Link
									to='/profile'
									onClick={() => setShowDropdown(false)}
								>
									Profile
								</Link>
								<Form
									method='post'
									action='/auth/logout'
								>
									<button
										type='submit'
										className='logout-button'
									>
										Logout
									</button>
								</Form>
							</div>
						)}
					</div>
				</nav>
			</div>
		</header>
	);
};

export default Header;
