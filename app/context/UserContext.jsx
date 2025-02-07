import React, { createContext, useState, useEffect, useContext } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children, initialUser, shop }) => {
	const [currentUser, setCurrentUser] = useState(initialUser);

	useEffect(() => {
		setCurrentUser(initialUser);
	}, [initialUser]);

	const addShopToRequest = (request) => {
		const modifiedUrl = new URL(request.url);
		modifiedUrl.searchParams.set('shop', shop);
		return new Request(modifiedUrl, {
			method: request.method,
			headers: request.headers,
			body: request.body,
			redirect: request.redirect,
			signal: request.signal,
		});
	};

	const isProvider = currentUser?.metafields?.provider === 'true';

	return (
		<UserContext.Provider
			value={{
				currentUser,
				setCurrentUser,
				shop,
				addShopToRequest,
				isProvider,
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
