import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { X } from 'lucide-react'
import Input from '../ui/Input'
import Toggle from '../ui/Toggle'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

function buildCtaOptions(portfolio) {
  const opts = []
  if (portfolio?.about) opts.push({ label: 'About Me', href: '#about' })
  if (portfolio?.experience?.items?.length) opts.push({ label: 'My Experience', href: '#experience' })
  if (portfolio?.projects?.items?.length) opts.push({ label: 'View My Work', href: '#projects' })
  if (portfolio?.skills?.items?.length) opts.push({ label: 'My Skills', href: '#skills' })
  if (portfolio?.research?.items?.length) opts.push({ label: 'Research', href: '#research' })
  opts.push({ label: 'Get In Touch', href: '#contact' })
  if (portfolio?.meta?.resume) {
    opts.push({ label: 'Download Resume', href: portfolio.meta.resume })
  }
  return opts
}

export default function HeroForm({ data, portfolio, onSaved }) {
  const [status, setStatus] = useState(null)

  const contactSocials = (portfolio?.contact?.socials || []).filter(s => s.platform)
  const validPlatforms = new Set(contactSocials.map(s => s.platform))

  const { register, control, handleSubmit, watch, setValue, getValues, formState: { isSubmitting } } = useForm({
    defaultValues: {
      greeting: data?.greeting || "Hi, I'm",
      showProfilePhoto: data?.showProfilePhoto ?? true,
      cta: {
        primary: data?.cta?.primary || { label: '', href: '' },
        secondary: data?.cta?.secondary || { label: '', href: '' },
      },
      // Filter out any saved hero socials whose platform no longer exists in contact
      socials: (data?.socials || []).filter(s => validPlatforms.has(s.platform)),
    }
  })

  const ctaOptions = buildCtaOptions(portfolio)

  // Keep form socials in sync whenever contact socials change (compare by value, not reference)
  const contactPlatformKey = contactSocials.map(s => s.platform).sort().join(',')
  useEffect(() => {
    const current = getValues('socials') || []
    const filtered = current.filter(s => validPlatforms.has(s.platform))
    if (filtered.length !== current.length) {
      setValue('socials', filtered, { shouldDirty: true })
    }
  }, [contactPlatformKey])

  const primaryHref = watch('cta.primary.href')
  const secondaryHref = watch('cta.secondary.href')
  const selectedSocials = watch('socials') || []

  function pickCta(slot, opt) {
    setValue(`cta.${slot}.label`, opt.label, { shouldDirty: true })
    setValue(`cta.${slot}.href`, opt.href, { shouldDirty: true })
  }

  function clearCta(slot) {
    setValue(`cta.${slot}.label`, '', { shouldDirty: true })
    setValue(`cta.${slot}.href`, '', { shouldDirty: true })
  }

  function toggleSocial(social) {
    const exists = selectedSocials.some(s => s.platform === social.platform)
    if (exists) {
      setValue('socials', selectedSocials.filter(s => s.platform !== social.platform), { shouldDirty: true })
    } else {
      setValue('socials', [...selectedSocials, { platform: social.platform, url: social.url }], { shouldDirty: true })
    }
  }

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        cta: {
          primary: values.cta.primary.href ? values.cta.primary : null,
          secondary: values.cta.secondary.href ? values.cta.secondary : null,
        },
        socials: values.socials.filter(s => validPlatforms.has(s.platform)),
      }
      await updateSection('hero', payload)
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
      <Input label="Greeting Text" {...register('greeting')} placeholder="Hi there! I'm" />

      <Controller name="showProfilePhoto" control={control}
        render={({ field }) => (
          <Toggle label="Show Profile Photo" checked={!!field.value} onChange={field.onChange} />
        )}
      />

      {/* CTA Buttons */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Call-to-Action Buttons</p>
        <p className="text-xs text-text-muted -mt-1">Pick up to 2 buttons to show on your hero section.</p>
        <CtaSlot
          slotLabel="Primary Button"
          hrefValue={primaryHref}
          onPick={(opt) => pickCta('primary', opt)}
          onClear={() => clearCta('primary')}
          options={ctaOptions.filter(o => o.href !== secondaryHref)}
          register={register}
          fieldPrefix="cta.primary"
        />
        <CtaSlot
          slotLabel="Secondary Button"
          hrefValue={secondaryHref}
          onPick={(opt) => pickCta('secondary', opt)}
          onClear={() => clearCta('secondary')}
          options={ctaOptions.filter(o => o.href !== primaryHref)}
          register={register}
          fieldPrefix="cta.secondary"
        />
      </div>

      {/* Socials */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Social Links</p>

        {contactSocials.length === 0 ? (
          <p className="text-xs text-text-muted py-2">
            No socials found. Add them in the <span className="text-primary">Contact</span> section first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {contactSocials.map(social => {
              const isSelected = selectedSocials.some(s => s.platform === social.platform)
              return (
                <button
                  key={social.platform}
                  type="button"
                  onClick={() => toggleSocial(social)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                    isSelected
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-surface-2 border-bg-border text-text-dim hover:border-primary/30 hover:text-text'
                  }`}
                >
                  {social.platform}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}

function CtaSlot({ slotLabel, hrefValue, onPick, onClear, options, register, fieldPrefix }) {
  const isFilled = !!hrefValue

  return (
    <div className="rounded-xl bg-surface-1 p-3 space-y-2.5">
      <p className="text-xs font-medium text-text-muted">{slotLabel}</p>

      {isFilled ? (
        <div className="space-y-2">
          {/* Editable label + href display */}
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              {...register(`${fieldPrefix}.label`)}
              placeholder="Button label"
            />
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-error transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-2">
            <span className="text-xs text-text-muted">→</span>
            <span className="text-xs text-text-muted font-mono truncate">{hrefValue}</span>
          </div>
          {/* Quick-switch options */}
          {options.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <p className="text-xs text-text-muted">Switch to:</p>
              <div className="flex flex-wrap gap-1.5">
                {options.map(opt => (
                  <button key={opt.href} type="button" onClick={() => onPick(opt)}
                    className="px-2 py-1 rounded-md text-xs bg-surface-2 text-text-dim hover:bg-primary/8 hover:text-text transition-colors">
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs text-text-muted">Choose an option:</p>
          {options.length === 0 ? (
            <p className="text-xs text-text-muted italic">Fill in other sections to see options here.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {options.map(opt => (
                <button key={opt.href} type="button" onClick={() => onPick(opt)}
                  className="px-2.5 py-1.5 rounded-lg text-xs bg-surface-2 text-text-dim hover:bg-primary/8 hover:text-text transition-colors">
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
