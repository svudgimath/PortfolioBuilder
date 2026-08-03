import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="h-screen overflow-hidden app-shell relative">
      {/* Content sits above the gradient + noise pseudo-element layers */}
      <div className="relative h-full z-10">
        <Outlet />
      </div>
    </div>
  )
}
