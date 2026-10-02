/**
 * Daily "¿gastaste algo hoy?" reminder: what day and hour it is for the user,
 * and whether today's reminder is due. The API's scheduler runs this every few
 * minutes; the user's own time zone decides what "today" and "9 pm" mean.
 */

export const DEFAULT_TIME_ZONE = 'America/Mexico_City'

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

export interface LocalClock {
  /** YYYY-MM-DD in the user's time zone. */
  date: string
  /** 0–23 in the user's time zone. */
  hour: number
}

export function localClock(now: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour: Number(get('hour')) }
}

/**
 * Due from the chosen hour until the end of the user's day, once per day: a
 * scheduler that was down at 9 pm still sends it at 10, never the next day.
 */
export function dailyReminderDue(clock: LocalClock, reminderHour: number, lastHandledOn: string | null): boolean {
  return clock.hour >= reminderHour && (lastHandledOn === null || lastHandledOn < clock.date)
}
