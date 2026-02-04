import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function Header() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const handleLogout = () => {
    localStorage.removeItem('driver_token')
    navigate('/login')
  }

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar'
    i18n.changeLanguage(newLang)
    localStorage.setItem('driver_language', newLang)
  }

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">{t('appName')}</h1>
        <div className="header-actions">
          <button onClick={toggleLanguage} className="btn-secondary">
            {t('switchLanguage')}
          </button>
          <button onClick={handleLogout} className="btn-logout">
            {t('logout')}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
