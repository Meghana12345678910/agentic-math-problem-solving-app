import { Link } from 'react-router-dom'
import Navigation from './Navigation'

function Header() {
  return (
    <header className="site-header">
      <div className="header-content">
        <Link className="site-title" to="/">
          Math Practice
        </Link>
        <Navigation />
      </div>
    </header>
  )
}

export default Header
