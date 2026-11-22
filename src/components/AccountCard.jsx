import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Cloud, CloudOff, Loader2, LogOut, Mail, RefreshCw, ShieldCheck, Smartphone, Trash2 } from 'lucide-react';
import { Button, Card, Field, Overlay, cx, inputClass } from './ui';
import { cloudConfigured, deleteAccount, getCloudState, resolveConflict, sendLoginEmail, signOut, subscribeCloud, syncNow, verifyLoginCode } from '../lib/cloud';
import { formatShortDate } from '../lib/format';

export function useCloud() {
  return useSyncExternalStore(subscribeCloud, getCloudState, getCloudState);
}

function ago(ts) {
  if (!ts) return '';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  return `le ${new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
}

/** Petit indicateur dans l'en-tête quand un compte est connecté. */
export function CloudBadge() {
  const c = useCloud();
  if (!c.user) return null;
  const off = c.status === 'offline' || c.status === 'error';
  const busy = c.status === 'syncing' || c.status === 'loading';
  const title = busy ? 'Synchronisation…' : off ? `${c.error || 'Hors connexion'}${c.pending ? ` · ${c.pending} modification(s) en attente` : ''}` : `Sauvegardé en ligne ${ago(c.lastSync)}`;
  const Icon = off ? CloudOff : Cloud;
  return (
    <span className="relative grid h-8 w-8 place-items-center rounded-full text-muted" title={title} aria-label={title} role="status">
      <Icon className={cx('h-4 w-4', busy && 'animate-pulse')} style={off ? { color: 'var(--type-cotes)' } : undefined} />
      {!off && !busy && <span className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--type-ef)' }} />}
    </span>
  );
}

export default function AccountCard() {
  const c = useCloud();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(null); // adresse à laquelle l'e-mail a été envoyé
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [, tick] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 30000); return () => clearInterval(t); }, []);

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const send = (addr) => run(async () => { await sendLoginEmail(addr); setSent(addr.trim()); setCode(''); setCooldown(60); });

  const head = (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Cloud className="h-5 w-5" /></div>
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Compte et sauvegarde en ligne</h3>
        <p className="text-sm font-semibold">Retrouvez votre programme sur tous vos appareils</p>
      </div>
    </div>
  );

  if (!cloudConfigured) {
    return (
      <Card className="p-5 sm:p-6">
        {head}
        <p className="mt-4 text-sm text-muted">La sauvegarde en ligne n’est pas encore activée sur cette version de l’app. Vos données restent enregistrées sur cet appareil.</p>
      </Card>
    );
  }

  if (c.status === 'loading') {
    return <Card className="p-5 sm:p-6">{head}<div className="mt-4 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div></Card>;
  }

  if (!c.user) {
    return (
      <Card className="p-5 sm:p-6">
        {head}
        {!sent ? (
          <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); if (email.trim()) send(email); }}>
            <p className="text-sm text-muted">Connectez-vous avec votre adresse e-mail, sans mot de passe : vous recevez un lien et un code de connexion. Ensuite, chaque modification est sauvegardée automatiquement.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label="Adresse e-mail">
                  <input type="email" inputMode="email" autoComplete="email" required className={inputClass} value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="vous@exemple.fr" />
                </Field>
              </div>
              <Button type="submit" disabled={busy || !email.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Recevoir le lien
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-sunken/60 p-3.5 text-sm leading-relaxed">
              E-mail envoyé à <span className="font-bold">{sent}</span>. Ouvrez-le et touchez le lien, <span className="font-bold">ou</span> saisissez ci-dessous le code à 6 chiffres. Pensez à regarder dans les indésirables.
            </div>
            <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); if (code.trim().length >= 6) run(() => verifyLoginCode(sent, code)); }}>
              <div className="flex-1">
                <Field label="Code reçu par e-mail">
                  <input inputMode="numeric" autoComplete="one-time-code" maxLength={10} className={cx(inputClass, 'text-center font-mono text-lg tracking-[0.4em]')} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(null); }} placeholder="••••••" />
                </Field>
              </div>
              <Button type="submit" disabled={busy || code.trim().length < 6}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Valider</Button>
            </form>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-muted">
              <button type="button" disabled={cooldown > 0 || busy} onClick={() => send(sent)} className="hover:text-ink disabled:opacity-50">{cooldown > 0 ? `Renvoyer l’e-mail (${cooldown} s)` : 'Renvoyer l’e-mail'}</button>
              <button type="button" onClick={() => { setSent(null); setError(null); }} className="hover:text-ink">Changer d’adresse</button>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</p>}
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Sont sauvegardés : profil, programme, séances validées, sorties et réglages de course. La clé API Intervals.icu reste uniquement sur chaque appareil.
        </p>
      </Card>
    );
  }

  const off = c.status === 'offline' || c.status === 'error';
  const statusText = c.status === 'syncing'
    ? 'Synchronisation…'
    : c.status === 'conflict'
      ? 'En attente de votre choix'
      : off
        ? (c.status === 'offline' ? 'Hors connexion' : c.error)
        : `Tout est sauvegardé${c.lastSync ? ` · ${ago(c.lastSync)}` : ''}`;

  return (
    <Card className="p-5 sm:p-6">
      {head}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-sunken/40 p-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold">{c.user.email}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: off ? 'var(--type-cotes)' : c.status === 'syncing' ? 'rgb(var(--muted))' : 'var(--type-ef)' }}>
            {c.status === 'syncing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : off ? <CloudOff className="h-3.5 w-3.5" /> : <Cloud className="h-3.5 w-3.5" />}
            <span>{statusText}</span>
          </div>
          {c.pending > 0 && c.status !== 'syncing' && <div className="mt-0.5 text-xs text-muted">{c.pending} modification{c.pending > 1 ? 's' : ''} en attente d’envoi</div>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => syncNow(true)} disabled={c.status === 'syncing' || c.status === 'conflict'}><RefreshCw className="h-4 w-4" /> Synchroniser</Button>
      </div>
      <p className="mt-3 text-sm text-muted">Chaque modification est sauvegardée automatiquement. Sur un autre téléphone ou ordinateur, connectez-vous avec la même adresse pour retrouver votre programme.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => run(signOut)} disabled={busy}><LogOut className="h-4 w-4" /> Se déconnecter</Button>
        <Button
          variant="danger"
          size="sm"
          disabled={busy}
          onClick={() => {
            if (window.confirm('Supprimer votre compte et toutes vos données en ligne ? Les données de cet appareil sont conservées.')) run(deleteAccount);
          }}
        >
          <Trash2 className="h-4 w-4" /> Supprimer mon compte
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">Se déconnecter laisse vos données sur cet appareil.</p>
      {error && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</p>}
    </Card>
  );
}

/** Première connexion sur un appareil qui a déjà un programme, alors que le compte en a un aussi. */
export function ConflictDialog() {
  const c = useCloud();
  const [busy, setBusy] = useState(false);
  if (!c.conflict) return null;
  const { local, remote, remoteAt } = c.conflict;
  const choose = async (choice) => { setBusy(true); await resolveConflict(choice); setBusy(false); };
  const Option = ({ icon: Icon, title, s, hint, choice, primary }) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => choose(choice)}
      className={cx('flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition hover:border-accent disabled:opacity-60', primary ? 'border-accent/50 bg-accent/5' : 'border-line')}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sunken"><Icon className="h-5 w-5 text-accent" /></span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="block truncate text-sm font-bold">{s.raceName}{s.raceDate ? ` · ${formatShortDate(s.raceDate)}` : ''}</span>
        <span className="block text-xs text-muted">{s.done} séance{s.done > 1 ? 's' : ''} validée{s.done > 1 ? 's' : ''} · {s.activities} sortie{s.activities > 1 ? 's' : ''}{hint ? ` · ${hint}` : ''}</span>
      </span>
    </button>
  );
  return (
    <Overlay label="Choisir les données à garder" onClose={() => {}} closeOnBackdrop={false}>
      <div className="rise w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <h2 className="font-display text-2xl font-extrabold leading-tight">Deux programmes différents</h2>
        <p className="mt-1 text-sm text-muted">Votre compte contient déjà un programme, et cet appareil aussi. Lequel garder ? L’autre sera remplacé.</p>
        <div className="mt-4 space-y-2.5">
          <Option icon={Cloud} title="Celui du compte en ligne" s={remote} hint={remoteAt ? `modifié ${formatShortDate(new Date(remoteAt))}` : null} choice="remote" primary />
          <Option icon={Smartphone} title="Celui de cet appareil" s={local} choice="local" />
        </div>
        {busy && <div className="mt-3 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Synchronisation…</div>}
              </div>
    </Overlay>
  );
}

/** Connexion depuis le questionnaire, sur un nouvel appareil : le programme du compte est récupéré. */
export function LoginDialog({ onClose }) {
  const c = useCloud();
  useEffect(() => { if (c.user && c.status !== 'syncing' && c.status !== 'loading') onClose(); }, [c.user, c.status, onClose]);
  return (
    <Overlay label="Se connecter" onClose={onClose}>
      <div className="rise relative w-full max-w-lg">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Fermer">×</button>
        <AccountCard />
      </div>
    </Overlay>
  );
}
