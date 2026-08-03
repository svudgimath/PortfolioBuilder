import { useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import FileUpload from '../ui/FileUpload'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

export default function TestimonialsForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(0)
  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Testimonials',
      sectionTitle: data?.sectionTitle || 'What people say about me',
      items: data?.items || [],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (values) => {
    try {
      await updateSection('testimonials', values)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Testimonials" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="What people say about me" />
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <TestimonialItem key={f.id} index={i} register={register} control={control}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? -1 : i)}
            onRemove={() => remove(i)}
            errors={errors}
          />
        ))}
        <button type="button"
          onClick={() => { append({ id: crypto.randomUUID(), name: '', role: '', company: '', message: '', linkedinUrl: '', avatar: null }); setExpanded(fields.length) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-bg-border text-text-muted hover:text-text hover:border-primary/30 text-sm transition-colors">
          <Plus size={14} /> Add Testimonial
        </button>
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}

function TestimonialItem({ index: i, register, control, isExpanded, onToggle, onRemove, errors }) {
  const name = useWatch({ control, name: `items.${i}.name` })

  return (
    <div className="rounded-xl bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-2 transition-colors duration-150" onClick={onToggle}>
        <span className="flex-1 text-sm text-text-dim font-medium">{name || `Testimonial #${i + 1}`}</span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-text-muted hover:text-error transition-colors">
          <Trash2 size={13} />
        </button>
        {isExpanded ? <ChevronUp size={14} className="text-text-muted shrink-0" /> : <ChevronDown size={14} className="text-text-muted shrink-0" />}
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-4 space-y-3">
          <Controller
            name={`items.${i}.avatar`}
            control={control}
            render={({ field }) => (
              <FileUpload
                label="Avatar / Photo"
                value={field.value}
                onChange={field.onChange}
                accept="image/*"
              />
            )}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              required
              {...register(`items.${i}.name`, { required: 'Required' })}
              placeholder="Name"
              error={errors?.items?.[i]?.name?.message}
            />
            <Input {...register(`items.${i}.role`)} placeholder="Role / Title" />
            <Input {...register(`items.${i}.company`)} placeholder="Company" />
            <Input {...register(`items.${i}.linkedinUrl`)} placeholder="LinkedIn URL" />
          </div>
          <Textarea
            required
            rows={3}
            {...register(`items.${i}.message`, { required: 'Required' })}
            placeholder="Their testimonial message…"
            error={errors?.items?.[i]?.message?.message}
          />
        </div>
      )}
    </div>
  )
}
