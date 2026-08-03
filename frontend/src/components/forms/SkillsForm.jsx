import { useState } from 'react'
import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form'
import { Plus, Trash2 } from 'lucide-react'
import Input from '../ui/Input'
import Toggle from '../ui/Toggle'
import TagsInput from '../ui/TagsInput'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

// Merge all item tags into a single flat list for uncategorized mode
function flattenTags(items) {
  return items.flatMap(item => item.tags || [])
}

export default function SkillsForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)

  const allTags = flattenTags(data?.items || [])

  const { register, control, handleSubmit, setValue, getValues, formState: { isSubmitting } } = useForm({
    defaultValues: {
      sectionLabel: data?.sectionLabel || 'Skills',
      sectionTitle: data?.sectionTitle || 'What I bring to the table',
      categorized: data?.categorized ?? true,
      items: data?.items || [],
      // flat list used only when categorized is off
      flatTags: data?.categorized === false ? allTags : [],
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const categorized = useWatch({ control, name: 'categorized' })
  const flatTags = useWatch({ control, name: 'flatTags' })

  function handleToggleCategorized(enabled) {
    if (!enabled) {
      // Switching OFF: flatten all category tags into flatTags
      const merged = flattenTags(getValues('items'))
      setValue('flatTags', merged, { shouldDirty: true })
    } else {
      // Switching ON: restore any existing items (categories preserved), clear flatTags
      // If there were no categorized items, seed one empty category
      if (getValues('items').length === 0) {
        setValue('items', [{ id: crypto.randomUUID(), category: '', tags: [] }])
      }
      setValue('flatTags', [], { shouldDirty: true })
    }
    setValue('categorized', enabled, { shouldDirty: true })
  }

  const onSubmit = async (values) => {
    try {
      let payload
      if (values.categorized) {
        payload = { ...values, flatTags: undefined }
      } else {
        // Save as a single uncategorized group; strip stale category names
        payload = {
          ...values,
          items: [{ id: 'uncategorized', category: '', tags: values.flatTags || [] }],
          flatTags: undefined,
        }
      }
      await updateSection('skills', payload)
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
        <Input label="Section Label" {...register('sectionLabel')} placeholder="Skills" />
        <Input label="Section Title" {...register('sectionTitle')} placeholder="What I bring to the table" />
      </div>

      <Controller name="categorized" control={control}
        render={({ field }) => (
          <Toggle
            label="Group by Category"
            description="Show skills grouped under category headings"
            checked={!!field.value}
            onChange={handleToggleCategorized}
          />
        )}
      />

      {categorized ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Skill Categories</p>
            <button type="button"
              onClick={() => append({ id: crypto.randomUUID(), category: '', tags: [] })}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors">
              <Plus size={12} /> Add Category
            </button>
          </div>
          {fields.map((f, i) => (
            <div key={f.id} className="p-3 rounded-xl bg-surface-1 space-y-3">
              <div className="flex gap-2 items-center">
                <Input required className="flex-1" {...register(`items.${i}.category`, { required: 'Required' })} placeholder="Category (e.g. Frontend)" />
                <button type="button" onClick={() => remove(i)} className="text-text-muted hover:text-error shrink-0 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
              <Controller name={`items.${i}.tags`} control={control}
                render={({ field }) => (
                  <TagsInput label="Tags" description="Type and hit Enter" value={field.value || []} onChange={field.onChange} placeholder="Add skill" />
                )}
              />
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-xs text-text-muted">No categories yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">Skills</p>
          <Controller name="flatTags" control={control}
            render={({ field }) => (
              <TagsInput label="" description="Type and hit Enter" value={field.value || []} onChange={field.onChange} placeholder="Add skill" />
            )}
          />
        </div>
      )}

      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}
