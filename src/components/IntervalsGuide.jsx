import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, KeyRound, Loader2, Lock, MousePointer2, Watch } from 'lucide-react';
import { Button, Field, cx, inputClass } from './ui';

/**
 * Guide pas à pas pour relier TrailCoach, Intervals.icu et la montre.
 * Chaque étape a une petite illustration animée (maquette de l'écran à trouver).
 */

export const BRANDS = {
  suunto: {
    label: 'Suunto',
    connect: [
      'Dans Intervals.icu, ouvrez « Settings » et descendez jusqu’au bloc « Suunto ».',
      'Cliquez sur « Connect », puis autorisez l’accès sur la page Suunto qui s’ouvre.',
      'De retour dans Intervals.icu, cochez « Upload planned workouts » dans le bloc Suunto.',
    ],
    use: [
      'Ouvrez l’app Suunto sur votre téléphone : la montre se synchronise.',
      'Sur la montre, choisissez votre mode sportif (Trail, Course…) et, avant de démarrer, descendez dans les options.',
      'Ouvrez « SuuntoPlus », sélectionnez la séance TrailCoach, puis lancez l’exercice : la montre annonce chaque étape.',
    ],
    note: 'Les séances arrivent sous forme de « guides SuuntoPlus ». Elles n’apparaissent pas dans le calendrier de l’app Suunto : c’est normal.',
  },
  garmin: {
    label: 'Garmin',
    connect: [
      'Dans Intervals.icu, ouvrez « Settings » et descendez jusqu’au bloc « Garmin ».',
      'Cliquez sur « Connect », puis autorisez l’accès sur la page Garmin Connect (laissez toutes les cases cochées).',
      'De retour dans Intervals.icu, cochez « Upload planned workouts » dans le bloc Garmin.',
    ],
    use: [
      'Synchronisez la montre avec l’app Garmin Connect.',
      'Les séances apparaissent dans le calendrier Garmin Connect, au jour prévu.',
      'Sur la montre, lancez une activité Course ou Trail : la séance du jour est proposée. Sinon, passez par Entraînement → Entraînements.',
    ],
    note: 'Si vous modifiez le programme, renvoyez la semaine : Garmin Connect se met à jour tout seul.',
  },
  coros: {
    label: 'Coros',
    connect: [
      'Dans Intervals.icu, ouvrez « Settings » et descendez jusqu’au bloc « Coros ».',
      'Cliquez sur « Connect », puis autorisez l’accès avec votre compte Coros.',
      'De retour dans Intervals.icu, cochez « Upload planned workouts » dans le bloc Coros.',
    ],
    use: [
      'Synchronisez la montre avec l’app Coros.',
      'Les séances arrivent dans le calendrier d’entraînement de l’app Coros.',
      'Sur la montre, lancez le mode Course ou Trail, puis choisissez la séance du jour dans les entraînements.',
    ],
    note: 'Si rien n’apparaît après quelques minutes, décochez puis recochez « Upload planned workouts ».',
  },
  other: {
    label: 'Autre',
    connect: [
      'Wahoo : même principe, dans le bloc « Wahoo » de la page « Settings ».',
      'Polar : reliez votre compte pour récupérer vos sorties. Polar n’accepte pas l’envoi de séances depuis Intervals.icu.',
      'Autre marque : si elle n’apparaît pas dans « Settings », l’envoi automatique n’est pas possible.',
    ],
    use: [
      'Ouvrez la séance dans « Mon Programme », puis « Voir le détail ».',
      'Le bouton « Version montre » affiche les étapes, durées et cibles à saisir dans l’app de votre montre.',
      'Vos sorties peuvent toujours être ajoutées en important leur fichier GPX dans « Mes Séances & GPX ».',
    ],
    note: 'Même sans envoi automatique, la connexion à Intervals.icu permet de récupérer vos sorties.',
  },
};

const STEPS = ['Le principe', 'Le compte', 'La montre', 'La clé', 'La connexion'];

/* ------------------------------ illustrations ------------------------------ */

function Cursor({ className }) {
  return <MousePointer2 className={cx('guide-cursor absolute h-5 w-5 fill-ink text-surface drop-shadow', className)} strokeWidth={1.5} />;
}

function Browser({ url, children }) {
  return (
    <div className="mx-auto w-full max-w-[19rem] overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-line bg-sunken/70 px-2.5 py-1.5">
        <span className="h-2 w-2 rounded-full bg-[#e0685a]" /><span className="h-2 w-2 rounded-full bg-[#e0b04a]" /><span className="h-2 w-2 rounded-full bg-[#62b56f]" />
        <span className="ml-2 flex-1 truncate rounded-md bg-surface px-2 py-0.5 font-mono text-[9px] text-muted">{url}</span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/** Étape 1 : les séances partent vers la montre, les sorties reviennent. */
function FlowArt() {
  const node = (x, label, icon) => (
    <g transform={`translate(${x} 78)`}>
      <circle r="27" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.5" />
      {icon}
      <text y="48" textAnchor="middle" className="fill-ink text-[10px] font-bold">{label}</text>
    </g>
  );
  const dots = (path, color, count, dur) => Array.from({ length: count }, (_, i) => (
    <circle key={i} r="3.4" fill={color}>
      <animateMotion dur={`${dur}s`} begin={`${(-i * dur) / count}s`} repeatCount="indefinite" path={path} />
    </circle>
  ));
  const out = 'M78 66 C100 44 118 44 134 62 M186 62 C204 44 222 44 244 66';
  const back = 'M244 92 C222 114 204 114 186 96 M134 96 C118 114 100 114 78 92';
  return (
    <svg viewBox="0 0 320 168" className="guide-anim mx-auto w-full max-w-sm" role="img" aria-label="Les séances vont de TrailCoach vers la montre en passant par Intervals.icu, et les sorties font le chemin inverse">
      <path d={out} fill="none" stroke="rgb(var(--accent-rgb) / 0.35)" strokeWidth="1.5" strokeDasharray="3 5" />
      <path d={back} fill="none" stroke="rgb(var(--moss-rgb) / 0.45)" strokeWidth="1.5" strokeDasharray="3 5" />
      {dots('M78 66 C100 44 118 44 134 62', 'rgb(var(--accent-rgb))', 2, 2.2)}
      {dots('M186 62 C204 44 222 44 244 66', 'rgb(var(--accent-rgb))', 2, 2.2)}
      {dots('M244 92 C222 114 204 114 186 96', 'rgb(var(--moss-rgb))', 2, 2.8)}
      {dots('M134 96 C118 114 100 114 78 92', 'rgb(var(--moss-rgb))', 2, 2.8)}
      {node(52, 'TrailCoach', (
        <g>
          <rect x="-15" y="-15" width="30" height="30" rx="8" fill="rgb(var(--accent-rgb))" />
          <path d="M-11 9 L-3 -5 L1.5 2.5 L4.5 -2 L11.5 9 Z" fill="#fff" />
        </g>
      ))}
      {node(160, 'Intervals.icu', (
        <path d="M-13 7 a8 8 0 0 1 1.5-15.8 a10.5 10.5 0 0 1 20 2.6 a6.8 6.8 0 0 1 -1.2 13.2 Z" fill="rgb(var(--ink))" opacity="0.85" />
      ))}
      {node(268, 'Votre montre', (
        <g>
          <rect x="-6.5" y="-21" width="13" height="42" rx="4" fill="rgb(var(--line))" />
          <circle r="12.5" fill="rgb(var(--ink))" />
          <circle r="9" fill="rgb(var(--surface))" />
          <path d="M0 -5 V0 L4 3" fill="none" stroke="rgb(var(--accent-rgb))" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      <g className="text-[9.5px] font-bold">
        <circle cx="62" cy="158" r="3.4" fill="rgb(var(--accent-rgb))" /><text x="70" y="161.5" className="fill-muted">Séances planifiées →</text>
        <circle cx="192" cy="158" r="3.4" fill="rgb(var(--moss-rgb))" /><text x="200" y="161.5" className="fill-muted">← Sorties réalisées</text>
      </g>
    </svg>
  );
}

/** Étape 2 : création du compte. */
function AccountArt() {
  return (
    <div className="guide-anim">
      <Browser url="intervals.icu">
        <div className="space-y-2 p-4 text-center">
          <div className="font-display text-base font-black">Intervals.icu</div>
          <div className="mx-auto h-1.5 w-32 rounded-full bg-sunken" />
          <div className="mx-auto h-1.5 w-24 rounded-full bg-sunken" />
          <div className="guide-press mx-auto mt-3 w-28 rounded-lg bg-accent py-1.5 text-[11px] font-black text-white">Sign up</div>
          <div className="text-[9px] font-semibold text-muted">Gratuit · e-mail ou compte Google</div>
        </div>
        <Cursor className="guide-cursor-account" />
      </Browser>
    </div>
  );
}

/** Étape 3 : bloc de la marque, bouton Connect puis case « Upload planned workouts ». */
function ConnectArt({ brand }) {
  return (
    <div className="guide-anim">
      <Browser url="intervals.icu/settings">
        <div className="space-y-2.5 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black"><Watch className="h-3.5 w-3.5 text-accent" /> {brand}</div>
            <div className="relative h-6 w-[5.5rem] text-[10px] font-black">
              <span className="guide-connect-off absolute inset-0 grid place-items-center rounded-md bg-accent text-white">Connect</span>
              <span className="guide-connect-on absolute inset-0 grid place-items-center rounded-md text-white" style={{ background: 'var(--type-ef)' }}>Connecté ✓</span>
            </div>
          </div>
          <div className="space-y-1.5 border-t border-line pt-2.5 text-[10.5px] font-semibold">
            <div className="flex items-center gap-2 text-muted">
              <span className="grid h-3.5 w-3.5 place-items-center rounded-[4px] bg-ink text-bg"><Check className="h-2.5 w-2.5" strokeWidth={4} /></span>
              Download activities
            </div>
            <div className="guide-row-hl -mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1">
              <span className="relative grid h-3.5 w-3.5 place-items-center rounded-[4px] border-[1.5px] border-muted">
                <span className="guide-tick absolute inset-[-1.5px] grid place-items-center rounded-[4px] bg-accent text-white"><Check className="h-2.5 w-2.5" strokeWidth={4} /></span>
              </span>
              <span className="font-bold text-ink">Upload planned workouts</span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <span className="h-3.5 w-3.5 rounded-[4px] border-[1.5px] border-line" />
              Download wellness data
            </div>
          </div>
        </div>
        <Cursor className="guide-cursor-connect" />
      </Browser>
    </div>
  );
}

/** Étape 4 : la page défile jusqu'à « Developer Settings », puis la clé est copiée. */
function KeyArt() {
  const row = (w) => (
    <div className="flex items-center justify-between rounded-md border border-line px-2.5 py-2">
      <span className="h-1.5 rounded-full bg-sunken" style={{ width: w }} />
      <span className="h-1.5 w-8 rounded-full bg-sunken" />
    </div>
  );
  return (
    <div className="guide-anim">
      <Browser url="intervals.icu/settings">
        <div className="h-[9.2rem] overflow-hidden">
          <div className="guide-scroll space-y-2 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-muted">Settings</div>
            {row('5rem')}{row('7rem')}{row('4rem')}{row('6rem')}{row('5.5rem')}
            <div className="rounded-lg border-[1.5px] border-accent/60 bg-accent/5 p-2.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-black"><KeyRound className="h-3 w-3 text-accent" /> Developer Settings</div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[9.5px] font-bold text-muted">API Key</span>
                <span className="flex-1 truncate rounded bg-surface px-1.5 py-1 font-mono text-[9px] tracking-widest">••••••••••••••</span>
                <span className="relative grid h-5 w-5 place-items-center rounded bg-ink text-bg">
                  <Copy className="h-2.5 w-2.5" />
                  <span className="guide-copied absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[9px] font-bold text-bg">Copié !</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <Cursor className="guide-cursor-key" />
      </Browser>
    </div>
  );
}

/** Étape 5 : la clé reste sur l'appareil. */
function PasteArt() {
  return (
    <div className="guide-anim mx-auto flex w-full max-w-[19rem] items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-lg">
      <span className="guide-lock grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-white"><Lock className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Clé API</div>
        <div className="mt-1 overflow-hidden rounded-md bg-sunken px-2 py-1.5 font-mono text-[11px] tracking-[0.2em]"><span className="guide-type inline-block overflow-hidden whitespace-nowrap align-bottom">••••••••••••••••</span></div>
        <div className="mt-1 text-[9.5px] font-semibold text-muted">Enregistrée uniquement sur cet appareil</div>
      </div>
    </div>
  );
}

/* --------------------------------- guide --------------------------------- */

export function BrandTabs({ brand, setBrand }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Marque de la montre">
      {Object.entries(BRANDS).map(([id, b]) => (
        <button key={id} type="button" onClick={() => setBrand(id)} aria-pressed={brand === id} className={cx('rounded-full px-3 py-1.5 text-xs font-bold transition', brand === id ? 'bg-ink text-bg' : 'bg-sunken text-muted hover:text-ink')}>
          {b.label}
        </button>
      ))}
    </div>
  );
}

export function NumberedList({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((t, i) => (
        <li key={t} className="flex gap-3 text-sm leading-snug">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/10 text-[11px] font-black text-accent">{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

export default function IntervalsGuide({ brand, setBrand, connected, apiKey, setApiKey, status, onConnect, onClose }) {
  const [step, setStep] = useState(0);
  const b = BRANDS[brand] || BRANDS.suunto;
  const last = STEPS.length - 1;

  const content = [
    {
      art: <FlowArt />,
      title: 'Un relais entre l’app et votre montre',
      body: (
        <>
          <p>Intervals.icu est un service gratuit qui fait le lien entre TrailCoach et les montres Suunto, Garmin, Coros ou Wahoo. Une fois relié, tout devient automatique :</p>
          <ul className="mt-2 space-y-1.5">
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />vos séances arrivent sur la montre, avec les étapes et les cibles de fréquence cardiaque ou d’allure ;</li>
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" />vos sorties reviennent dans l’app, qui calcule votre score de suivi du plan.</li>
          </ul>
          <p className="mt-2 text-muted">Comptez 5 minutes, à faire une seule fois. Le plus simple est de le faire sur un ordinateur.</p>
        </>
      ),
    },
    {
      art: <AccountArt />,
      title: 'Créez votre compte Intervals.icu',
      body: (
        <>
          <p>Ouvrez le site et inscrivez-vous. Le compte gratuit suffit, aucun abonnement n’est nécessaire.</p>
          <a href="https://intervals.icu" target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl border border-line px-3.5 text-sm font-bold hover:bg-sunken">
            Ouvrir intervals.icu <ExternalLink className="h-4 w-4" />
          </a>
          <p className="mt-3 rounded-xl bg-sunken/70 p-3 text-xs leading-relaxed text-muted">
            <span className="font-bold text-ink">À savoir :</span> reliez directement la marque de votre montre à l’étape suivante, plutôt que Strava seul. Les sorties qui passent par Strava ne peuvent pas être transmises à TrailCoach.
          </p>
        </>
      ),
    },
    {
      art: <ConnectArt brand={b.label === 'Autre' ? 'Wahoo' : b.label} />,
      title: 'Reliez votre montre',
      body: (
        <>
          <BrandTabs brand={brand} setBrand={setBrand} />
          <div className="mt-3"><NumberedList items={b.connect} /></div>
          <p className="mt-3 rounded-xl bg-sunken/70 p-3 text-xs leading-relaxed text-muted">
            <span className="font-bold text-ink">La case à ne pas oublier :</span> « Upload planned workouts ». Sans elle, les séances restent dans Intervals.icu et n’arrivent jamais sur la montre. Si le site est affiché en français, les intitulés peuvent être traduits.
          </p>
        </>
      ),
    },
    {
      art: <KeyArt />,
      title: 'Récupérez votre clé API',
      body: (
        <>
          <p>La clé API est un mot de passe réservé aux applications : elle autorise TrailCoach à déposer vos séances et à lire vos sorties.</p>
          <div className="mt-3"><NumberedList items={[
            'Toujours dans « Settings », descendez tout en bas de la page.',
            'Dans le bloc « Developer Settings », repérez la ligne « API Key » (créez la clé si elle est vide).',
            'Copiez la clé : une suite de lettres et de chiffres.',
          ]} /></div>
        </>
      ),
    },
    {
      art: <PasteArt />,
      title: connected ? 'Vous êtes connecté' : 'Collez la clé ici',
      body: connected ? (
        <p>Tout est prêt. Envoyez une semaine depuis « Mon Programme » ou tout le programme depuis cette page, puis synchronisez votre montre.</p>
      ) : (
        <>
          <form onSubmit={(e) => { e.preventDefault(); if (apiKey.trim()) onConnect(); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Clé API Intervals.icu">
                <input type="password" autoComplete="off" className={inputClass} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Collez votre clé ici" />
              </Field>
            </div>
            <Button type="submit" disabled={!apiKey.trim() || status.state === 'loading'}>
              {status.state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Connecter
            </Button>
          </form>
          {status.state === 'error' && <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{status.message}</p>}
          <p className="mt-3 text-xs leading-relaxed text-muted">
            La clé est enregistrée uniquement dans ce navigateur, jamais sur un serveur TrailCoach. Ne la communiquez à personne. Pour la révoquer, générez-en une nouvelle dans Intervals.icu.
          </p>
        </>
      ),
    },
  ][step];

  return (
    <div className="overflow-hidden rounded-2xl border border-line">
      <div className="flex items-center gap-1 border-b border-line bg-sunken/40 px-3 py-2.5" role="tablist" aria-label="Étapes du guide">
        {STEPS.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={i === step} onClick={() => setStep(i)} className="group flex flex-1 flex-col items-center gap-1.5">
            <span className={cx('h-1 w-full rounded-full transition-colors', i <= step ? 'bg-accent' : 'bg-line')} />
            <span className={cx('text-[10px] font-bold uppercase tracking-wider transition-colors max-[420px]:hidden', i === step ? 'text-ink' : 'text-muted group-hover:text-ink')}>{s}</span>
          </button>
        ))}
      </div>

      <div key={step} className="rise">
        <div className="guide-stage grid min-h-[12.5rem] place-items-center px-4 py-5">{content.art}</div>
        <div className="space-y-2 px-4 pb-4 pt-4 sm:px-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Étape {step + 1} sur {STEPS.length}</div>
          <h4 className="font-display text-2xl font-extrabold leading-tight">{content.title}</h4>
          <div className="text-sm leading-relaxed">{content.body}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3 sm:px-5">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Précédent</Button>
        {step === 0 && !connected && <button type="button" onClick={() => setStep(last)} className="text-xs font-bold text-muted underline-offset-2 hover:text-ink hover:underline">J’ai déjà ma clé</button>}
        {step < last
          ? <Button size="sm" onClick={() => setStep(step + 1)}>Suivant <ArrowRight className="h-4 w-4" /></Button>
          : onClose ? <Button size="sm" variant="ghost" onClick={onClose}>Fermer le guide</Button> : <span />}
      </div>
    </div>
  );
}
