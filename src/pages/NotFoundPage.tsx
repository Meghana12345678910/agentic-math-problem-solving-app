import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section>
      <h1>Page not found</h1>
      <p>We could not find that page. Let’s head back home.</p>
      <Link className="button" to="/">
        Return Home
      </Link>
    </section>
  )
}

export default NotFoundPage
