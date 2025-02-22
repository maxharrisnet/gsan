import Header from './Header';
import Footer from './Footer';
import styles from './layout.css?url';

const Layout = ({ children }) => {
	return (
		<div className='layout'>
			<Header />
			<div className='wrapper'>{children}</div>
			<Footer />
		</div>
	);
};

export default Layout;

export function links() {
	return [{ rel: 'stylesheet', href: styles }];
}

Layout.links = links;
