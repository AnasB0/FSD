import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  return (
    <header className="header">
      <div className="header-container">
        <h1 className="header-title">{t('app_title')}</h1>
        <nav className="nav">
          <Link to="/dashboard" className="nav-link">
            {t('dashboard')}
          </Link>
          <Link to="/orders" className="nav-link">
            {t('orders')}
          </Link>
          <Link to="/route-plans" className="nav-link">
            {t('route_plans')}
          </Link>
          <Link to="/assistant" className="nav-link">
            {t('assistant')}
          </Link>
        </nav>
        <div className="header-actions">
          <button onClick={toggleLanguage} className="btn btn-secondary">
            {i18n.language === 'ar' ? 'EN' : 'ع'}
          </button>
          <button onClick={handleLogout} className="btn btn-primary">
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
