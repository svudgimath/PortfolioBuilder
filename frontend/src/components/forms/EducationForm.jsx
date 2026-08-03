import { useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Input from '../ui/Input'
import TagsInput from '../ui/TagsInput'
import FileUpload from '../ui/FileUpload'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

const toDesc = (arr) => (arr || []).map(v => ({ value: v }))
const fromDesc = (arr) => (arr || []).map(f => f.value).filter(Boolean)

export default function EducationForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(0)
  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Education',
      sectionTitle: data?.sectionTitle || 'My academic background',
      items: (data?.items || []).map(item => ({ ...item, description: toDesc(item.description) })),
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        items: values.items.map(item => ({ ...item, description: fromDesc(item.description) })),
      }
      await updateSection('education', payload)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Education" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="My academic background" />
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <EducationItem key={f.id} index={i} register={register} control={control}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? -1 : i)}
            onRemove={() => remove(i)}
            errors={errors}
          />
        ))}
        <button type="button"
          onClick={() => { append({ id: crypto.randomUUID(), institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', location: '', grade: '', description: [], tags: [], logo: null }); setExpanded(fields.length) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-bg-border text-text-muted hover:text-text hover:border-primary/30 text-sm transition-colors">
          <Plus size={14} /> Add Education
        </button>
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}

function EducationItem({ index: i, register, control, isExpanded, onToggle, onRemove, errors }) {
  const institution = useWatch({ control, name: `items.${i}.institution` })
  const { fields: bullets, append: addBullet, remove: removeBullet } = useFieldArray({ control, name: `items.${i}.description` })

  return (
    <div className="rounded-xl bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-2 transition-colors duration-150" onClick={onToggle}>
        <span className="flex-1 text-sm text-text-dim font-medium">{institution || `Education #${i + 1}`}</span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-text-muted hover:text-error transition-colors">
          <Trash2 size={13} />
        </button>
        {isExpanded ? <ChevronUp size={14} className="text-text-muted shrink-0" /> : <ChevronDown size={14} className="text-text-muted shrink-0" />}
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-4 space-y-3">
          <Controller
            name={`items.${i}.logo`}
            control={control}
            render={({ field }) => (
              <FileUpload
                label="Institution Logo"
                value={field.value}
                onChange={field.onChange}
                accept="image/*"
              />
            )}
          />

          <div className="grid grid-cols-2 gap-2">
            <Input
              required
              {...register(`items.${i}.institution`, { required: 'Required' })}
              placeholder="Institution"
              error={errors?.items?.[i]?.institution?.message}
            />
            <Input
              required
              {...register(`items.${i}.degree`, { required: 'Required' })}
              placeholder="Degree"
              error={errors?.items?.[i]?.degree?.message}
            />
            <Input {...register(`items.${i}.fieldOfStudy`)} placeholder="Field of Study" />
            <Input {...register(`items.${i}.grade`)} placeholder="Grade / GPA" />
            <Input {...register(`items.${i}.startDate`)} placeholder="Start (e.g. Sep 2016)" />
            <Input {...register(`items.${i}.endDate`)} placeholder="End (e.g. May 2020)" />
            <Input className="col-span-2" {...register(`items.${i}.location`)} placeholder="Location" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted font-medium">Achievements & Notes</p>
              <button type="button" onClick={() => addBullet({ value: '' })}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
                <Plus size={11} /> Add
              </button>
            </div>
            {bullets.map((bf, bi) => (
              <div key={bf.id} className="flex gap-2 items-center">
                <Input {...register(`items.${i}.description.${bi}.value`)} placeholder="Note or achievement…" />
                <button type="button" onClick={() => removeBullet(bi)} className="text-text-muted hover:text-error shrink-0 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <Controller name={`items.${i}.tags`} control={control}
            render={({ field }) => (
              <TagsInput label="Tags" description="Type and hit Enter" value={field.value || []} onChange={field.onChange} placeholder="Subjects or topics…" />
            )}
          />
        </div>
      )}
    </div>
  )
}
