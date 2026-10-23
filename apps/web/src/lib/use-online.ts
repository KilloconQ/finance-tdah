import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Live `navigator.onLine`. Mutations pause while offline (TanStack `networkMode: 'online'`), so a pending one is "waiting". */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}

/** Label for a submit button: says it is waiting for the network instead of looking stuck on "Guardando…". */
export function useSavingLabel(): string {
  return useOnline() ? 'Guardando…' : 'Esperando conexión…'
}
