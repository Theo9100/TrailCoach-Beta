import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, Send, Unplug, Watch } from 'lucide-react';
import { Button, Card, Field, cx, inputClass } from './ui';
import { testConnection } from '../lib/intervals';

const STEPS = [
  { title: 'Créez un compte gratuit sur Intervals.icu', link: 'https://intervals.icu' },
  { title: 'Reliez votre montre', detail: 'Dans Intervals.icu : Settings → Connections. Connectez Suunto, Garmin ou Coros et activez l’envoi des séances planifiées (« Upload planned workouts »).' },
  { title: 'Copiez votre clé API', detail: 'Dans Intervals.icu : Settings → Developer Settings → API Key.' },
  { title: 'Collez-la ci-dessous', detail: 'Elle reste enregistrée uniquement dans ce navigateur.' },
];

export default function WatchCard({ intervals, setIntervals, onSendPlan }) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState({ state: 'idle' }); // idle | loading | error | success
  const [sending, setSending] = useState(null);

  const connect = async () => {
    setStatus({ state: 'loading' });
    try {
      const athlete = await testConnection(key);
      setIntervals({ apiKey: key.trim(), athleteName: athlete.name, connectedAt: Date.now() });
      setKey('');
      setStatus({ state: 'idle' });
    } catch (e) {
      setStatus({ state: 'error', message: e.message });
    }
  };

  const sendAll = async () => {
    setSending({ state: 'loading', message: 'Préparation…' });
    try {
      const r = await onSendPlan((message) => setSending({ state: 'loading', message }));
      setSending({ state: 'success', message: `${r.sent} séances envoyées. Elles apparaîtront sur la montre après la prochaine synchronisation.` });
    } catch (e) {
      setSending({ state: 'error', message: e.message });
    }
  };

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Watch className="h-5 w-5" /></div>
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Montre connectée</h3>
          <p className="text-sm font-semibold">Suunto, Garmin, Coros… via Intervals.icu</p>
        </div>
      </div>

      {intervals ? (
        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sunken/40 p-4">
            <div className="flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 className="h-5 w-5" style={{ color: 'var(--type-ef)' }} />
              Connecté à Intervals.icu{intervals.athleteName ? ` · ${intervals.athleteName}` : ''}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIntervals(null)}><Unplug className="h-4 w-4" /> Déconnecter</Button>
          </div>
          <p className="text-sm text-muted">
            Envoyez une semaine depuis « Mon Programme », ou tout le programme à venir d'un coup. Les séances arrivent dans votre calendrier Intervals.icu, puis sur la montre à sa prochaine synchronisation. Pour les cibles cardiaques, indiquez dans Intervals.icu la même FC max que dans votre profil.
          </p>
          <Button onClick={sendAll} disabled={sending?.state === 'loading'}>
            {sending?.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Envoyer tout le programme à venir
          </Button>
          {sending && sending.state !== 'idle' && (
            <p className={cx('text-sm font-semibold', sending.state === 'loading' && 'text-muted')} style={sending.state === 'error' ? { color: 'var(--type-vma)' } : sending.state === 'success' ? { color: 'var(--type-ef)' } : undefined}>
              {sending.message}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sunken text-xs font-black">{i + 1}</span>
                <div className="text-sm">
                  <div className="font-bold">
                    {s.link ? (
                      <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-accent/50 underline-offset-2 hover:text-accent">
                        {s.title} <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : s.title}
                  </div>
                  {s.detail && <div className="text-muted">{s.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
          <form onSubmit={(e) => { e.preventDefault(); if (key.trim()) connect(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Clé API Intervals.icu">
                <input
                  type="password"
                  autoComplete="off"
                  className={inputClass}
                  value={key}
                  onChange={(e) => { setKey(e.target.value); setStatus({ state: 'idle' }); }}
                  placeholder="Collez votre clé ici"
                />
              </Field>
            </div>
            <Button type="submit" disabled={!key.trim() || status.state === 'loading'}>
              {status.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connecter
            </Button>
          </form>
          {status.state === 'error' && <p className="text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{status.message}</p>}
        </div>
      )}
    </Card>
  );
}
