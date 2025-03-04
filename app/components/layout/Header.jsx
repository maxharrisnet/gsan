import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from '@remix-run/react';
import { useUser } from '../../context/UserContext';
import { Link, Form, NavLink } from '@remix-run/react';

const Header = () => {
	const location = useLocation();
	const path = location.pathname;
	const userContext = useUser();
	const [showDropdown, setShowDropdown] = useState(false);
	const dropdownRef = useRef(null);
	const hideNav = path === '/' || path.startsWith('/auth');

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

	return (
		<header className='header'>
			<div className='header-container'>
				<div className='logo'>
					<Link to='/map'>
						<img
							src='/assets/images/switch-logo.png'
							alt='Switch Logo'
						/>
					</Link>
				</div>
				{!hideNav && (
					<nav className='nav'>
						<div
							className='user-avatar'
							ref={dropdownRef}
						>
							<button
								className='menu-button'
								onClick={() => setShowDropdown(!showDropdown)}
							>
								<span className='material-icons'>menu</span>
							</button>

							{showDropdown && (
								<div className='avatar-dropdown'>
									<Link
										to='/map'
										onClick={() => setShowDropdown(false)}
									>
										Map
									</Link>
									<Link
										to='/reports/starlink/usage'
										onClick={() => setShowDropdown(false)}
									>
										Reports
									</Link>
									<Link
										to='/auth/logout'
										method='post'
										action='/auth/logout'
									>
										Logout
									</Link>
								</div>
							)}
						</div>
					</nav>
				)}
			</div>
		</header>
	);
};

export default Header;
