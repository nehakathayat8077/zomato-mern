import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import './UserProfile.css'

function UserProfile() {
  const navigate = useNavigate()
  const avatarInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [savedReels, setSavedReels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [profileImage, setProfileImage] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState('')
  const [theme, setTheme] = useState(
    localStorage.getItem('zomato-theme') || 'system'
  )

  useEffect(() => {
    const resolvedTheme = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.dataset.theme = resolvedTheme
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    const loadProfile = async () => {
      try {
        const [profileResponse, savedResponse] = await Promise.all([
          axios.get('/api/auth/user/me', { withCredentials: true, signal: controller.signal }),
          axios.get('/api/food/saved', { withCredentials: true, signal: controller.signal })
        ])
        setUser(profileResponse.data.user)
        setFullName(profileResponse.data.user.fullName || '')
        setEmail(profileResponse.data.user.email || '')
        setSavedReels(Array.isArray(savedResponse.data.foodItems) ? savedResponse.data.foodItems : [])
      } catch (error) {
        if (!axios.isCancel(error)) {
          if (error.response?.status === 401) {
            navigate('/user/login')
          } else {
            setFeedback(error.response?.data?.message || 'Unable to load profile.')
            setFeedbackType('error')
          }
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    loadProfile()
    return () => controller.abort()
  }, [navigate])

  const selectAvatar = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setProfileImage(file)
    setProfileImagePreview(URL.createObjectURL(file))
  }

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme)
    localStorage.setItem('zomato-theme', nextTheme)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setFeedback('')
    setFeedbackType('')
    setIsSaving(true)

    const formData = new FormData()
    formData.append('fullName', fullName.trim())
    formData.append('email', email.trim())
    if (password) {
      formData.append('currentPassword', currentPassword)
      formData.append('password', password)
    }
    if (profileImage) formData.append('profileImage', profileImage)

    try {
      const response = await axios.patch('/api/auth/user/me', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setUser(response.data.user)
      setProfileImage(null)
      setProfileImagePreview('')
      setCurrentPassword('')
      setPassword('')
      setFeedback(response.data.message || 'Profile updated.')
      setFeedbackType('success')
    } catch (error) {
      setFeedback(error.response?.data?.message || 'Unable to update profile.')
      setFeedbackType('error')
    } finally {
      setIsSaving(false)
    }
  }

  const logout = async () => {
    await axios.get('/api/auth/user/logout', { withCredentials: true }).catch(() => {})
    navigate('/user/login')
  }

  if (isLoading) {
    return <main className="profile-state">Loading profile…</main>
  }

  const initials = (fullName || user?.fullName || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <main className="user-profile-page">
      <header className="user-profile-header">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        <Link to="/" aria-label="Zomato home">zomato</Link>
        <span aria-hidden="true" />
      </header>

      <div className="user-profile-layout">
        <section className="user-profile-hero" aria-labelledby="profile-name">
          <button
            className="user-profile-avatar"
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label="Change profile image"
          >
            {profileImagePreview || user?.profileImage ? (
              <img src={profileImagePreview || user.profileImage} alt="" />
            ) : (
              <span>{initials}</span>
            )}
            <small>Change</small>
          </button>
          <input
            ref={avatarInputRef}
            className="user-profile-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => selectAvatar(event.target.files?.[0])}
          />
          <div>
            <p>My account</p>
            <h1 id="profile-name">{fullName || 'Food lover'}</h1>
            <span>{email}</span>
          </div>
        </section>

        <section className="user-profile-stats" aria-label="Profile summary">
          <div><strong>{savedReels.length}</strong><span>Saved reels</span></div>
          <div><strong>0</strong><span>Orders</span></div>
          <button type="button" onClick={() => navigate('/')}>Browse reels</button>
        </section>

        <form className="user-profile-card" onSubmit={saveProfile}>
          <div className="user-profile-card-heading">
            <p>Account</p>
            <h2>Profile settings</h2>
          </div>

          <label className="user-profile-field">
            <span>Full name</span>
            <input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
            />
          </label>

          <label className="user-profile-field">
            <span>Email address</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <div className="user-profile-password">
            <p>Change password</p>
            <label className="user-profile-field">
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="user-profile-field">
              <span>New password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                minLength={password ? 6 : undefined}
              />
            </label>
          </div>

          {feedback && (
            <p className={`user-profile-feedback ${feedbackType}`} role="status">{feedback}</p>
          )}

          <button className="user-profile-save" type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </form>

        <section className="user-profile-card" aria-labelledby="appearance-heading">
          <div className="user-profile-card-heading">
            <p>Preferences</p>
            <h2 id="appearance-heading">Appearance</h2>
          </div>
          <div className="theme-switch" role="radiogroup" aria-label="Theme">
            {[
              ['light', 'Light'],
              ['dark', 'Dark'],
              ['system', 'System']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                className={theme === value ? 'is-active' : ''}
                onClick={() => changeTheme(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="user-profile-card" aria-labelledby="saved-heading">
          <div className="user-profile-card-heading">
            <p>Collection</p>
            <h2 id="saved-heading">Saved reels</h2>
          </div>
          {savedReels.length === 0 ? (
            <div className="user-profile-empty">
              <span aria-hidden="true">♡</span>
              <strong>No saved reels yet</strong>
              <p>Save reels you want to revisit later.</p>
              <button type="button" onClick={() => navigate('/')}>Explore reels</button>
            </div>
          ) : (
            <div className="user-profile-reels">
              {savedReels.map((reel) => (
                <article key={reel._id}>
                  <video src={reel.video} muted loop playsInline preload="metadata" />
                  <div>
                    <strong>{reel.name}</strong>
                    <span>{reel.foodPartner?.fullName || 'Food partner'}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="user-profile-card" aria-labelledby="orders-heading">
          <div className="user-profile-card-heading">
            <p>Purchases</p>
            <h2 id="orders-heading">Order history</h2>
          </div>
          <div className="user-profile-empty">
            <span aria-hidden="true">⌑</span>
            <strong>No orders yet</strong>
            <p>Your completed orders will appear here.</p>
          </div>
        </section>

        <button className="user-profile-logout" type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </main>
  )
}

export default UserProfile
