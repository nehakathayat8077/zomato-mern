import { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useLocation, useParams } from 'react-router-dom'
import './profile.css'

function FoodPartnerProfile() {
  const { id } = useParams()
  const location = useLocation()
  const initialPartner = location.state?.partner || null
  const [partner, setPartner] = useState(initialPartner)
  const [reels, setReels] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowPending, setIsFollowPending] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    const loadProfile = async () => {
      try {
        setIsLoading(true)
        setError('')
        const response = await axios.get(`/api/food-partner/${id}`, {
          withCredentials: true,
          signal: controller.signal,
        })
        setPartner(response.data.partner)
        setReels(Array.isArray(response.data.reels) ? response.data.reels : [])
        setFollowerCount(response.data.followerCount || 0)
        setIsFollowing(Boolean(response.data.isFollowing))
      } catch (requestError) {
        if (!axios.isCancel(requestError)) {
          setError(
            requestError.response?.status === 401
              ? 'Please sign in to view this store.'
              : requestError.response?.data?.message || 'Unable to load this store.',
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [id])

  const name = partner?.fullName || 'Food partner'
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const toggleFollow = async () => {
    if (!partner?._id || isFollowPending) return
    setIsFollowPending(true)
    try {
      const response = await axios.post(`/api/food-partner/${partner._id}/follow`, {}, {
        withCredentials: true
      })
      setIsFollowing(response.data.isFollowing)
      setFollowerCount(response.data.followerCount)
    } finally {
      setIsFollowPending(false)
    }
  }

  const rating = Number(partner?.rating || 0)

  return (
    <main className="partner-profile">
      <header className="partner-profile-header">
        <Link className="partner-back" to="/" aria-label="Back to food videos">
          <span aria-hidden="true">←</span>
        </Link>
        <Link className="partner-wordmark" to="/">zomato</Link>
      </header>

      {isLoading ? (
        <section className="partner-state" aria-live="polite">Loading store profile…</section>
      ) : error ? (
        <section className="partner-state">
          <p role="alert">{error}</p>
          {error === 'Please sign in to view this store.' && (
            <Link className="partner-primary-action" to="/user/login">Sign in</Link>
          )}
        </section>
      ) : (
        <div className="partner-profile-content">
          <section className="partner-identity" aria-labelledby="partner-name">
            <div className="partner-avatar" aria-label={`${name} profile picture`}>
              {partner?.profileImage ? (
                <img src={partner.profileImage} alt={`${name} profile`} />
              ) : (
                initials || 'FP'
              )}
            </div>
            <div className="partner-identity-copy">
              <p className="partner-eyebrow">Food partner</p>
              <h1 id="partner-name">{name}</h1>
              {partner?.contactName && <p className="partner-contact-name">Managed by {partner.contactName}</p>}
              {partner?.city && <p className="partner-contact-name">{partner.city}</p>}
              {partner?.foodType && (
                <p className="partner-food-type">{partner.foodType === 'both' ? 'Veg & Non-veg' : partner.foodType}</p>
              )}
              {Array.isArray(partner?.categories) && partner.categories.length > 0 && (
                <div className="partner-category-tags">
                  {partner.categories.map((category) => <span key={category}>{category}</span>)}
                </div>
              )}
              <div className="partner-rating" aria-label={`${rating} out of 5 stars`}>
                <span aria-hidden="true">{[1, 2, 3, 4, 5].map((star) => (
                  <i key={star} className={star <= Math.round(rating) ? 'is-filled' : ''}>★</i>
                ))}</span>
                <strong>{rating.toFixed(1)}</strong>
              </div>
              <button
                className={`partner-follow-button${isFollowing ? ' is-following' : ''}`}
                type="button"
                onClick={toggleFollow}
                disabled={isFollowPending}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
          </section>

          <section className="partner-stats" aria-label="Store summary">
            <div className="partner-stat">
              <strong>{reels.length}</strong>
              <span>{reels.length === 1 ? 'Reel' : 'Reels'}</span>
            </div>
            <div className="partner-stat">
              <strong>{followerCount}</strong>
              <span>Followers</span>
            </div>
            {(partner?.openingTime || partner?.closingTime) && (
              <div className="partner-hours">
                <span>Store hours</span>
                <strong>{partner.openingTime || 'Open'} – {partner.closingTime || 'Close'}</strong>
              </div>
            )}
            {partner?.address && (
              <div className="partner-address">
                <span>Address</span>
                <strong>{partner.address}</strong>
              </div>
            )}
            {partner?.phone && (
              <a className="partner-phone" href={`tel:${partner.phone}`}>
                <span>Call store</span>
                <strong>{partner.phone}</strong>
              </a>
            )}
          </section>

          <section className="partner-reels-section" aria-labelledby="reels-heading">
            <div className="partner-section-heading">
              <h2 id="reels-heading">Posted reels</h2>
              <span>{reels.length}</span>
            </div>

            {reels.length === 0 ? (
              <div className="partner-empty">
                <div className="partner-empty-icon" aria-hidden="true">▶</div>
                <h3>No reels posted yet</h3>
                <p>Fresh food videos from this store will appear here.</p>
              </div>
            ) : (
              <div className="partner-reels-grid">
                {reels.map((reel) => (
                  <button
                    className="partner-reel"
                    type="button"
                    key={reel._id}
                    aria-label={reel.name ? `Play reel: ${reel.name}` : 'Play food reel'}
                    onClick={(event) => {
                      const video = event.currentTarget.querySelector('video')
                      if (!video) return
                      if (video.paused) {
                        video.play().catch(() => {})
                      } else {
                        video.pause()
                      }
                    }}
                  >
                    <video
                      src={reel.video}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={reel.name ? `Reel: ${reel.name}` : 'Food reel'}
                    />
                    <div className="partner-reel-overlay">
                      <strong>{reel.name}</strong>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default FoodPartnerProfile