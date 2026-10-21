import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import ErrorMessage from './ErrorMessage'

class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV)
      console.error('The practice app could not show this page.', error, info)
  }
  render() {
    return this.state.failed ? (
      <ErrorMessage message="We could not open this page. Please return home and try again. Your saved progress has been kept." />
    ) : (
      this.props.children
    )
  }
}
export default ErrorBoundary
