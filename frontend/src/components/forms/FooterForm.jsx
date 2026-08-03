import { useState } from 'react'
import { useForm } from 'react-hook-form'
import Input from '../ui/Input'
import SaveBar from './SaveBar'
import { updateSection } from '../../api/portfolio'

export default function FooterForm({ data, onSaved }) {
  const [status, setStatus] = useState(null)
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: data || {}
  })

  const onSubmit = async (values) => {
    try {
      await updateSection('footer', values)
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
      <Input
        label="Custom Note"
        {...register('customNote')}
        placeholder="e.g. Built with Dzigned"
      />
      <SaveBar status={status} isSubmitting={isSubmitting} />
    </form>
  )
}
