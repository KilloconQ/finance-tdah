const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** Cents as "$1,234.50" for user-facing error messages. */
export const money = (cents: number) => MXN.format(cents / 100).replace('MX$', '$')
