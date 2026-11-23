import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { getLocationWeather } from '../services/locationWeather.service'
import './Home.css'

const FOOD_API_URL = '/api/food'

function CommentThread({ comment, onReply, onReport }) {
  return (
    <article className="comment-item" key={comment._id}>
      <div className="comment-avatar" aria-hidden="true">
        {(comment.user?.fullName || 'User').charAt(0).toUpperCase()}
      </div>
      <div className="comment-content">
        <strong>{comment.user?.fullName || 'User'}</strong>
        <p>{comment.text}</p>
        <div className="comment-actions">
          <button type="button" className="comment-reply-button" onClick={() => onReply(comment)}>
            Reply
          </button>
          {!comment.isOwn && (
            <button
              className="comment-report-button"
              type="button"
              onClick={() => onReport(comment)}
            >
              Report
            </button>
          )}
        </div>
        {comment.replies?.length > 0 && (
          <div className="comment-replies">
            {comment.replies.map((reply) => (
              <CommentThread
                key={reply._id}
                comment={reply}
                onReply={onReply}
                onReport={onReport}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function Home() {
  const [foodItems, setFoodItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [playbackErrorIndex, setPlaybackErrorIndex] = useState(null)
  const [unavailableVideoIndices, setUnavailableVideoIndices] = useState([])
  const [actionPending, setActionPending] = useState({})
  const [activeFeed, setActiveFeed] = useState('home')
  const [commentFood, setCommentFood] = useState(null)
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState(null)
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)
  const [isCommentPosting, setIsCommentPosting] = useState(false)
  const [reportTarget, setReportTarget] = useState(null)
  const [reportReason, setReportReason] = useState('inappropriate')
  const [reportDetails, setReportDetails] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const [reportMessage, setReportMessage] = useState('')
  const [expandedDescriptions, setExpandedDescriptions] = useState({})
  const [discoverPartners, setDiscoverPartners] = useState([])
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverSearch, setDiscoverSearch] = useState('')
  const [discoverCity, setDiscoverCity] = useState('')
  const [discoverCities, setDiscoverCities] = useState([])
  const [discoverFoodType, setDiscoverFoodType] = useState('')
  const [discoverCategory, setDiscoverCategory] = useState('')
  const [locationName, setLocationName] = useState('Locating…')
  const [weather, setWeather] = useState('')
  const videoRefs = useRef([])
    //not all the videos are playing due to some issue with the image kit 
  useEffect(() => {
    const controller = new AbortController()

    const loadFoodItems = async () => {
      if (activeFeed === 'discover') {
        setIsLoading(false)
        setError('')
        return
      }
      try {
        setIsLoading(true)
        setError('')
        const url = activeFeed === 'saved' ? '/api/food/saved' : FOOD_API_URL
        const response = await axios.get(url, {
          withCredentials: true,
          signal: controller.signal,
        })

        if (!Array.isArray(response.data.foodItems)) {
          throw new Error('The food API returned an invalid response.')
        }

        setFoodItems(response.data.foodItems)
        setPlaybackErrorIndex(null)
      } catch (requestError) {
        if (!axios.isCancel(requestError)) {
          setError(
            requestError.response?.status === 401
              ? 'Please sign in to watch food videos.'
              : requestError.response?.data?.message || 'Unable to load food videos. Please try again later.',
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadFoodItems()
    return () => controller.abort()
  }, [activeFeed])

  useEffect(() => {
    if (activeFeed !== 'discover') return

    const controller = new AbortController()
    axios.get('/api/food-partner/cities', {
      withCredentials: true,
      signal: controller.signal
    }).then((response) => {
      setDiscoverCities(Array.isArray(response.data.cities) ? response.data.cities : [])
    }).catch(() => {})
    return () => controller.abort()
  }, [activeFeed])

  useEffect(() => {
    if (activeFeed !== 'discover') return

    const controller = new AbortController()
    const loadPartners = async () => {
      setDiscoverLoading(true)
      const params = new URLSearchParams()
      if (discoverCity) params.set('city', discoverCity)
      if (discoverFoodType) params.set('foodType', discoverFoodType)
      if (discoverCategory) params.set('category', discoverCategory)
      if (discoverSearch.trim()) params.set('search', discoverSearch.trim())

      try {
        const response = await axios.get(`/api/food-partner/discover?${params}`, {
          withCredentials: true,
          signal: controller.signal
        })
        setDiscoverPartners(Array.from(response.data.partners || []))
      } catch {
        setDiscoverPartners([])
      } finally {
        if (!controller.signal.aborted) setDiscoverLoading(false)
      }
    }
    loadPartners()
    return () => controller.abort()
  }, [activeFeed, discoverCity, discoverFoodType, discoverCategory, discoverSearch])

  useEffect(() => {
    let isMounted = true

    getLocationWeather().then(({ locationName: currentLocation, weather: currentWeather }) => {
      if (!isMounted) return
      setLocationName(currentLocation)
      setWeather(currentWeather)
    })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!foodItems.length) return undefined

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.dataset.visibleRatio = String(entry.intersectionRatio)
        } else {
          delete entry.target.dataset.visibleRatio
        }
      })

      const activeVideo = videoRefs.current
        .filter((video) => (
          video
          && !unavailableVideoIndices.includes(Number(video.dataset.index))
          && Number(video.dataset.visibleRatio) >= 0.6
        ))
        .sort((first, second) => Number(second.dataset.visibleRatio) - Number(first.dataset.visibleRatio))[0]

      videoRefs.current.forEach((video) => {
        if (!video) return
        if (video === activeVideo) {
          const index = Number(video.dataset.index)
          if (!video.getAttribute('src')) {
            video.setAttribute('src', video.dataset.videoSrc)
            video.load()
          }
          video.play()
            .then(() => setPlaybackErrorIndex(null))
            .catch(() => setPlaybackErrorIndex(index))
        } else {
          video.pause()
        }
      })
    }, { threshold: [0, 0.6, 1] })

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video)
    })

    return () => observer.disconnect()
  }, [foodItems, unavailableVideoIndices])

  const toggleFoodAction = async (foodId, action) => {
    if (!foodId || actionPending[`${action}-${foodId}`]) return

    const pendingKey = `${action}-${foodId}`
    setActionPending((current) => ({ ...current, [pendingKey]: true }))

    try {
      const response = await axios.post(`/api/food/${foodId}/${action}`, {}, {
        withCredentials: true,
      })
      setFoodItems((current) => current.map((food) => (
        food._id === foodId
          ? {
              ...food,
              ...(action === 'like'
                ? { isLiked: response.data.isLiked, likeCount: response.data.likeCount }
                : { isSaved: response.data.isSaved, saveCount: response.data.saveCount }),
            }
          : food
      )) )
      if (activeFeed === 'saved' && action === 'save' && !response.data.isSaved) {
        setFoodItems((current) => current.filter((food) => food._id !== foodId))
      }
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        navigate('/user/login')
      }
    } finally {
      setActionPending((current) => ({ ...current, [pendingKey]: false }))
    }
  }

  const openComments = async (food) => {
    setCommentFood(food)
    setComments([])
    setCommentText('')
    setReplyingTo(null)
    setIsCommentsLoading(true)
    try {
      const response = await axios.get(`/api/food/${food._id}/comments`, {
        withCredentials: true,
      })
      setComments(Array.isArray(response.data.comments) ? response.data.comments : [])
    } catch (requestError) {
      if (requestError.response?.status === 401) navigate('/user/login')
    } finally {
      setIsCommentsLoading(false)
    }
  }

  const postComment = async (event) => {
    event.preventDefault()
    const text = commentText.trim()
    if (!commentFood || !text) return

    setIsCommentPosting(true)
    try {
      const payload = replyingTo
        ? { text, parentCommentId: replyingTo._id }
        : { text }
      const response = await axios.post(`/api/food/${commentFood._id}/comments`, payload, {
        withCredentials: true,
      })
      const newComment = response.data.comment
      const addReply = (thread) => thread.map((comment) => (
        comment._id === replyingTo?._id
          ? { ...comment, replies: [newComment, ...(comment.replies || [])] }
          : { ...comment, replies: addReply(comment.replies || []) }
      ))
      setComments((current) => (
        replyingTo ? addReply(current) : [newComment, ...current]
      ))
      setCommentText('')
      setReplyingTo(null)
      setFoodItems((current) => current.map((food) => (
        food._id === commentFood._id
          ? { ...food, commentCount: response.data.commentCount }
          : food
      )))
      setCommentFood((current) => (
        current ? { ...current, commentCount: response.data.commentCount } : current
      ))
    } finally {
      setIsCommentPosting(false)
    }
  }

  const openReport = (type, item) => {
    setReportTarget({ type, item })
    setReportReason('inappropriate')
    setReportDetails('')
    setReportMessage('')
  }

  const submitReport = async (event) => {
    event.preventDefault()
    if (!reportTarget) return

    setIsReporting(true)
    setReportMessage('')
    try {
      if (reportTarget.type === 'reel') {
        await axios.post(
          `/api/food/${reportTarget.item._id}/report`,
          { reason: reportReason, details: reportDetails },
          { withCredentials: true }
        )
      } else {
        await axios.post(
          `/api/food/comments/${reportTarget.item._id}/report`,
          { reason: reportReason, details: reportDetails },
          { withCredentials: true }
        )
      }
      setReportMessage('Report submitted. Thank you.')
    } catch (requestError) {
      setReportMessage(requestError.response?.data?.message || 'Unable to submit report.')
    } finally {
      setIsReporting(false)
    }
  }

  if (activeFeed === 'discover') {
    return (
      <main className="discover-dashboard">
        <header className="discover-header">
          <Link className="discover-logo" to="/" aria-label="Zomato home">zomato</Link>
          <div className="discover-location">
            <span>{locationName}</span>
            <strong>{weather || 'Weather'}</strong>
          </div>
        </header>

        <div className="discover-layout">
          <section className="discover-hero">
            <p>Explore near you</p>
            <h1>Find your next favourite</h1>
          </section>

          <section className="discover-filters" aria-label="Discover filters">
            <label className="discover-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm5-5 5 5" />
              </svg>
              <input
                value={discoverSearch}
                onChange={(event) => setDiscoverSearch(event.target.value)}
                placeholder="Search restaurants or dishes"
              />
            </label>
            <div className="discover-filter-row">
              <button
                type="button"
                className={discoverFoodType === 'veg' ? 'is-active' : ''}
                onClick={() => setDiscoverFoodType((current) => current === 'veg' ? '' : 'veg')}
              >
                <span className="discover-veg-dot" /> Veg
              </button>
              <button
                type="button"
                className={discoverFoodType === 'non-veg' ? 'is-active' : ''}
                onClick={() => setDiscoverFoodType((current) => current === 'non-veg' ? '' : 'non-veg')}
              >
                <span className="discover-nonveg-dot" /> Non-veg
              </button>
              <input
                className="discover-city-input"
                value={discoverCity}
                onChange={(event) => setDiscoverCity(event.target.value)}
                placeholder="City"
                aria-label="Filter by city"
                list="discover-city-options"
                autoComplete="address-level2"
              />
              <datalist id="discover-city-options">
                {discoverCities.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
            </div>
            <div className="discover-category-row" aria-label="Categories">
              {['', 'Indian', 'Chinese', 'Biryani', 'Pizza', 'Cafe', 'Desserts', 'Fast Food'].map((category) => (
                <button
                  key={category || 'all'}
                  type="button"
                  className={discoverCategory === category ? 'is-active' : ''}
                  onClick={() => setDiscoverCategory(category)}
                >
                  {category || 'All'}
                </button>
              ))}
            </div>
          </section>

          <section className="discover-results" aria-live="polite">
            {discoverLoading ? (
              <p className="discover-empty">Finding restaurants…</p>
            ) : discoverPartners.length === 0 ? (
              <div className="discover-empty">
                <strong>No restaurants found</strong>
                <span>Try changing the city or category.</span>
              </div>
            ) : (
              <div className="discover-grid">
                {discoverPartners.map((partner) => (
                  <article className="discover-card" key={partner._id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/food-partner/${partner._id}`)}
                    >
                      <div className="discover-card-image">
                        {partner.profileImage ? (
                          <img src={partner.profileImage} alt={`${partner.fullName} profile`} />
                        ) : (
                          <span>{partner.fullName?.charAt(0).toUpperCase() || 'F'}</span>
                        )}
                        {partner.rating > 0 && (
                          <strong>★ {Number(partner.rating).toFixed(1)}</strong>
                        )}
                      </div>
                      <div className="discover-card-copy">
                        <h2>{partner.fullName}</h2>
                        <p>{partner.address}</p>
                        <div>
                          <span>{partner.foodType || 'both'}</span>
                          <span>{partner.reelCount || 0} reels</span>
                        </div>
                        {partner.matchingFoods?.length > 0 && (
                          <p className="discover-matches">
                            {partner.matchingFoods
                              .slice(0, 3)
                              .map((food) => food.name)
                              .join(' · ')}
                          </p>
                        )}
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <nav className="reel-bottom-nav" aria-label="Reel navigation">
          <button type="button" onClick={() => setActiveFeed('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" /></svg>
            <span>Home</span>
          </button>
          <button className="is-active" type="button" aria-current="page">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4Z" /></svg>
            <span>Discover</span>
          </button>
          <button type="button" onClick={() => setActiveFeed('saved')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>
            <span>Saved</span>
          </button>
          <button type="button" onClick={() => navigate('/profile')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /></svg>
            <span>Profile</span>
          </button>
        </nav>
      </main>
    )
  }

  if (isLoading) {
    return <main className="reels-message" aria-live="polite">Loading food videos…</main>
  }

  if (error) {
    return (
      <main className="reels-message">
        <p role="alert">{error}</p>
        {error === 'Please sign in to watch food videos.' && (
          <Link to="/user/login">Sign in</Link>
        )}
      </main>
    )
  }

  if (!foodItems.length) {
    return (
      <main className="reels-message">
        <p>{activeFeed === 'saved' ? 'You have no saved reels yet.' : 'No food videos are available yet.'}</p>
        {activeFeed === 'saved' && (
          <button className="saved-empty-home" type="button" onClick={() => setActiveFeed('home')}>
            Browse reels
          </button>
        )}
        <nav className="reel-bottom-nav reel-bottom-nav-empty" aria-label="Reel navigation">
          <button
            className={activeFeed === 'home' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveFeed('home')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" /></svg>
            <span>Home</span>
          </button>
          <button type="button" onClick={() => setActiveFeed('discover')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m15 9-2 4-4 2 2-4Z" /></svg>
            <span>Discover</span>
          </button>
          <button
            className={activeFeed === 'saved' ? 'is-active' : ''}
            type="button"
            onClick={() => setActiveFeed('saved')}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" /></svg>
            <span>Saved</span>
          </button>
          <button type="button" onClick={() => navigate('/profile')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" /></svg>
            <span>Profile</span>
          </button>
        </nav>
      </main>
    )
  }

  return (
    <main className="reels-feed" aria-label="Food videos">
      {foodItems.map((food, index) => {
        const partner = food.foodPartner && typeof food.foodPartner === 'object'
          ? food.foodPartner
          : null

        return (
          <article className="reel" key={food._id || `${food.video}-${index}`}>
            <video
              ref={(element) => { videoRefs.current[index] = element }}
              className="reel-video"
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={food.name ? `Video of ${food.name}` : 'Food video'}
              data-index={index}
              data-video-src={food.video}
              onError={() => {
                setUnavailableVideoIndices((current) => (
                  current.includes(index) ? current : [...current, index]
                ))
              }}
            />
            {unavailableVideoIndices.includes(index) && (
              <p className="reel-unavailable" role="status">
                This video could not be loaded. The store may need to re-upload it.
              </p>
            )}
            {playbackErrorIndex === index && !unavailableVideoIndices.includes(index) && (
              <button
                className="reel-play-button"
                type="button"
                onClick={() => {
                  videoRefs.current[index]?.play()
                    .then(() => setPlaybackErrorIndex(null))
                    .catch(() => setPlaybackErrorIndex(index))
                }}
              >
                Tap to play video
              </button>
            )}
            <div className="reel-topbar">
              <Link className="reel-brand" to="/" aria-label="Zomato home">zomato</Link>
              <span className="reel-count">{index + 1} / {foodItems.length}</span>
            </div>
            <div className="reel-details">
              <p className="reel-partner">{partner?.fullName || 'Food partner'}</p>
              <h1 className="reel-title">{food.name}</h1>
              {food.description && (
                <div className="reel-description-wrap">
                  <p className={`reel-description${expandedDescriptions[food._id] ? ' is-expanded' : ''}`}>
                    {food.description}
                  </p>
                  {food.description.length > 90 && (
                    <button
                      className="reel-description-toggle"
                      type="button"
                      aria-expanded={Boolean(expandedDescriptions[food._id])}
                      onClick={() => setExpandedDescriptions((current) => ({
                        ...current,
                        [food._id]: !current[food._id],
                      }))}
                    >
                      {expandedDescriptions[food._id] ? 'See less' : 'See more'}
                    </button>
                  )}
                </div>
              )}
              <button
                className="reel-store-button"
                type="button"
                onClick={() => {
                  if (partner?._id) {
                    navigate(`/food-partner/${partner._id}`, { state: { partner } })
                  }
                }}
                disabled={!partner?._id}
              >
                Visit store
              </button>
            </div>
            <aside className="reel-actions" aria-label="Food actions">
              <button
                className={`reel-action-button${food.isLiked ? ' is-active' : ''}`}
                type="button"
                aria-label={food.isLiked ? 'Unlike this food' : 'Like this food'}
                aria-pressed={Boolean(food.isLiked)}
                disabled={actionPending[`like-${food._id}`]}
                onClick={() => toggleFoodAction(food._id, 'like')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
                </svg>
                <span>{food.likeCount || 0}</span>
              </button>
              <button
                className="reel-action-button"
                type="button"
                aria-label={`View comments on ${food.name}`}
                onClick={() => openComments(food)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z" />
                </svg>
                <span>{food.commentCount || 0}</span>
              </button>
              <button
                className={`reel-action-button${food.isSaved ? ' is-active' : ''}`}
                type="button"
                aria-label={food.isSaved ? 'Remove from saved foods' : 'Save this food'}
                aria-pressed={Boolean(food.isSaved)}
                disabled={actionPending[`save-${food._id}`]}
                onClick={() => toggleFoodAction(food._id, 'save')}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                </svg>
                <span>{food.saveCount || 0}</span>
              </button>
              <button
                className="reel-action-button reel-report-button"
                type="button"
                aria-label={`Report ${food.name}`}
                onClick={() => openReport('reel', food)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 21V4m0 1h10l-1 4 4 3H5" />
                </svg>
                <span>Report</span>
              </button>
            </aside>
          </article>
        )
      })}

      <nav className="reel-bottom-nav" aria-label="Reel navigation">
        <button
          className={activeFeed === 'home' ? 'is-active' : ''}
          type="button"
          onClick={() => setActiveFeed('home')}
          aria-current={activeFeed === 'home' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 11.5 12 4l9 7.5M5 10v10h14V10M9 20v-6h6v6" />
          </svg>
          <span>Home</span>
        </button>
        <button type="button" onClick={() => setActiveFeed('discover')}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m15 9-2 4-4 2 2-4Z" />
          </svg>
          <span>Discover</span>
        </button>
        <button
          className={activeFeed === 'saved' ? 'is-active' : ''}
          type="button"
          onClick={() => setActiveFeed('saved')}
          aria-current={activeFeed === 'saved' ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
          </svg>
          <span>Saved</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile')}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0" />
          </svg>
          <span>Profile</span>
        </button>
      </nav>

      {commentFood && (
        <div className="comment-backdrop" onClick={() => setCommentFood(null)}>
          <section
            className="comment-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="comment-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="comment-sheet-header">
              <div>
                <p>{commentFood.commentCount || comments.length} comments</p>
                <h2 id="comment-sheet-title">{commentFood.name}</h2>
              </div>
              <button type="button" aria-label="Close comments" onClick={() => setCommentFood(null)}>×</button>
            </div>

            <div className="comment-list" aria-live="polite">
              {isCommentsLoading ? (
                <p className="comment-empty">Loading comments…</p>
              ) : comments.length === 0 ? (
                <div className="comment-empty">
                  <strong>No comments yet</strong>
                  <span>Be the first to share your thoughts.</span>
                </div>
              ) : (
                comments.map((comment) => (
                  <CommentThread
                    key={comment._id}
                    comment={comment}
                    onReply={(target) => {
                      setReplyingTo(target)
                      setCommentText('')
                    }}
                    onReport={(target) => openReport('comment', target)}
                  />
                ))
              )}
            </div>

            <form className="comment-composer" onSubmit={postComment}>
              {replyingTo && (
                <div className="comment-reply-context">
                  <span>Replying to {replyingTo.user?.fullName || 'User'}</span>
                  <button type="button" onClick={() => setReplyingTo(null)}>Cancel</button>
                </div>
              )}
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                maxLength={500}
                aria-label={replyingTo ? 'Write a reply' : 'Write a comment'}
              />
              <button type="submit" disabled={isCommentPosting || !commentText.trim()}>
                {isCommentPosting ? 'Posting…' : replyingTo ? 'Reply' : 'Post'}
              </button>
            </form>
          </section>
        </div>
      )}

      {reportTarget && (
        <div className="report-backdrop" onClick={() => setReportTarget(null)}>
          <section
            className="report-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="report-sheet-header">
              <div>
                <p>Content report</p>
                <h2 id="report-title">Report {reportTarget.type}</h2>
              </div>
              <button type="button" aria-label="Close report" onClick={() => setReportTarget(null)}>×</button>
            </div>
            <form className="report-form" onSubmit={submitReport}>
              <label>
                <span>Reason</span>
                <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="spam">Spam</option>
                  <option value="false_information">False information</option>
                  <option value="harassment">Harassment</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                <span>Details <small>optional</small></span>
                <textarea
                  value={reportDetails}
                  onChange={(event) => setReportDetails(event.target.value)}
                  maxLength={500}
                  rows={4}
                  placeholder="Tell us what happened..."
                />
              </label>
              {reportMessage && <p className="report-message" role="status">{reportMessage}</p>}
              <div className="report-actions">
                <button type="button" onClick={() => setReportTarget(null)}>Cancel</button>
                <button type="submit" disabled={isReporting}>
                  {isReporting ? 'Submitting…' : 'Submit report'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default Home
