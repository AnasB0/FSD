import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Layout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <h2>Najah Delivery</h2>
        <div className="header-actions">
          <button onClick={toggleLanguage} className="btn-secondary">
            {t('language')}: {i18n.language.toUpperCase()}
          </button>
          <button onClick={handleLogout} className="btn-secondary">
            {t('logout')}
          </button>
        </div>
      </header>
      <div className="main-container">
        <nav className="sidebar">
          <Link to="/dashboard" className="nav-link">{t('dashboard')}</Link>
          <Link to="/orders" className="nav-link">{t('orders')}</Link>
          <Link to="/route-plans" className="nav-link">{t('route_plans')}</Link>
          <Link to="/assistant" className="nav-link">{t('assistant')}</Link>
        </nav>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
