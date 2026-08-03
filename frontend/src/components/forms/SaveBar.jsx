import { Check, AlertCircle } from 'lucide-react'

export default function SaveBar({ status, isSubmitting }) {
  return (
    <div className="flex items-center justify-between pt-4 mt-1">
      <div className="text-sm h-5">
        {status === 'saved' && (
          <span className="flex items-center gap-1.5 text-success">
            <Check size={13} /> Saved
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1.5 text-error">
            <AlertCircle size={13} /> Save failed — try again
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="btn-fill text-sm px-5 py-2 rounded-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
