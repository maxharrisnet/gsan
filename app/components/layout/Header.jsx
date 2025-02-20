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
	const providerType = isGsanPage ? 'gsan' : 'sonar';

	return (
		<header className='header'>
			<div className='header-container'>
				<div className='logo'>
					<Link to='/'>
						<img
							src='/assets/images/GSAN-logo.png'
							alt='GSAN Logo'
						/>
					</Link>
				</div>
				<nav className='nav'>
					<ul className='nav-list'>
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
