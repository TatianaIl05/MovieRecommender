import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [message, setMessage] = useState({ text: 'Confirming your email...', type: '' })

  useEffect(() => {
    const token = searchParams.get('token')

    if (!token) {
      setMessage({ text: 'Verification token is missing.', type: 'error' })
      return
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
        const data = await res.json()

        if (res.ok) {
          setMessage({ text: data.message || 'Email confirmed successfully. You can now log in.', type: 'success' })
        } else {
          setMessage({ text: data.error || 'Verification failed.', type: 'error' })
        }
      } catch (err) {
        setMessage({ text: 'Network error.', type: 'error' })
      }
    }

    verifyEmail()
  }, [searchParams])

  return (
    <div className="container container--narrow">
      <div className="auth-card">
        <div className="auth-form">
          <h2 className="auth-form__title">Email Verification</h2>
          <div className={`form-message ${message.type}`}>{message.text}</div>
          <Link to="/auth" className="btn btn--primary btn--full auth-link-btn">Go to Login</Link>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail
