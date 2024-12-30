import { Link } from '@remix-run/react';
import Layout from '../../components/layout/Layout';
import styles from './styles.module.css';

export default function App() {
	return (
		<Layout>
			<main className='content content-centered'>
				<h1 className={styles.heading}>GSAN Customer Portal</h1>
				<Link to='/login'>Login</Link>
			</main>
		</Layout>
	);
}
