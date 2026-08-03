import { useState, useEffect, useRef } from 'react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { MapPin } from 'lucide-react'
import Input from '../ui/Input'
import Toggle from '../ui/Toggle'
import FileUpload from '../ui/FileUpload'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

// ── Click-to-edit display field ──────────────────────────────────────────────

function ClickToEdit({ value, onChange, onBlur, placeholder, displayClassName, inputClassName, maxLength }) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      const len = inputRef.current.value.length
      inputRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onBlur={() => { setEditing(false); onBlur?.() }}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'Escape') { setEditing(false); onBlur?.() }
        }}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`bg-transparent border-none outline-none w-full ${inputClassName}`}
      />
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Click to edit"
      className={`cursor-text select-none rounded px-1 -mx-1 transition-colors hover:bg-surface-3 ${displayClassName}`}
    >
      {value
        ? <span>{value}</span>
        : <span className="opacity-25">{placeholder}</span>
      }
    </div>
  )
}

// ── Form ─────────────────────────────────────────────────────────────────────

export default function MetaForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)

  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      displayName:  data?.displayName  || '',
      title:        data?.title        || '',
      shortIntro:   data?.shortIntro   || '',
      location:     data?.location     || '',
      website:      data?.website      || '',
      profilePhoto: data?.profilePhoto || null,
      resume:       data?.resume       || null,
      openToWork:   data?.openToWork   ?? false,
    }
  })

  const profilePhoto = useWatch({ control, name: 'profilePhoto' })
  const backdropUrl  = profilePhoto || null

  const shortIntro = useWatch({ control, name: 'shortIntro' })
  const shortIntroLen = (shortIntro || '').length

  const onSubmit = async (values) => {
    try {
      await updateSection('meta', values)
      setStatus('saved')
      onSaved?.()
      setTimeout(() => setStatus(null), 2500)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus(null), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* ── Hero zone: blurred photo backdrop + click-to-edit text ── */}
      <div className="relative rounded-2xl overflow-hidden" style={{ minHeight: 130 }}>

        {backdropUrl ? (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${backdropUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center top',
                transform: 'scale(1.12)',
                filter: 'blur(38px)',
                opacity: 0.2,
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--color-bg) 25%, transparent) 0%, color-mix(in srgb, var(--color-bg) 80%, transparent) 100%)' }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{ background: 'var(--color-surface-1)', border: '1px solid var(--color-bg-border)' }}
          />
        )}

        {/* Click-to-edit stack */}
        <div className="relative px-4 py-5 space-y-2">
          <Controller name="displayName" control={control}
            rules={{ required: 'Required', maxLength: { value: 200, message: 'Must be at most 200 characters' } }}
            render={({ field }) => (
              <ClickToEdit
                value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                placeholder="Your name"
                maxLength={200}
                displayClassName="text-3xl font-bold text-text-primary leading-tight"
                inputClassName="text-3xl font-bold text-text-primary leading-tight"
              />
            )}
          />
          {errors.displayName && <span className="text-xs text-error">{errors.displayName.message}</span>}

          <Controller name="title" control={control}
            rules={{ required: 'Required', maxLength: { value: 200, message: 'Must be at most 200 characters' } }}
            render={({ field }) => (
              <ClickToEdit
                value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                placeholder="Your title / role"
                maxLength={200}
                displayClassName="text-base text-text-dim font-medium"
                inputClassName="text-base text-text-dim font-medium"
              />
            )}
          />
          {errors.title && <span className="text-xs text-error">{errors.title.message}</span>}

          <Controller name="location" control={control}
            rules={{ maxLength: { value: 200, message: 'Must be at most 200 characters' } }}
            render={({ field }) => (
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-text-muted shrink-0 opacity-50" />
                <ClickToEdit
                  value={field.value} onChange={field.onChange} onBlur={field.onBlur}
                  placeholder="City, Country"
                  maxLength={200}
                  displayClassName="text-sm text-text-muted"
                  inputClassName="text-sm text-text-muted"
                />
              </div>
            )}
          />
        </div>
      </div>

      {/* ── Regular fields ── */}
      <div
        className="rounded-xl bg-surface-1 space-y-5 p-4"
      >
        <Controller name="profilePhoto" control={control}
          render={({ field }) => (
            <FileUpload label="Profile Photo" value={field.value} onChange={field.onChange} accept="image/*" />
          )}
        />

        <div className="flex flex-col gap-1">
          <Input
            label="Short Intro"
            required
            maxLength={280}
            {...register('shortIntro', {
              required: 'Required',
              maxLength: { value: 280, message: 'Must be at most 280 characters' },
            })}
            error={errors.shortIntro?.message}
            placeholder="One-liner about yourself"
          />
          <span
            className="self-end text-[10px] tabular-nums leading-none"
            style={{ color: shortIntroLen > 252 ? 'var(--color-error)' : 'var(--color-text-muted)' }}
          >
            {shortIntroLen} / 280
          </span>
        </div>

        <Input label="Website" type="url" maxLength={1000} {...register('website')} placeholder="https://yoursite.com" />

        <Controller name="resume" control={control}
          render={({ field }) => (
            <FileUpload label="Resume (PDF)" value={field.value} onChange={field.onChange}
              accept=".pdf,application/pdf" maxSizeMB={5} />
          )}
        />

        <Controller name="openToWork" control={control}
          render={({ field }) => (
            <Toggle
              label="Open to Work"
              description="Show 'available for opportunities' badge on your portfolio"
              checked={!!field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}
