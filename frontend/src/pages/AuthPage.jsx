import { useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/auth.css'

const AUTH_API_URL = (import.meta.env.VITE_AUTH_API_URL || '/api/auth').replace(/\/$/, '')

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.31 2.98-7.35Z"/>
    <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z"/>
    <path fill="#FBBC05" d="M6.39 13.9A6 6 0 0 1 6.07 12c0-.66.11-1.31.32-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.49l3.35-2.59Z"/>
    <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.51 3.83 1.5l2.87-2.88A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z"/>
  </svg>
)

const UtensilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10a2.5 2.5 0 0 0 2.5-2.5V3M7 10v11M16 3v18M16 3c3 2 3.5 6 0 8" />
  </svg>
)

function AuthPage({ role, mode }) {
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isPartner = role === 'partner'
  const isRegister = mode === 'register'
  const roleName = isPartner ? 'Food partner' : 'User'
  const loginPath = isPartner ? '/food-partner/login' : '/user/login'
  const registerPath = isPartner ? '/food-partner/register' : '/user/register'
  const navigate = useNavigate()
  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const values = Object.fromEntries(formData.entries())
    const endpoint = `${isPartner ? 'food-partner' : 'user'}/${isRegister ? 'register' : 'login'}`
    const payload = isRegister
      ? isPartner
        ? {
            fullName: values.fullName,
            email: values.email,
            password: values.password,
            contactName: values.contactName,
            phone: values.phone,
            address: values.address,
            city: values.city,
            foodType: values.foodType,
          }
        : {
            fullName: `${values.firstName} ${values.lastName}`.trim(),
            email: values.email,
            password: values.password,
          }
      : { email: values.email, password: values.password }

    try {
      const response = await axios.post(`${AUTH_API_URL}/${endpoint}`, payload, {
        withCredentials: true,
      })
      setFeedback(response.data.message || 'Your request was successful.')
      navigate(isPartner ? '/food-partner/create' : '/')
    } catch (error) {
      setFeedback(error.response?.data?.message || 'Unable to submit the form. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="auth-brand" to="/" aria-label="Zomato home">
          <span className="brand-mark"><UtensilIcon /></span>
          <span>Zomato</span>
        </Link>

        <h1 className="auth-heading" id="auth-title">
          {isRegister ? `Create ${isPartner ? 'partner' : 'your'} account` : `Welcome back`}
        </h1>
        <p className="auth-subtitle">
          {isRegister
            ? isPartner
              ? 'Start growing your restaurant with Zomato.'
              : 'Discover great food and order from places you love.'
            : isPartner
              ? 'Sign in to manage your restaurant.'
              : 'Sign in to continue where you left off.'}
        </p>

        <div className="role-switch" aria-label="Account type">
          <Link className={!isPartner ? 'active' : ''} to={mode === 'register' ? '/user/register' : '/user/login'}>
            User
          </Link>
          <Link className={isPartner ? 'active' : ''} to={mode === 'register' ? '/food-partner/register' : '/food-partner/login'}>
            Food partner
          </Link>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-row">
              {isPartner ? (
                <>
                  <div className="field">
                    <label htmlFor="ownerName">Owner name</label>
                    <input id="ownerName" name="contactName" type="text" placeholder="Full name" autoComplete="name" required />
                  </div>
                  <div className="field">
                    <label htmlFor="restaurantName">Restaurant name</label>
                    <input id="restaurantName" name="fullName" type="text" placeholder="Restaurant name" required />
                  </div>
                  <div className="field">
                    <label htmlFor="address">Restaurant address</label>
                    <input id="address" name="address" type="text" placeholder="Restaurant address" autoComplete="street-address" required />
                  </div>
                  <div className="field">
                    <label htmlFor="city">City</label>
                    <input id="city" name="city" type="text" placeholder="City" autoComplete="address-level2" required />
                  </div>
                  <div className="field">
                    <label htmlFor="foodType">Food type</label>
                    <select id="foodType" name="foodType" defaultValue="both" required>
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-veg</option>
                      <option value="both">Veg & Non-veg</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="firstName">First name</label>
                    <input id="firstName" name="firstName" type="text" placeholder="First name" autoComplete="given-name" required />
                  </div>
                  <div className="field">
                    <label htmlFor="lastName">Last name</label>
                    <input id="lastName" name="lastName" type="text" placeholder="Last name" autoComplete="family-name" required />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">{isPartner ? 'Business email' : 'Email address'}</label>
            <input id="email" name="email" type="email" placeholder={isPartner ? 'you@restaurant.com' : 'you@example.com'} autoComplete="email" required />
          </div>

          {isRegister && (
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" required />
            </div>
          )}

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" placeholder={isRegister ? 'Create a password' : 'Enter your password'} autoComplete={isRegister ? 'new-password' : 'current-password'} required />
          </div>

          {!isRegister && (
            <div className="form-options">
              <label className="remember">
                <input type="checkbox" name="remember" />
                Remember me
              </label>
              <a className="text-link" href="#forgot">Forgot password?</a>
            </div>
          )}

          {feedback && <p className="auth-feedback" role="alert">{feedback}</p>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : isRegister ? `Create ${roleName.toLowerCase()} account` : 'Sign in'}
          </button>
        </form>

        <div className="auth-divider">or</div>
        <button className="google-button" type="button">
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <Link className="text-link" to={isRegister ? loginPath : registerPath}>
            {isRegister ? 'Sign in' : 'Create account'}
          </Link>
        </p>
      </section>
    </main>
  )
}

export default AuthPage
