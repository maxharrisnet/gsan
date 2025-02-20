import React, { createContext, useState, useEffect, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children, initialUser, shop }) => {
	const [currentUser, setCurrentUser] = useState(initialUser);

	// Parse kits from user metafields
	const userKits = currentUser?.metafields?.kits ? currentUser.metafields.kits.split(',').map((kit) => kit.trim()) : [];

	const isProvider = currentUser?.metafields?.provider === 'true';

	return (
		<UserContext.Provider
			value={{
				currentUser,
				setCurrentUser,
				shop,
				isProvider,
				userKits,
			}}
		>
			{children}
		</UserContext.Provider>
	);
};

export const useUser = () => {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
};
