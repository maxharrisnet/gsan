import { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children, initialUser, shop }) => {
	const [currentUser, setCurrentUser] = useState(initialUser);

	const userKits = currentUser?.metafields?.kits ? (Array.isArray(currentUser.metafields.kits) ? currentUser.metafields.kits : currentUser.metafields.kits.split(',').map((kit) => kit.trim())) : [];

	return (
		<UserContext.Provider
			value={{
				currentUser,
				setCurrentUser,
				shop,
				userKits,
			}}
		>
			{children}
	</UserContext.Provider>
	);
};
//Test
export const useUser = () => {
	const context = useContext(UserContext);
	if (!context) {
		throw new Error('useUser must be used within a UserProvider');
	}
	return context;
};
