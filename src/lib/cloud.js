/**
 * Compte et sauvegarde en ligne (Supabase).
 *
 * Principe : l'app enregistre toujours d'abord sur l'appareil (localStorage), puis envoie en ligne
 * les blocs modifiés 1,5 s plus tard. À l'ouverture, au retour du réseau et quand l'app revient au
 * premier plan, elle récupère les blocs modifiés depuis un autre appareil. En cas de modification
 * des deux côtés, la plus récente l'emporte, bloc par bloc.
 *
 * Connexion par e-mail et mot de passe ; l'e-mail ne sert qu'à confirmer l'adresse et à réinitialiser le mot de passe.
 *
 * Sans les variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY, rien de tout cela ne s'active.
 */
import { SYNCED_KEYS, applyRemote, readStore, readSyncMeta, setLocalChangeHandler, writeSyncMeta } from './storage';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const TABLE = 'user_data';
const PUSH_DELAY = 1500;

export const cloudConfigured = !!(URL && KEY);

/* ------------------------------ état observable ------------------------------ */

let state = { status: cloudConfigured ? 'loading' : 'off', user: null, lastSync: null, error: null, pending: 0, conflict: null, recovery: false };
const subscribers = new Set();
function update(patch) {
  state = { ...state, ...patch };
  subscribers.forEach((fn) => fn(state));
}
export function getCloudState() { return state; }
export function subscribeCloud(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }

const pendingCount = () => Object.keys(readSyncMeta().dirty).length;

/* --------------------------------- client --------------------------------- */

let clientPromise = null;
function client() {
  if (!cloudConfigured) return Promise.reject(new Error('Sauvegarde en ligne non configurée.'));
  clientPromise ||= import('@supabase/supabase-js').then(({ createClient }) => createClient(URL, KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
  return clientPromise;
}

function frenchError(e) {
  const msg = String(e?.message || e || '');
  if (/rate limit|too many|429|security purposes/i.test(msg)) return 'Trop de demandes en peu de temps. Patientez quelques minutes avant de réessayer.';
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/i.test(msg)) return 'Adresse pas encore confirmée : ouvrez l’e-mail de confirmation reçu à la création du compte.';
  if (/already registered|already exists/i.test(msg)) return 'Un compte existe déjà avec cette adresse : connectez-vous.';
  if (/password.*(at least|short|characters)|weak.?password/i.test(msg)) return 'Mot de passe trop court ou trop simple : 8 caractères minimum.';
  if (/same.*password|different from the old/i.test(msg)) return 'Le nouveau mot de passe doit être différent de l’ancien.';
  if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(msg)) return 'Lien expiré : demandez-en un nouveau.';
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'Adresse e-mail invalide.';
  if (/fetch|network|load failed|failed to/i.test(msg)) return 'Pas de connexion au serveur. Vos données restent enregistrées sur cet appareil.';
  if (/JWT|not authenticated|401|403/i.test(msg)) return 'Session expirée : reconnectez-vous.';
  return msg || 'Erreur inconnue.';
}

/* ---------------------------------- auth ---------------------------------- */

const origin = () => window.location.origin;

/** Crée le compte. Supabase envoie un e-mail de confirmation : le compte est utilisable une fois l'adresse confirmée. */
export async function signUp(email, password) {
  const sb = await client();
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: origin() } });
  if (error) throw new Error(frenchError(error));
  // Adresse déjà utilisée : Supabase renvoie un utilisateur sans identité (pour ne pas révéler les comptes existants)
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('Un compte existe déjà avec cette adresse : connectez-vous, ou utilisez « Mot de passe oublié ».');
  }
  return { confirmed: !!data.session };
}

export async function signIn(email, password) {
  const sb = await client();
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(frenchError(error));
}

/** Renvoie l'e-mail de confirmation de l'adresse. */
export async function resendConfirmation(email) {
  const sb = await client();
  const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: origin() } });
  if (error) throw new Error(frenchError(error));
}

/** Envoie un lien pour choisir un nouveau mot de passe. */
export async function sendPasswordReset(email) {
  const sb = await client();
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: origin() });
  if (error) throw new Error(frenchError(error));
}

export async function updatePassword(password) {
  const sb = await client();
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(frenchError(error));
  update({ recovery: false });
}

export function dismissRecovery() { update({ recovery: false }); }

export async function signOut() {
  const sb = await client();
  await sb.auth.signOut({ scope: 'local' });
  writeSyncMeta({ user: null, dirty: {}, synced: {} });
  update({ status: 'signedOut', user: null, lastSync: null, error: null, pending: 0, conflict: null });
}

/** Supprime le compte et toutes ses données en ligne. Les données de cet appareil sont conservées. */
export async function deleteAccount() {
  const sb = await client();
  const { error } = await sb.rpc('delete_my_account');
  if (error) throw new Error(frenchError(error));
  await signOut();
}

/* ------------------------------ synchronisation ------------------------------ */

let running = null;
let again = false;
let pushTimer = null;

async function fetchRemote(sb) {
  const { data, error } = await sb.from(TABLE).select('key, data, updated_at');
  if (error) throw error;
  const rows = {};
  (data || []).forEach((r) => { if (SYNCED_KEYS.includes(r.key)) rows[r.key] = { data: r.data, at: Date.parse(r.updated_at) }; });
  return rows;
}

async function pushDirty(sb, user) {
  const meta = readSyncMeta();
  const keys = Object.keys(meta.dirty).filter((k) => SYNCED_KEYS.includes(k));
  if (!keys.length) return;
  const rows = keys.map((key) => ({ user_id: user.id, key, data: readStore(key, null), updated_at: new Date(meta.dirty[key]).toISOString() }));
  const { error } = await sb.from(TABLE).upsert(rows, { onConflict: 'user_id,key' });
  if (error) throw error;
  // Retire de la file ce qui a été envoyé, sauf si le bloc a encore changé entre-temps
  const after = readSyncMeta();
  keys.forEach((key) => {
    if (after.dirty[key] === meta.dirty[key]) {
      delete after.dirty[key];
      after.synced[key] = meta.dirty[key];
    }
  });
  writeSyncMeta(after);
}

/** Applique les blocs modifiés en ligne depuis la dernière synchro (si plus récents que la version locale). */
function pullChanges(rows) {
  const meta = readSyncMeta();
  let changed = false;
  Object.entries(rows).forEach(([key, r]) => {
    if (r.at === meta.synced[key]) return; // déjà à jour
    const local = meta.dirty[key];
    if (local && local >= r.at) return; // la version de cet appareil est plus récente : elle sera envoyée
    applyRemote(key, r.data);
    delete meta.dirty[key];
    meta.synced[key] = r.at;
    changed = true;
  });
  writeSyncMeta(meta);
  return changed;
}

async function runSync(full) {
  const sb = await client();
  const user = state.user;
  if (!user) return;
  update({ status: 'syncing', error: null });
  if (full) pullChanges(await fetchRemote(sb));
  await pushDirty(sb, user);
  update({ status: 'synced', lastSync: Date.now(), pending: pendingCount() });
}

/** Lance une synchronisation (une seule à la fois ; une demande pendant une synchro en relance une après). */
export function syncNow(full = true) {
  if (!state.user || state.conflict) return Promise.resolve();
  if (running) { again = again || full || 'push'; return running; }
  running = runSync(full)
    .catch((e) => {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      update({ status: offline ? 'offline' : 'error', error: frenchError(e), pending: pendingCount() });
    })
    .finally(() => {
      running = null;
      if (again) { const f = again === true; again = false; syncNow(f); }
    });
  return running;
}

function schedulePush() {
  update({ pending: pendingCount() });
  if (!state.user || state.conflict) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow(false), PUSH_DELAY);
}

/* ------------------------- première connexion sur l'appareil ------------------------- */

const summary = (get) => {
  const profile = get('profile');
  const completions = get('completions') || {};
  const activities = get('activities') || [];
  return profile ? { raceName: profile.raceName, raceDate: profile.raceDate, done: Object.values(completions).filter((c) => c?.done).length, activities: activities.length } : null;
};

async function firstSync(user) {
  const sb = await client();
  update({ status: 'syncing', error: null });
  const rows = await fetchRemote(sb);
  const local = summary((k) => readStore(k, null));
  const remote = summary((k) => rows[k]?.data ?? null);
  const remoteAt = Math.max(0, ...Object.values(rows).map((r) => r.at));

  if (remote && local) {
    // Les deux côtés ont un programme : c'est à l'utilisateur de choisir
    update({ status: 'conflict', conflict: { local, remote, remoteAt, rows } });
    return;
  }
  if (remote) adoptRemote(rows, user); else adoptLocal(user);
  await syncNow(false);
}

/** Garde les données du compte en ligne et remplace celles de cet appareil. */
function adoptRemote(rows, user) {
  writeSyncMeta({ user: user.id, dirty: {}, synced: {} });
  SYNCED_KEYS.forEach((key) => { if (rows[key]) applyRemote(key, rows[key].data); });
  const meta = readSyncMeta();
  Object.entries(rows).forEach(([key, r]) => { meta.synced[key] = r.at; });
  writeSyncMeta(meta);
}

/** Garde les données de cet appareil et les envoie sur le compte. */
function adoptLocal(user) {
  const now = Date.now();
  const dirty = {};
  SYNCED_KEYS.forEach((key) => { if (readStore(key, undefined) !== undefined) dirty[key] = now; });
  writeSyncMeta({ user: user.id, dirty, synced: {} });
}

/** Réponse de l'utilisateur au choix « cet appareil » ou « compte en ligne ». */
export async function resolveConflict(choice) {
  const c = state.conflict;
  if (!c || !state.user) return;
  if (choice === 'remote') adoptRemote(c.rows, state.user); else adoptLocal(state.user);
  update({ conflict: null });
  await syncNow(false);
}

/* --------------------------------- démarrage --------------------------------- */

let started = false;
export async function startCloud() {
  if (!cloudConfigured || started) return;
  started = true;
  setLocalChangeHandler(schedulePush);
  let sb;
  try { sb = await client(); } catch (e) { update({ status: 'error', error: frenchError(e) }); return; }

  const onSession = async (session) => {
    const user = session?.user ? { id: session.user.id, email: session.user.email } : null;
    if (!user) {
      if (state.user || state.status === 'loading') update({ status: 'signedOut', user: null, pending: pendingCount() });
      return;
    }
    if (state.user?.id === user.id && state.status !== 'loading') return;
    update({ user, pending: pendingCount() });
    try {
      if (readSyncMeta().user !== user.id) await firstSync(user); else await syncNow(true);
    } catch (e) {
      update({ status: 'error', error: frenchError(e) });
    }
  };

  // Le premier événement (INITIAL_SESSION) donne la session enregistrée, ou celle du lien reçu par e-mail
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') update({ recovery: true }); // arrivé par le lien « mot de passe oublié »
    if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
    setTimeout(() => onSession(session), 0); // hors du rappel, comme le recommande Supabase
  });

  window.addEventListener('online', () => syncNow(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncNow(true);
    else if (pendingCount()) syncNow(false); // l'app passe en arrière-plan : on envoie ce qui reste
  });
}
