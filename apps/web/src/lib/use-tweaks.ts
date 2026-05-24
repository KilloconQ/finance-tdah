import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UpdateProfileInput, UserProfileDTO } from '@finance-tdah/shared/schemas'
import { mutations, profileQuery } from './queries'

const DEFAULTS = {
  showBalances: true,
  density: 'simple' as const,
}

export function useTweaks() {
  const { data: profile } = useQuery(profileQuery())
  return {
    showBalances: profile?.showBalances ?? DEFAULTS.showBalances,
    density: profile?.densityMode ?? DEFAULTS.density,
  }
}

export function useSetTweak() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: UpdateProfileInput) => mutations.updateProfile(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['profile'] })
      const previous = queryClient.getQueryData<UserProfileDTO | null>(['profile'])
      if (previous) {
        queryClient.setQueryData<UserProfileDTO>(['profile'], { ...previous, ...patch })
      }
      return { previous }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(['profile'], ctx.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}
