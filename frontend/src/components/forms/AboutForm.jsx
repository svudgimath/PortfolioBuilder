import { useState } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import TagsInput from '../ui/TagsInput'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

export default function AboutForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'About Me',
      sectionTitle: data?.sectionTitle || 'A little about who I am',
      description: (data?.description || []).map(v => ({ value: v })),
      whatIDo: data?.whatIDo || [],
      highlights: data?.highlights || [],
      interests: data?.interests || [],
    }
  })

  const { fields: descFields, append: addDesc, remove: removeDesc } = useFieldArray({ control, name: 'description' })
  const { fields: whatFields, append: addWhat, remove: removeWhat } = useFieldArray({ control, name: 'whatIDo' })
  const { fields: hlFields, append: addHl, remove: removeHl } = useFieldArray({ control, name: 'highlights' })

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        description: values.description.map(f => f.value).filter(Boolean),
      }
      await updateSection('about', payload)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="About Me" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="A little about who I am" />
      </div>

      {/* Bio paragraphs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Bio Paragraphs</p>
          <button type="button" onClick={() => addDesc({ value: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
        {descFields.map((f, i) => (
          <div key={f.id} className="flex gap-2">
            <div className="flex-1">
              <Textarea rows={2} {...register(`description.${i}.value`)} placeholder="Write a paragraph about yourself…" />
            </div>
            <button type="button" onClick={() => removeDesc(i)} className="text-text-muted hover:text-error self-start mt-3 shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {descFields.length === 0 && <p className="text-xs text-text-muted">No paragraphs yet.</p>}
      </div>

      {/* What I Do */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">What I Do</p>
          <button type="button" onClick={() => addWhat({ heading: '', brief: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
        {whatFields.map((f, i) => (
          <div key={f.id} className="p-3 rounded-xl bg-surface-1 space-y-2">
            <div className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input required {...register(`whatIDo.${i}.heading`, { required: 'Required' })} placeholder="e.g. Backend Development" />
                <Input required {...register(`whatIDo.${i}.brief`, { required: 'Required' })} placeholder="Brief description" />
              </div>
              <button type="button" onClick={() => removeWhat(i)} className="text-text-muted hover:text-error mt-3 shrink-0 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {whatFields.length === 0 && <p className="text-xs text-text-muted">No items yet.</p>}
      </div>

      {/* Highlights */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Highlights</p>
          <button type="button" onClick={() => addHl({ name: '', quant: '' })}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
        {hlFields.map((f, i) => (
          <div key={f.id} className="flex gap-2 items-center">
            <Input required className="flex-1" {...register(`highlights.${i}.name`, { required: 'Required' })} placeholder="e.g. Years of Experience" />
            <Input required className="w-28" {...register(`highlights.${i}.quant`, { required: 'Required' })} placeholder="e.g. 5+" />
            <button type="button" onClick={() => removeHl(i)} className="text-text-muted hover:text-error shrink-0 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {hlFields.length === 0 && <p className="text-xs text-text-muted">No highlights yet.</p>}
      </div>

      {/* Interests */}
      <Controller name="interests" control={control}
        render={({ field }) => (
          <TagsInput label="Interests" value={field.value || []} onChange={field.onChange} placeholder="Add an interest, press Enter" />
        )}
      />

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}
