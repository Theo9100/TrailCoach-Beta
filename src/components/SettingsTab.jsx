import React, { useRef, useState } from 'react';
import { Download, Laptop, Moon, Sun, Trash2, Upload } from 'lucide-react';
import { Button, Card, SectionTitle, cx } from './ui';
import { clearAll, exportAll, importAll } from '../lib/storage';

export default function SettingsTab({ theme, setTheme, stats }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);

  const download = () => {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trailcoach-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file) => {
    if (!file) return;
    try {
      importAll(JSON.parse(await file.text()));
      window.location.reload();
    } catch (e) {
      setMessage(e.message || 'Fichier illisible.');
    }
  };

  const themes = [
    { value: 'light', label: 'Clair', icon: Sun },
    { value: 'dark', label: 'Sombre', icon: Moon },
    { value: 'system', label: 'Système', icon: Laptop },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionTitle eyebrow="Préférences & données" title="Réglages" />

      <Card className="p-5 sm:p-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Apparence</h3>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              className={cx('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-bold transition', theme === value ? 'border-accent bg-accent/5 text-ink' : 'border-line text-muted hover:text-ink')}
            >
              <Icon className={cx('h-5 w-5', theme === value && 'text-accent')} />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Vos données</h3>
        <p className="mt-2 text-sm text-muted">
          Tout est enregistré uniquement dans ce navigateur ({stats.activities} activité{stats.activities > 1 ? 's' : ''}, {stats.completed} séance{stats.completed > 1 ? 's' : ''} validée{stats.completed > 1 ? 's' : ''}). Exportez une sauvegarde pour changer d'appareil.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="ghost" onClick={download}><Download className="h-4 w-4" /> Exporter</Button>
          <Button variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Restaurer</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => restore(e.target.files?.[0])} />
        </div>
        {message && <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--type-vma)' }}>{message}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--type-vma)' }}>Zone de danger</h3>
        <p className="mt-2 text-sm text-muted">Supprime le profil, le programme, les séances validées et les activités importées.</p>
        <Button
          variant="danger"
          className="mt-4"
          onClick={() => {
            if (window.confirm('Effacer toutes les données TrailCoach de ce navigateur ?')) {
              clearAll();
              window.location.reload();
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Tout réinitialiser
        </Button>
      </Card>

      <p className="text-center text-xs text-muted">TrailCoach · programme calculé localement, sans IA ni serveur.</p>
    </div>
  );
}
