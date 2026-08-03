import { useState, useRef, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut } from 'lucide-react'
import AuthContext from '../../auth/AuthContext'

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function UserMenu() {
  const { user, logoutUser } = useContext(AuthContext)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    function handleEsc(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  function handleLogout() {
    setOpen(false)
    logoutUser()
    navigate('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={user?.name}
        className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-xs font-bold select-none"
        style={{ color: 'var(--color-bg)' }}
      >
        {getInitials(user?.name)}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-2 z-50 rounded-xl overflow-hidden"
            style={{
              width: 220,
              background: 'var(--color-bg-surface)',
              border: '1px solid var(--color-bg-border-strong)',
              boxShadow: 'var(--shadow-raise-lg)',
            }}
          >
            <div className="px-3.5 py-3 border-b border-bg-border">
              <p className="text-sm font-medium text-text truncate">{user?.name ?? 'User'}</p>
              <p className="text-xs text-text-muted truncate">{user?.email ?? ''}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-text-dim hover:text-text hover:bg-surface-3 transition-colors"
            >
              <LogOut size={14} />
              Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
