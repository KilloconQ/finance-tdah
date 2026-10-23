import { useOnline } from '@/lib/use-online'

export function OfflineBanner() {
  if (useOnline()) return null
  return (
    <div role="status" className="bg-danger-bg px-4 py-2 text-center text-sm text-danger">
      Sin conexión. Tus cambios se guardarán cuando vuelvas a conectarte.
    </div>
  )
}
