import { useState, useContext } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'
import AuthContext from '../../auth/AuthContext'

const SOCIAL_PLATFORMS = [
  // Social
  'GitHub',
  'LinkedIn',
  'Twitter',
  'Instagram',
  'YouTube',
  'Facebook',
  'Discord',
  'Telegram',
  'Reddit',
  'WhatsApp',
  // Creative
  'Dribbble',
  'Behance',
  // Writing
  'Medium',
  'Dev.to',
  'Hashnode',
  'Stack Overflow',
  // Coding
  'LeetCode',
  'HackerRank',
  'CodeForces',
  'CodeChef',
  'AtCoder',
  'HackerEarth',
  'GeeksforGeeks',
  'TopCoder',
  'Kaggle',
  'Exercism',
]

export default function ContactForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const { user } = useContext(AuthContext)
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Get In Touch',
      heading: data?.heading || "Let's build something great together.",
      tagline: data?.tagline || "I'm open to new opportunities.",
      email: data?.email || user?.email || '',
      phone: data?.phone || '',
      socials: data?.socials || [],
    }
  })

  const { fields: socials, append: addSocial, remove: removeSocial } = useFieldArray({ control, name: 'socials' })

  const onSubmit = async (values) => {
    try {
      await updateSection('contact', values)
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
      <div className="grid grid-cols-2 gap-3">
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Get In Touch" />
        <Input label="Email" type="email" {...register('email')} placeholder="you@email.com" />
      </div>
      <Input label="Heading" {...register('heading')} placeholder="Let's build something great together." />
      <Input label="Tagline" {...register('tagline')} placeholder="I'm open to new opportunities." />
      <Input label="Phone" {...register('phone')} placeholder="+1 415 234 5678" />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Social Links</p>
          <button type="button" onClick={() => addSocial({ platform: SOCIAL_PLATFORMS[0], url: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
        {socials.map((field, i) => (
          <div key={field.id} className="flex gap-2 items-center">
            <Controller
              name={`socials.${i}.platform`}
              control={control}
              render={({ field: f }) => (
                <Select
                  value={f.value}
                  onChange={f.onChange}
                  options={SOCIAL_PLATFORMS}
                  className="w-40 shrink-0"
                />
              )}
            />
            <Input {...register(`socials.${i}.url`)} placeholder="Profile URL" />
            <button type="button" onClick={() => removeSocial(i)} className="text-text-muted hover:text-error shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {socials.length === 0 && <p className="text-xs text-text-muted">No social links yet.</p>}
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}
