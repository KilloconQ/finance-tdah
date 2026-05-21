import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Btn } from '@/components'

interface Story {
  label: string
  title: string
  big: string
  body: string
  hint?: string
}

const STORIES: Story[] = [
  {
    label: 'Tu semana en 30s',
    title: 'Empezamos',
    big: '✨',
    body: 'Esto es lo que pasó del 29 abr al 5 may. Cortito.',
    hint: 'tap → siguiente',
  },
  {
    label: 'Lo que más gastaste',
    title: '☕ café',
    big: '14',
    body: '14 cafés esta semana · $910 · más que el delivery 🤯',
    hint: '¿lo dejamos así o le entramos a un reto?',
  },
  {
    label: 'Tu win',
    title: '🔥 5 días',
    big: 'sin delivery',
    body: 'Te ahorraste $620 contra tu promedio semanal.',
  },
  {
    label: 'Ojo',
    title: 'Subs olvidadas',
    big: '$378',
    body: '2 suscripciones sin uso te cobraron este mes. Apple TV+ y Audible.',
  },
  {
    label: 'Plan',
    title: 'Próxima semana',
    big: '🎯',
    body: 'Cancela 1 sub · reto de café en casa · 5 días sin delivery.',
  },
]

export const Route = createFileRoute('/_app/wrapped')({
  component: Wrapped,
})

function Wrapped() {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)
  const story = STORIES[idx]

  const next = () => {
    if (idx < STORIES.length - 1) setIdx(idx + 1)
    else navigate({ to: '/', replace: true })
  }
  const back = () => {
    if (idx > 0) setIdx(idx - 1)
  }

  return (
    <div
      className="mx-auto flex h-full max-w-[420px] flex-col overflow-hidden text-white md:my-4 md:rounded-[36px] md:shadow-sm"
      style={{ background: '#1a1a18' }}
    >
      <div className="flex gap-1 px-3 pt-3">
        {STORIES.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-white"
              style={{ width: i < idx ? '100%' : i === idx ? '60%' : '0%' }}
            />
          </div>
        ))}
      </div>

      <div className="wf-mono flex items-center justify-between px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-white/60">
        <span>
          Tu semana · {idx + 1} / {STORIES.length}
        </span>
        <button
          type="button"
          onClick={() => navigate({ to: '..' })}
          className="wf-tap text-white/60"
        >
          ✕
        </button>
      </div>

      <button
        type="button"
        onClick={next}
        className="flex flex-1 flex-col justify-center px-7 text-left"
      >
        <div className="wf-mono text-[13px] uppercase tracking-[0.1em] text-white/60">
          {story.label}
        </div>
        <div className="mt-3.5 text-[40px] font-medium leading-[1.05] text-white">
          {story.title}
        </div>
        <div className="wf-mono mt-2 text-[60px] font-light leading-none text-white">
          {story.big}
        </div>
        <div className="mt-5 text-[14px] leading-relaxed text-white/85">{story.body}</div>
        {story.hint ? <div className="mt-4 text-[13px] text-white/55">{story.hint}</div> : null}
      </button>

      <div className="wf-mono flex items-center justify-between px-7 pb-5 text-[12px] text-white/50">
        <button
          type="button"
          onClick={back}
          disabled={idx === 0}
          className="wf-tap disabled:opacity-30"
        >
          ‹ atrás
        </button>
        <button type="button" onClick={next} className="wf-tap">
          tap → siguiente
        </button>
      </div>

      {idx === STORIES.length - 1 ? (
        <div className="px-5 pb-5">
          <Btn
            kind="primary"
            className="w-full py-3.5"
            onClick={() => navigate({ to: '/challenge', replace: true })}
          >
            Activar el plan
          </Btn>
        </div>
      ) : null}
    </div>
  )
}
