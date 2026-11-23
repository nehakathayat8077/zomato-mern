import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import './CreateFood.css'

const MAX_VIDEO_SIZE = 100 * 1024 * 1024
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

function preventImplicitSubmit(event) {
  const { key, target } = event
  if (key !== 'Enter' || !(target instanceof HTMLInputElement)) return
  if (['button', 'submit', 'reset', 'file', 'checkbox', 'radio'].includes(target.type)) return
  event.preventDefault()
}

function CreateFood() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [video, setVideo] = useState(null)
  const [videoPreview, setVideoPreview] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')
  const [partner, setPartner] = useState(null)
  const [ownReels, setOwnReels] = useState([])
  const [isProfileEditing, setIsProfileEditing] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileAddress, setProfileAddress] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileRating, setProfileRating] = useState(0)
  const [profileOpeningTime, setProfileOpeningTime] = useState('')
  const [profileClosingTime, setProfileClosingTime] = useState('')
  const [profileCity, setProfileCity] = useState('')
  const [profileFoodType, setProfileFoodType] = useState('both')
  const [profileCategories, setProfileCategories] = useState([])
  const [profileImage, setProfileImage] = useState(null)
  const [profileImagePreview, setProfileImagePreview] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const profileImageRef = useRef(null)
  const [editingReel, setEditingReel] = useState(null)
  const [editReelName, setEditReelName] = useState('')
  const [editReelDescription, setEditReelDescription] = useState('')
  const [editReelTags, setEditReelTags] = useState('')
  const [isSavingReel, setIsSavingReel] = useState(false)
  const [deletingReel, setDeletingReel] = useState(null)
  const [isDeletingReel, setIsDeletingReel] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const loadDashboard = async () => {
      try {
        const response = await axios.get('/api/food-partner/me', {
          withCredentials: true,
          signal: controller.signal,
        })
        setPartner(response.data.partner)
        setOwnReels(Array.isArray(response.data.reels) ? response.data.reels : [])
        setProfileName(response.data.partner?.fullName || '')
        setProfileAddress(response.data.partner?.address || '')
        setProfilePhone(response.data.partner?.phone || '')
        setProfileRating(response.data.partner?.rating || 0)
        setProfileOpeningTime(response.data.partner?.openingTime || '')
        setProfileClosingTime(response.data.partner?.closingTime || '')
        setProfileCity(response.data.partner?.city || '')
        setProfileFoodType(response.data.partner?.foodType || 'both')
        setProfileCategories(Array.isArray(response.data.partner?.categories) ? response.data.partner.categories : [])
      } catch (error) {
        if (!axios.isCancel(error) && error.response?.status === 401) {
          navigate('/food-partner/login')
        }
      }
    }
    loadDashboard()
    return () => controller.abort()
  }, [navigate])

  useEffect(() => {
    if (!videoPreview) return undefined
    return () => URL.revokeObjectURL(videoPreview)
  }, [videoPreview])

  const selectVideo = (file) => {
    setFeedback('')
    setFeedbackType('')

    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setFeedback('Please upload an MP4, WebM, or MOV video.')
      setFeedbackType('error')
      return
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setFeedback('The video must be smaller than 100 MB.')
      setFeedbackType('error')
      return
    }

    setVideoPreview(URL.createObjectURL(file))
    setVideo(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')
    setFeedbackType('')

    if (!video) {
      setFeedback('Add a food video before publishing.')
      setFeedbackType('error')
      fileInputRef.current?.focus()
      return
    }

    const formData = new FormData()
    formData.append('video', video)
    formData.append('name', name.trim())
    formData.append('description', description.trim())
    formData.append('tags', tags)

    setIsSubmitting(true)
    try {
      const response = await axios.post('/api/food', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setOwnReels((current) => [response.data.food, ...current])
      setFeedback('Your food reel has been published.')
      setFeedbackType('success')
      setName('')
      setDescription('')
      setTags('')
      setVideo(null)
      setVideoPreview('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      if (error.response?.status === 401) {
        setFeedback('Please log in as a food partner to publish.')
      } else {
        setFeedback(error.response?.data?.message || 'Unable to publish this food. Please try again.')
      }
      setFeedbackType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectProfileImage = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setProfileImage(file)
    setProfileImagePreview(URL.createObjectURL(file))
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setIsSavingProfile(true)
    const formData = new FormData()
    formData.append('fullName', profileName.trim())
    formData.append('address', profileAddress.trim())
    formData.append('phone', profilePhone.trim())
    formData.append('rating', profileRating)
    formData.append('openingTime', profileOpeningTime)
    formData.append('closingTime', profileClosingTime)
    formData.append('city', profileCity)
    formData.append('foodType', profileFoodType)
    formData.append('categories', profileCategories.join(','))
    if (profileImage) formData.append('profileImage', profileImage)

    try {
      const response = await axios.patch('/api/food-partner/me', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPartner(response.data.partner)
      setProfileImage(null)
      setProfileImagePreview('')
      setIsProfileEditing(false)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const openReelEditor = (reel) => {
    setEditingReel(reel)
    setEditReelName(reel.name || '')
    setEditReelDescription(reel.description || '')
    setEditReelTags(Array.isArray(reel.tags) ? reel.tags.join(', ') : '')
  }

  const saveReel = async (event) => {
    event.preventDefault()
    if (!editingReel) return

    setIsSavingReel(true)
    try {
      const response = await axios.patch(`/api/food/${editingReel._id}`, {
        name: editReelName.trim(),
        description: editReelDescription.trim(),
        tags: editReelTags,
      }, {
        withCredentials: true,
      })
      setOwnReels((current) => current.map((reel) => (
        reel._id === editingReel._id ? response.data.food : reel
      )))
      setEditingReel(null)
    } finally {
      setIsSavingReel(false)
    }
  }

  const deleteReel = async () => {
    if (!deletingReel) return
    setIsDeletingReel(true)
    try {
      await axios.delete(`/api/food/${deletingReel._id}`, {
        withCredentials: true,
      })
      setOwnReels((current) => current.filter((reel) => reel._id !== deletingReel._id))
      setDeletingReel(null)
    } finally {
      setIsDeletingReel(false)
    }
  }

  return (
    <main className="create-food-page">
      <header className="create-food-header">
        <button
          className="create-food-back"
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <span aria-hidden="true">←</span>
        </button>
        <Link className="create-food-wordmark" to="/" aria-label="Zomato home">
          zomato
        </Link>
        <span className="create-food-header-spacer" aria-hidden="true" />
      </header>

      <div className="create-food-layout">
        <section className="create-food-intro" aria-labelledby="create-food-title">
          <p className="create-food-eyebrow">Partner studio</p>
          <h1 id="create-food-title">Share something delicious</h1>
          <p>Create a short food reel that helps customers discover your dish.</p>
        </section>

        {partner && (
          <section className="partner-dashboard-card" aria-label="Partner profile">
            {isProfileEditing ? (
              <form
                className="partner-profile-edit"
                onSubmit={saveProfile}
                onKeyDown={preventImplicitSubmit}
              >
                <button
                  className="partner-profile-image-edit"
                  type="button"
                  onClick={() => profileImageRef.current?.click()}
                  aria-label="Change profile image"
                >
                  {profileImagePreview || partner.profileImage ? (
                    <img src={profileImagePreview || partner.profileImage} alt="" />
                  ) : (
                    <span>{(profileName || 'Food Partner').charAt(0).toUpperCase()}</span>
                  )}
                  <small>Change photo</small>
                </button>
                <input
                  ref={profileImageRef}
                  className="create-food-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => selectProfileImage(event.target.files?.[0])}
                />
                <div className="partner-profile-fields">
                  <label className="create-food-field">
                    <span>Store name</span>
                    <input
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      required
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Address</span>
                    <input
                      value={profileAddress}
                      onChange={(event) => setProfileAddress(event.target.value)}
                      required
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Phone</span>
                    <input
                      value={profilePhone}
                      onChange={(event) => setProfilePhone(event.target.value)}
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Rating</span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={profileRating}
                      onChange={(event) => setProfileRating(event.target.value)}
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Opening time</span>
                    <input
                      type="time"
                      value={profileOpeningTime}
                      onChange={(event) => setProfileOpeningTime(event.target.value)}
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Closing time</span>
                    <input
                      type="time"
                      value={profileClosingTime}
                      onChange={(event) => setProfileClosingTime(event.target.value)}
                    />
                  </label>
                  <label className="create-food-field">
                    <span>City</span>
                    <input
                      value={profileCity}
                      onChange={(event) => setProfileCity(event.target.value)}
                      placeholder="e.g. Delhi"
                    />
                  </label>
                  <label className="create-food-field">
                    <span>Food type</span>
                    <select
                      className="partner-profile-select"
                      value={profileFoodType}
                      onChange={(event) => setProfileFoodType(event.target.value)}
                    >
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-veg</option>
                      <option value="both">Veg & Non-veg</option>
                    </select>
                  </label>
                  <fieldset className="partner-category-picker">
                    <legend>Categories</legend>
                    {['Indian', 'Chinese', 'Biryani', 'Pizza', 'Cafe', 'Desserts', 'Fast Food'].map((category) => (
                      <button
                        key={category}
                        type="button"
                        className={profileCategories.includes(category) ? 'is-active' : ''}
                        onClick={() => setProfileCategories((current) => (
                          current.includes(category)
                            ? current.filter((item) => item !== category)
                            : [...current, category]
                        ))}
                      >
                        {category}
                      </button>
                    ))}
                  </fieldset>
                  <div className="partner-profile-edit-actions">
                    <button
                      className="partner-profile-cancel"
                      type="button"
                      onClick={() => setIsProfileEditing(false)}
                    >
                      Cancel
                    </button>
                    <button className="partner-profile-save" type="submit" disabled={isSavingProfile}>
                      {isSavingProfile ? 'Saving…' : 'Save profile'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <>
                <div className="partner-dashboard-avatar">
                  {partner.profileImage ? (
                    <img src={partner.profileImage} alt={`${partner.fullName} profile`} />
                  ) : (
                    <span>{(partner.fullName || 'Food Partner').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="partner-dashboard-copy">
                  <p>Welcome back</p>
                  <h2>{partner.fullName}</h2>
                  {partner.address && <span>{partner.address}</span>}
                  <div className="partner-dashboard-meta">
                    <span>★ {(Number(partner.rating) || 0).toFixed(1)}</span>
                    {(partner.openingTime || partner.closingTime) && (
                      <span>{partner.openingTime || 'Open'} – {partner.closingTime || 'Close'}</span>
                    )}
                  </div>
                </div>
                <div className="partner-dashboard-count">
                  <strong>{ownReels.length}</strong>
                  <span>{ownReels.length === 1 ? 'Reel' : 'Reels'}</span>
                </div>
                <button
                  className="partner-profile-edit-button"
                  type="button"
                  onClick={() => setIsProfileEditing(true)}
                >
                  Edit profile
                </button>
              </>
            )}
          </section>
        )}

        <form
          className="create-food-card"
          onSubmit={handleSubmit}
          onKeyDown={preventImplicitSubmit}
        >
          <section className="create-food-section" aria-labelledby="video-heading">
            <div className="create-food-section-heading">
              <span className="create-food-step">1</span>
              <div>
                <h2 id="video-heading">Food video</h2>
                <p>Add an MP4, WebM, or MOV up to 100 MB</p>
              </div>
            </div>

            {videoPreview ? (
              <div className="create-food-video-preview">
                <video src={videoPreview} muted loop playsInline autoPlay controls />
                <button
                  className="create-food-change-video"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change video
                </button>
              </div>
            ) : (
              <div
                className={`create-food-dropzone${isDragging ? ' is-dragging' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragEnter={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  selectVideo(event.dataTransfer.files?.[0])
                }}
              >
                <div className="create-food-upload-icon" aria-hidden="true">
                  <span>+</span>
                </div>
                <strong>Upload food video</strong>
                <span>Tap to browse or drag a video here</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              className="create-food-file-input"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => selectVideo(event.target.files?.[0])}
              tabIndex={-1}
            />
          </section>

          <section className="create-food-section" aria-labelledby="details-heading">
            <div className="create-food-section-heading">
              <span className="create-food-step">2</span>
              <div>
                <h2 id="details-heading">Dish details</h2>
                <p>Make it clear and tempting</p>
              </div>
            </div>

            <label className="create-food-field">
              <span>Food name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Truffle paneer pizza"
                maxLength={80}
                required
              />
              <small>{name.length}/80</small>
            </label>

            <label className="create-food-field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell customers what makes this dish special..."
                maxLength={500}
                rows={5}
              />
              <small>{description.length}/500</small>
            </label>
            <label className="create-food-field">
              <span>Search tags</span>
              <input
                type="text"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="e.g. spicy, paneer, lunch"
                maxLength={160}
              />
              <small>Comma separated</small>
            </label>
          </section>

          {feedback && (
            <p className={`create-food-feedback ${feedbackType}`} role="status">
              {feedback}
              {feedbackType === 'success' && (
                <button type="button" onClick={() => navigate('/')}>
                  View reels
                </button>
              )}
            </p>
          )}

          <button
            className="create-food-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publishing…' : 'Publish food'}
          </button>
        </form>

        <section className="partner-own-reels" aria-labelledby="own-reels-heading">
          <div className="partner-own-reels-heading">
            <div>
              <p>Your library</p>
              <h2 id="own-reels-heading">Published reels</h2>
            </div>
            <span>{ownReels.length}</span>
          </div>

          {ownReels.length === 0 ? (
            <div className="partner-own-reels-empty">
              <div aria-hidden="true">▶</div>
              <h3>Your first reel starts here</h3>
              <p>Upload a dish video above and it will appear in this gallery.</p>
            </div>
          ) : (
            <div className="partner-own-reels-grid">
              {ownReels.map((reel) => (
                <article className="partner-own-reel" key={reel._id}>
                  <video
                    src={reel.video}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    onMouseEnter={(event) => event.currentTarget.play()}
                    onMouseLeave={(event) => event.currentTarget.pause()}
                    aria-label={reel.name ? `Reel: ${reel.name}` : 'Food reel'}
                  />
                  <div className="partner-own-reel-info">
                    <strong>{reel.name}</strong>
                    {reel.description && <span>{reel.description}</span>}
                  </div>
                  <div className="partner-own-reel-actions">
                    <button type="button" onClick={() => openReelEditor(reel)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => setDeletingReel(reel)}>
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {editingReel && (
          <div className="reel-edit-backdrop" onClick={() => setEditingReel(null)}>
            <section
              className="reel-edit-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-reel-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="reel-edit-header">
                <div>
                  <p>Edit reel</p>
                  <h2 id="edit-reel-title">{editingReel.name}</h2>
                </div>
                <button type="button" aria-label="Close editor" onClick={() => setEditingReel(null)}>×</button>
              </div>

              <form
                className="reel-edit-form"
                onSubmit={saveReel}
                onKeyDown={preventImplicitSubmit}
              >
                <label className="create-food-field">
                  <span>Food name</span>
                  <input
                    value={editReelName}
                    onChange={(event) => setEditReelName(event.target.value)}
                    maxLength={80}
                    required
                  />
                  <small>{editReelName.length}/80</small>
                </label>

                <label className="create-food-field">
                  <span>Description</span>
                  <textarea
                    value={editReelDescription}
                    onChange={(event) => setEditReelDescription(event.target.value)}
                    maxLength={500}
                    rows={4}
                  />
                  <small>{editReelDescription.length}/500</small>
                </label>

                <label className="create-food-field">
                  <span>Search tags</span>
                  <input
                    value={editReelTags}
                    onChange={(event) => setEditReelTags(event.target.value)}
                    placeholder="pizza, burger, spicy"
                    maxLength={160}
                  />
                  <small>Comma separated</small>
                </label>

                <div className="reel-edit-actions">
                  <button type="button" onClick={() => setEditingReel(null)}>Cancel</button>
                  <button type="submit" disabled={isSavingReel || !editReelName.trim()}>
                    {isSavingReel ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {deletingReel && (
          <div className="reel-delete-backdrop" onClick={() => setDeletingReel(null)}>
            <section
              className="reel-delete-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-reel-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="reel-delete-icon" aria-hidden="true">×</div>
              <h2 id="delete-reel-title">Delete this reel?</h2>
              <p>“{deletingReel.name}” and its likes, saves, and comments will be removed.</p>
              <div className="reel-delete-actions">
                <button type="button" onClick={() => setDeletingReel(null)}>Cancel</button>
                <button type="button" disabled={isDeletingReel} onClick={deleteReel}>
                  {isDeletingReel ? 'Deleting…' : 'Delete reel'}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}

export default CreateFood
