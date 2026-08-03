import { useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import TagsInput from '../ui/TagsInput'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

const toAuthors = (arr) => (arr || []).map(v => ({ value: v }))
const fromAuthors = (arr) => (arr || []).map(f => f.value).filter(Boolean)

export default function ResearchForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const [expanded, setExpanded] = useState(0)
  const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Research & Publications',
      sectionTitle: data?.sectionTitle || 'My contributions to the field',
      items: (data?.items || []).map(item => ({ ...item, authors: toAuthors(item.authors) })),
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (values) => {
    try {
      const payload = {
        ...values,
        items: values.items.map(item => ({ ...item, authors: fromAuthors(item.authors) })),
      }
      await updateSection('research', payload)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Research & Publications" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="My contributions to the field" />
      </div>

      <div className="space-y-2">
        {fields.map((f, i) => (
          <ResearchItem key={f.id} index={i} register={register} control={control}
            isExpanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? -1 : i)}
            onRemove={() => remove(i)}
            errors={errors}
          />
        ))}
        <button type="button"
          onClick={() => { append({ id: crypto.randomUUID(), title: '', authors: [], publishedIn: '', date: '', description: '', tags: [], url: '', doi: '' }); setExpanded(fields.length) }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-bg-border text-text-muted hover:text-text hover:border-primary/30 text-sm transition-colors">
          <Plus size={14} /> Add Publication
        </button>
      </div>

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}

function ResearchItem({ index: i, register, control, isExpanded, onToggle, onRemove, errors }) {
  const title = useWatch({ control, name: `items.${i}.title` })
  const { fields: authorFields, append: addAuthor, remove: removeAuthor } = useFieldArray({ control, name: `items.${i}.authors` })

  return (
    <div className="rounded-xl bg-surface-1 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none hover:bg-surface-2 transition-colors duration-150" onClick={onToggle}>
        <span className="flex-1 text-sm text-text-dim font-medium">{title || `Publication #${i + 1}`}</span>
        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }} className="text-text-muted hover:text-error transition-colors">
          <Trash2 size={13} />
        </button>
        {isExpanded ? <ChevronUp size={14} className="text-text-muted shrink-0" /> : <ChevronDown size={14} className="text-text-muted shrink-0" />}
      </div>
      {isExpanded && (
        <div className="px-3 pb-3 pt-4 space-y-3">
          <Input required {...register(`items.${i}.title`, { required: 'Required' })} placeholder="Publication Title" error={errors?.items?.[i]?.title?.message} />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-text-muted font-medium">Authors</p>
              <button type="button" onClick={() => addAuthor({ value: '' })}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
                <Plus size={11} /> Add
              </button>
            </div>
            {authorFields.map((af, ai) => (
              <div key={af.id} className="flex gap-2 items-center">
                <Input {...register(`items.${i}.authors.${ai}.value`)} placeholder="Author name" />
                <button type="button" onClick={() => removeAuthor(ai)} className="text-text-muted hover:text-error shrink-0 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input {...register(`items.${i}.publishedIn`)} placeholder="Journal / Conference" />
            <Input {...register(`items.${i}.date`)} placeholder="Date (e.g. Jun 2023)" />
            <Input {...register(`items.${i}.doi`)} placeholder="DOI" />
            <Input {...register(`items.${i}.url`)} placeholder="URL" />
          </div>
          <Textarea rows={2} {...register(`items.${i}.description`)} placeholder="Brief description of the research…" />
          <Controller name={`items.${i}.tags`} control={control}
            render={({ field }) => (
              <TagsInput label="Tags" description="Type and hit Enter" value={field.value || []} onChange={field.onChange} placeholder="Research topics…" />
            )}
          />
        </div>
      )}
    </div>
  )
}
