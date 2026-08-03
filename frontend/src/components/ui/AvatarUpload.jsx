import { useState, useRef } from 'react'
import { Camera, X, UserRound } from 'lucide-react'
import { uploadFile } from '../../api/files'

export default function AvatarUpload({ value, onChange, initials }) {
  // `value` is the canonical Cloudinary URL (or null) — stored straight into the field.
  const [uploading, setUploading] = useState(false)
  const [dragOver,  setDragOver]  = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const inputRef = useRef(null)
  const previewUrl = value || null

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image is larger than 5MB.')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const data = await uploadFile(file)
      onChange(data.url)
    } catch (err) {
      setUploadError(err?.response?.data?.message || 'Upload failed — please try again')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  // Just clear the value — the backend prunes orphaned Cloudinary assets when
  // the portfolio is saved next.
  function handleRemove(e) {
    e.stopPropagation()
    onChange(null)
    setUploadError(null)
  }

  return (
    <div className="flex flex-col items-center gap-3 py-1">

      {/* Avatar circle */}
      <div
        className="relative w-24 h-24 group cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <>
            {/* Subtle gradient ring behind photo */}
            <div className="absolute -inset-0.5 rounded-full gradient-bg opacity-50 blur-[1px]" />

            <img
              src={previewUrl}
              alt="Profile"
              className="relative w-full h-full object-cover rounded-full border-2 border-bg-border-strong shadow-xl"
            />

            {/* Change overlay */}
            <div className="absolute inset-0 rounded-full bg-scrim opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <Camera size={18} className="text-white" />
              <span className="text-[10px] font-semibold text-white/90 tracking-wide uppercase">Change</span>
            </div>

            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-0.5 -right-0.5 w-6 h-6 rounded-full bg-bg border border-bg-border-strong shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-error/15 hover:border-error/50 z-10"
            >
              <X size={11} className="text-text-dim hover:text-error transition-colors" />
            </button>
          </>
        ) : (
          <div
            className={`w-full h-full rounded-full border-2 border-dashed flex flex-col items-center justify-center gap-1.5 transition-all duration-200 ${
              dragOver
                ? 'border-primary/60 bg-primary/10 scale-105'
                : 'border-bg-border-strong bg-surface-2 group-hover:border-primary/40 group-hover:bg-primary/6'
            }`}
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : initials ? (
              <>
                <span className="text-2xl font-bold text-text-muted/50 leading-none select-none"
                  style={{ fontFamily: 'var(--font-display)' }}>
                  {initials}
                </span>
                <span className="text-[9px] text-text-muted/50 font-medium uppercase tracking-wide">Add photo</span>
              </>
            ) : (
              <>
                <UserRound size={24} className="text-text-muted/40 group-hover:text-primary/50 transition-colors" />
                <span className="text-[10px] text-text-muted/60 group-hover:text-text-muted font-medium transition-colors">Add photo</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Text action */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-xs transition-colors"
        style={{ color: previewUrl ? 'var(--color-primary)' : 'color-mix(in srgb, var(--color-text-muted) 60%, transparent)' }}
      >
        {previewUrl ? 'Change photo' : 'Upload a photo'}
        {!previewUrl && <span className="ml-1 opacity-50">· or drag & drop</span>}
      </button>

      {uploadError && (
        <span className="text-[11px] text-error">{uploadError}</span>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files[0])}
      />
    </div>
  )
}
