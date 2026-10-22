import PrivacyNotice from '../components/common/PrivacyNotice'
import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <section className="welcome-panel" aria-labelledby="welcome-heading">
      <p className="eyebrow">A little practice, a little progress</p>
      <h1 id="welcome-heading">Welcome to Math Practice!</h1>
      <p>Build your math skills one step at a time. Ready to give it a go?</p>
      <div className="home-actions">
        <Link className="button" to="/practice/setup">
          Start Practice
        </Link>
        <Link className="button button-secondary" to="/statistics">
          View Statistics
        </Link>
        <Link className="button button-secondary" to="/settings">
          Settings
        </Link>
      </div>
      <PrivacyNotice />
    </section>
  )
}

export default HomePage
