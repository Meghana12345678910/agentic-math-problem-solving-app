import { NavLink } from 'react-router-dom'

function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <NavLink to="/" end>
        Home
      </NavLink>
      <NavLink to="/practice/setup">Practice</NavLink>
      <NavLink to="/statistics">Statistics</NavLink>
      <NavLink to="/settings">Settings</NavLink>
    </nav>
  )
}

export default Navigation
