import { Link } from 'react-router-dom'

function ErrorMessage({
  title = 'Something went wrong',
  message,
}: {
  title?: string
  message: string
}) {
  return (
    <section role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <Link className="button button-secondary" to="/">
        Return Home
      </Link>
    </section>
  )
}
export default ErrorMessage
