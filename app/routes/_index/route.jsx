import { Link } from '@remix-run/react';
import Layout from '../../components/layout/Layout';
import styles from './styles.module.css';

export default function App() {
	return (
		<Layout>
			<div className='container'>
				<main className='content content-centered'>
					<div className='logo-wrapper'>
						<img
							src='/assets/images/switch-logo.png'
							alt='Switch Logo'
							className='logo'
						/>
					</div>

					<h1 className={styles.heading}>Customer Portal</h1>
					<div className='login-button-wrapper'>
						<Link
							to='/auth'
							className='button login-button'
						>
							Login
						</Link>
						<Link
							to='https://gsan.co/account/register'
							target='_blank'
							className='button login-button'
						>
							Register
						</Link>
					</div>
				</main>
			</div>
		</Layout>
	);
}
