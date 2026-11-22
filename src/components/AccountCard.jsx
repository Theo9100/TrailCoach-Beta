import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Cloud, CloudOff, Eye, EyeOff, KeyRound, Loader2, LogIn, LogOut, MailCheck, RefreshCw, ShieldCheck, Smartphone, Trash2, UserPlus } from 'lucide-react';
import { Button, Card, Field, Overlay, cx, inputClass } from './ui';
import { cloudConfigProblem, cloudConfigured, cloudHost, deleteAccount, dismissRecovery, getCloudState, resendConfirmation, resolveConflict, sendPasswordReset, signIn, signOut, signUp, subscribeCloud, syncNow, updatePassword } from '../lib/cloud';
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

/** Champ mot de passe avec bouton afficher / masquer. */
function PasswordInput({ value, onChange, autoComplete, placeholder = '8 caractères minimum' }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} autoComplete={autoComplete} required minLength={8} className={cx(inputClass, 'pr-11')} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink" aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Formulaire de connexion, de création de compte et de mot de passe oublié. */
function SignInForm() {
  const [mode, setMode] = useState('login'); // login | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // { kind: 'confirm' | 'reset', email }
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const switchMode = (m) => { setMode(m); setError(null); setNotice(null); };
  const tooShort = mode !== 'forgot' && password.length > 0 && password.length < 8;

  const submit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (mode === 'forgot') {
      run(async () => { await sendPasswordReset(email); setNotice({ kind: 'reset', email: email.trim() }); setCooldown(60); });
    } else if (password.length >= 8) {
      if (mode === 'login') run(() => signIn(email, password));
      else run(async () => { const r = await signUp(email, password); if (!r.confirmed) { setNotice({ kind: 'confirm', email: email.trim() }); setCooldown(60); } });
    }
  };

  if (notice) {
    const confirm = notice.kind === 'confirm';
    return (
      <div className="mt-5 space-y-3">
        <div className="flex items-start gap-3 rounded-xl bg-sunken/60 p-4 text-sm leading-relaxed">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div>
            <div className="font-extrabold">{confirm ? 'Confirmez votre adresse' : 'E-mail envoyé'}</div>
            {confirm
              ? <>Un e-mail a été envoyé à <span className="font-bold">{notice.email}</span>. Touchez le lien qu’il contient pour activer votre compte, puis revenez ici et connectez-vous avec votre mot de passe. Pensez à regarder dans les indésirables.</>
              : <>Si un compte existe pour <span className="font-bold">{notice.email}</span>, vous allez recevoir un lien pour choisir un nouveau mot de passe. Ensuite, revenez ici et connectez-vous avec ce nouveau mot de passe.</>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => { setNotice(null); setMode('login'); setError(null); }}><LogIn className="h-4 w-4" /> Se connecter</Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={cooldown > 0 || busy}
            onClick={() => run(async () => { if (confirm) await resendConfirmation(notice.email); else await sendPasswordReset(notice.email); setCooldown(60); })}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {cooldown > 0 ? `Renvoyer l’e-mail (${cooldown} s)` : 'Renvoyer l’e-mail'}
          </Button>
        </div>
        {error && <p className="text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</p>}
      </div>
    );
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={submit}>
      {mode !== 'forgot' && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-sunken p-1" role="tablist" aria-label="Connexion ou création de compte">
          {[['login', 'Se connecter'], ['signup', 'Créer un compte']].map(([m, label]) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => switchMode(m)} className={cx('rounded-lg px-2 py-2 text-xs font-bold transition', mode === m ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
      )}
      {mode === 'forgot' && <p className="text-sm text-muted">Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.</p>}
      <Field label="Adresse e-mail">
        <input type="email" inputMode="email" autoComplete="username" required className={inputClass} value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="vous@exemple.fr" />
      </Field>
      {mode !== 'forgot' && (
        <Field label={mode === 'signup' ? 'Choisissez un mot de passe' : 'Mot de passe'} hint={tooShort ? '8 caractères minimum.' : mode === 'signup' ? '8 caractères minimum. Votre gestionnaire de mots de passe peut le retenir pour vous.' : null}>
          <PasswordInput value={password} onChange={(v) => { setPassword(v); setError(null); }} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? '8 caractères minimum' : 'Votre mot de passe'} />
        </Field>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy || !email.trim() || (mode !== 'forgot' && password.length < 8)}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'login' ? <LogIn className="h-4 w-4" /> : mode === 'signup' ? <UserPlus className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
          {mode === 'login' ? 'Se connecter' : mode === 'signup' ? 'Créer mon compte' : 'Recevoir le lien'}
        </Button>
        {mode === 'login' && <button type="button" onClick={() => switchMode('forgot')} className="text-xs font-bold text-muted hover:text-ink">Mot de passe oublié ?</button>}
        {mode === 'forgot' && <button type="button" onClick={() => switchMode('login')} className="text-xs font-bold text-muted hover:text-ink">Retour à la connexion</button>}
      </div>
      {error && <p className="text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</p>}
    </form>
  );
}

export default function AccountCard() {
  const c = useCloud();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [changing, setChanging] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((v) => v + 1), 30000); return () => clearInterval(t); }, []);

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e.message); }
    setBusy(false);
  };

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
        {cloudConfigProblem && (
          <p className="mt-4 rounded-xl border p-3 text-sm font-semibold" style={{ borderColor: 'var(--type-vma)', color: 'var(--type-vma)' }}>{cloudConfigProblem}</p>
        )}
        <SignInForm />
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Une fois connecté, chaque modification est sauvegardée automatiquement : profil, programme, séances validées, sorties et réglages de course. La clé API Intervals.icu reste uniquement sur chaque appareil.
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted/80">Serveur : {cloudHost}</p>
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
      {changing && <NewPasswordForm className="mt-4" onDone={() => setChanging(false)} onCancel={() => setChanging(false)} />}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => run(signOut)} disabled={busy}><LogOut className="h-4 w-4" /> Se déconnecter</Button>
        {!changing && <Button variant="ghost" size="sm" onClick={() => setChanging(true)} disabled={busy}><KeyRound className="h-4 w-4" /> Changer le mot de passe</Button>}
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

/** Choix d'un nouveau mot de passe (après le lien « mot de passe oublié », ou depuis le compte). */
function NewPasswordForm({ className, onDone, onCancel }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return;
    setBusy(true); setError(null);
    try { await updatePassword(password); setOk(true); setTimeout(() => onDone?.(), 1400); } catch (err) { setError(err.message); }
    setBusy(false);
  };
  if (ok) return <p className={cx('text-sm font-semibold', className)} style={{ color: 'var(--type-ef)' }}>Mot de passe modifié.</p>;
  return (
    <form className={cx('space-y-3', className)} onSubmit={submit}>
      <Field label="Nouveau mot de passe" hint={password.length > 0 && password.length < 8 ? '8 caractères minimum.' : null}>
        <PasswordInput value={password} onChange={(v) => { setPassword(v); setError(null); }} autoComplete="new-password" />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || password.length < 8}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Enregistrer</Button>
        {onCancel && <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>}
      </div>
      {error && <p className="text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{error}</p>}
    </form>
  );
}

/** Ouvert automatiquement quand on arrive par le lien « mot de passe oublié ». */
export function RecoveryDialog() {
  const c = useCloud();
  if (!c.recovery) return null;
  return (
    <Overlay label="Nouveau mot de passe" onClose={dismissRecovery} closeOnBackdrop={false}>
      <div className="rise w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <h2 className="font-display text-2xl font-extrabold leading-tight">Choisissez un nouveau mot de passe</h2>
        <p className="mt-1 text-sm text-muted">Pour le compte {c.user?.email}. Il servira ensuite pour vous connecter sur tous vos appareils, y compris l’app installée sur votre téléphone.</p>
        <NewPasswordForm className="mt-4" onDone={dismissRecovery} onCancel={dismissRecovery} />
      </div>
    </Overlay>
  );
}
