/**
 * Relais Vercel vers l'API Intervals.icu.
 * Évite les blocages CORS du navigateur. La clé API de l'utilisateur transite
 * dans l'en-tête Authorization et n'est jamais stockée ni journalisée ici.
 * Seuls les chemins de l'athlète courant (/api/v1/athlete/0/...) sont autorisés.
 */
const ALLOWED = /^\/api\/v1\/athlete\/0(\/[A-Za-z0-9_\-/]*)?(\?[A-Za-z0-9_=&\-:.%]*)?$/;

export default async function handler(req, res) {
  res.setHeader('X-TrailCoach-Proxy', '1');
  res.setHeader('Cache-Control', 'no-store');

  const path = String(req.query.p || '');
  if (!ALLOWED.test(path) || path.includes('..')) {
    res.status(400).json({ error: 'Chemin non autorisé' });
    return;
  }
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(401).json({ error: 'Clé API manquante' });
    return;
  }

  try {
    const upstream = await fetch(`https://intervals.icu${path}`, {
      method: req.method,
      headers: { Authorization: auth, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(req.body ?? null) : undefined,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch {
    res.status(502).json({ error: 'Intervals.icu injoignable' });
  }
}
