import { Outlet } from 'react-router-dom';
import Header from '../Header';
import Sidebar from '../Sidebar';
import BottomNav from '../BottomNav';
import styles from './PageContainer.module.css';

function PageContainer() {
    return (
        <div className={styles.pageContainer}>
            <Sidebar />
            <div className={styles.mainWrapper}>
                <Header />
                <main className={styles.main}>
                    <div className={styles.mainContent}>
                        <Outlet />
                    </div>
                </main>
                <BottomNav />
            </div>
        </div>
    );
}

export default PageContainer;
