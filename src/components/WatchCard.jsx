import React, { useState } from 'react';
import { BookOpen, CheckCircle2, ChevronDown, Loader2, Send, Unplug, Watch } from 'lucide-react';
import { Button, Card, cx } from './ui';
import { testConnection } from '../lib/intervals';
import { usePersistentState } from '../lib/storage';
import IntervalsGuide, { BRANDS, BrandTabs, NumberedList } from './IntervalsGuide';

const TROUBLESHOOTING = [
  'Seules les séances des 7 prochains jours sont transmises à la montre : les suivantes arrivent au fil des semaines.',
  'Rien n’apparaît ? Dans Intervals.icu, décochez puis recochez « Upload planned workouts », puis resynchronisez la montre.',
  'Cibles cardiaques décalées ? Indiquez dans Intervals.icu la même FC max que dans votre profil TrailCoach.',
  'Sorties manquantes ? Celles qui arrivent par Strava ne peuvent pas être transmises : reliez directement la marque de la montre.',
];

export default function WatchCard({ intervals, setIntervals, onSendPlan }) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState({ state: 'idle' }); // idle | loading | error
  const [sending, setSending] = useState(null);
  const [brand, setBrand] = usePersistentState('watchBrand', 'suunto');
  const [guideOpen, setGuideOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const b = BRANDS[brand] || BRANDS.suunto;

  const connect = async () => {
    setStatus({ state: 'loading' });
    try {
      const athlete = await testConnection(key);
      setIntervals({ apiKey: key.trim(), athleteName: athlete.name, connectedAt: Date.now() });
      setKey('');
      setStatus({ state: 'idle' });
      setGuideOpen(false);
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

  const guide = (
    <IntervalsGuide
      brand={brand}
      setBrand={setBrand}
      connected={!!intervals}
      apiKey={key}
      setApiKey={(v) => { setKey(v); setStatus({ state: 'idle' }); }}
      status={status}
      onConnect={connect}
      onClose={intervals ? () => setGuideOpen(false) : undefined}
    />
  );

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
            Envoyez une semaine depuis « Mon Programme », ou tout le programme à venir d'un coup. Les séances arrivent dans votre calendrier Intervals.icu, puis sur la montre à sa prochaine synchronisation.
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

          <div className="rounded-2xl border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Lancer une séance sur la montre</div>
              <BrandTabs brand={brand} setBrand={setBrand} />
            </div>
            <div className="mt-3"><NumberedList items={b.use} /></div>
            {b.note && <p className="mt-3 text-xs leading-relaxed text-muted">{b.note} Les menus peuvent varier légèrement selon le modèle.</p>}
          </div>

          <div>
            <button type="button" onClick={() => setHelpOpen(!helpOpen)} aria-expanded={helpOpen} className="inline-flex items-center gap-1.5 text-xs font-bold text-muted hover:text-ink">
              Un problème ? Les 4 points à vérifier <ChevronDown className={cx('h-3.5 w-3.5 transition', helpOpen && 'rotate-180')} />
            </button>
            {helpOpen && (
              <ul className="rise mt-2 space-y-1.5 text-sm text-muted">
                {TROUBLESHOOTING.map((t) => <li key={t} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />{t}</li>)}
              </ul>
            )}
          </div>

          {guideOpen
            ? guide
            : <Button variant="ghost" size="sm" onClick={() => setGuideOpen(true)}><BookOpen className="h-4 w-4" /> Revoir le guide de connexion</Button>}
        </div>
      ) : (
        <div className="mt-5">{guide}</div>
      )}
    </Card>
  );
}
