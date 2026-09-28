import { z } from 'zod'
import { queryOptions } from '@tanstack/react-query'
import { envelopeSchema } from '@finance-tdah/shared/schemas'
import { fetchValidated } from '@/lib/api'

export const envelopesQueryOptions = () =>
  queryOptions({
    queryKey: ['envelopes'],
    queryFn: () =>
      fetchValidated('/envelopes', z.object({ envelopes: z.array(envelopeSchema) })).then((r) => r.envelopes),
  })
