import { useState, useRef } from 'react'
import { Upload, X, File, Image } from 'lucide-react'
import { uploadFile } from '../../api/files'

export default function FileUpload({
  label,
  value,                  // canonical Cloudinary URL (or null)
  onChange,
  accept = "image/*",
  maxSizeMB = 5,
  error,
  className = "",
}) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const inputRef = useRef(null)

  const previewUrl = value || null
  const isImage = accept.includes("image")

  async function handleFile(file) {
    if (!file) return

    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadError(`File is larger than ${maxSizeMB}MB.`)
      return
    }

    setUploading(true)
    setUploadError(null)
    try {
      const data = await uploadFile(file)
      onChange(data.url)
    } catch (err) {
      console.error("Upload failed:", err)
      setUploadError(err?.response?.data?.message || "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  // Just clear the value — the backend cleans up the Cloudinary asset when the
  // next portfolio save diffs the removed URL.
  function handleRemove() {
    onChange(null)
    setUploadError(null)
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-text-muted tracking-wide">{label}</label>
      )}

      {previewUrl ? (
        <div className="relative group">
          {isImage ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-40 object-cover rounded-lg border border-bg-border"
            />
          ) : (
            <div className="w-full h-20 rounded-lg border border-bg-border bg-bg-surface flex items-center gap-3 px-4">
              <File size={20} className="text-primary" />
              <span className="text-sm text-text-dim truncate">File uploaded</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-bg/80 backdrop-blur-sm border border-bg-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={14} className="text-text-dim" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`w-full h-32 rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors ${
            dragOver
              ? 'border-primary/50 bg-primary/5'
              : 'border-bg-border hover:border-primary/30 hover:bg-bg-surface-light/30'
          } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              {isImage ? <Image size={24} className="text-text-muted" /> : <Upload size={24} className="text-text-muted" />}
              <p className="text-xs text-text-muted">
                Click or drag to upload
              </p>
              <p className="text-xs text-text-muted/60">
                Max {maxSizeMB}MB
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      {(uploadError || error) && (
        <span className="text-xs text-error">{uploadError || error}</span>
      )}
    </div>
  )
}
