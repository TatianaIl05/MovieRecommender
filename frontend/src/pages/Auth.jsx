import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Auth({ setUser }) {
  const [activeTab, setActiveTab] = useState('login')
  const [loginData, setLoginData] = useState({ login: '', password: '' })
  const [registerData, setRegisterData] = useState({ login: '', email: '', password: '', passwordConfirm: '' })
  const [loginMessage, setLoginMessage] = useState({ text: '', type: '' })
  const [registerMessage, setRegisterMessage] = useState({ text: '', type: '' })
  const navigate = useNavigate()

  const showMessage = (setter, text, type) => {
    setter({ text, type })
    setTimeout(() => setter({ text: '', type: '' }), 5000)
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })

      const data = await res.json()

      if (res.ok) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
        navigate('/')
      } else {
        showMessage(setLoginMessage, data.error || 'Login failed', 'error')
      }
    } catch (err) {
      showMessage(setLoginMessage, 'Network error', 'error')
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()

    if (registerData.password !== registerData.passwordConfirm) {
      return showMessage(setRegisterMessage, 'Passwords do not match', 'error')
    }

    if (registerData.password.length < 6) {
      return showMessage(setRegisterMessage, 'Password must be at least 6 characters', 'error')
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: registerData.login,
          email: registerData.email,
          password: registerData.password,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        showMessage(setRegisterMessage, 'Registration successful! Please login.', 'success')
        setRegisterData({ login: '', email: '', password: '', passwordConfirm: '' })
        setTimeout(() => setActiveTab('login'), 2000)
      } else {
        showMessage(setRegisterMessage, data.error || 'Registration failed', 'error')
      }
    } catch (err) {
      showMessage(setRegisterMessage, 'Network error', 'error')
    }
  }

  return (
    <div className="container container--narrow">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>

        {activeTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <h2 className="auth-form__title">Login</h2>
            <div className="form-group">
              <label htmlFor="loginLogin">Login</label>
              <input
                type="text"
                id="loginLogin"
                placeholder="Your login"
                value={loginData.login}
                onChange={(e) => setLoginData({ ...loginData, login: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="loginPassword">Password</label>
              <input
                type="password"
                id="loginPassword"
                placeholder="Your password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full">Login</button>
            {loginMessage.text && (
              <div className={`form-message ${loginMessage.type}`}>{loginMessage.text}</div>
            )}
          </form>
        )}

        {activeTab === 'register' && (
          <form className="auth-form" onSubmit={handleRegister}>
            <h2 className="auth-form__title">Register</h2>
            <div className="form-group">
              <label htmlFor="regLogin">Login</label>
              <input
                type="text"
                id="regLogin"
                placeholder="Choose a login"
                value={registerData.login}
                onChange={(e) => setRegisterData({ ...registerData, login: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="regEmail">Email</label>
              <input
                type="email"
                id="regEmail"
                placeholder="your@email.com"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="regPassword">Password</label>
              <input
                type="password"
                id="regPassword"
                placeholder="At least 6 characters"
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="regPasswordConfirm">Confirm Password</label>
              <input
                type="password"
                id="regPasswordConfirm"
                placeholder="Repeat password"
                value={registerData.passwordConfirm}
                onChange={(e) => setRegisterData({ ...registerData, passwordConfirm: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn btn--primary btn--full">Register</button>
            {registerMessage.text && (
              <div className={`form-message ${registerMessage.type}`}>{registerMessage.text}</div>
            )}
          </form>
        )}
      </div>
    </div>
  )
}

export default Auth