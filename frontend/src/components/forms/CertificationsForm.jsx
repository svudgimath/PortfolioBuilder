import { useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import TagsInput from '../ui/TagsInput'
import FileUpload from '../ui/FileUpload'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

export default function CertificationsForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(0)
  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Certifications & Achievements',
      sectionTitle: data?.sectionTitle || 'Credentials and recognition',
      items: data?.items || [],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (values) => {
    try {
      await updateSection('certifications', values)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Certifications & Achievements" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="Credentials and recognition" />
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <CertItem key={f.id} index={i} register={register} control={control}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? -1 : i)}
            onRemove={() => remove(i)}
            errors={errors}
          />
        ))}
        <button type="button"
          onClick={() => { append({ id: crypto.randomUUID(), name: '', description: '', issuer: '', dateIssued: '', expiryDate: '', credentialUrl: '', tags: [], thumbnail: null }); setExpanded(fields.length) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-bg-border text-text-muted hover:text-text hover:border-primary/30 text-sm transition-colors">
          <Plus size={14} /> Add Certification
        </button>
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}

function CertItem({ index: i, register, control, isExpanded, onToggle, onRemove, errors }) {
  const name = useWatch({ control, name: `items.${i}.name` })

  return (
    <div className="rounded-xl bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-2 transition-colors duration-150" onClick={onToggle}>
        <span className="flex-1 text-sm text-text-dim font-medium">{name || `Certification #${i + 1}`}</span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-text-muted hover:text-error transition-colors">
          <Trash2 size={13} />
        </button>
        {isExpanded ? <ChevronUp size={14} className="text-text-muted shrink-0" /> : <ChevronDown size={14} className="text-text-muted shrink-0" />}
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-4 space-y-3">
          <Controller
            name={`items.${i}.thumbnail`}
            control={control}
            render={({ field }) => (
              <FileUpload
                label="Certification Badge / Thumbnail"
                value={field.value}
                onChange={field.onChange}
                accept="image/*"
              />
            )}
          />

          <Input
            required
            {...register(`items.${i}.name`, { required: 'Required' })}
            placeholder="Certification Name"
            error={errors?.items?.[i]?.name?.message}
          />
          <Textarea rows={2} {...register(`items.${i}.description`)} placeholder="What this credential validates…" />
          <div className="grid grid-cols-2 gap-2">
            <Input
              required
              {...register(`items.${i}.issuer`, { required: 'Required' })}
              placeholder="Issuer (e.g. AWS)"
              error={errors?.items?.[i]?.issuer?.message}
            />
            <Input {...register(`items.${i}.dateIssued`)} placeholder="Date Issued (e.g. Mar 2023)" />
            <Input {...register(`items.${i}.expiryDate`)} placeholder="Expiry Date (optional)" />
            <Input {...register(`items.${i}.credentialUrl`)} placeholder="Credential URL" />
          </div>
          <Controller name={`items.${i}.tags`} control={control}
            render={({ field }) => (
              <TagsInput label="Tags" description="Type and hit Enter" value={field.value || []} onChange={field.onChange} placeholder="Related topics…" />
            )}
          />
        </div>
      )}
    </div>
  )
}
