import React, { useEffect, useRef, useState } from 'react';
import { Check, Download, Share2, X } from 'lucide-react';
import { Button, Overlay, Segmented } from './ui';
import { FORMATS, canvasToBlob, drawShareCard } from '../lib/sharecard';

/** Aperçu de la carte de partage, avec choix du format, partage natif et téléchargement. */
export default function ShareModal({ data, onClose }) {
  const canvasRef = useRef(null);
  const [format, setFormat] = useState('post');
  const [state, setState] = useState(null); // 'shared' | 'saved' | message d'erreur

  useEffect(() => {
    let cancelled = false;
    drawShareCard(document.createElement('canvas'), data, format).then((c) => {
      if (cancelled || !canvasRef.current) return;
      const target = canvasRef.current;
      target.width = c.width;
      target.height = c.height;
      target.getContext('2d').drawImage(c, 0, 0);
    });
    return () => { cancelled = true; };
  }, [data, format]);

  const fileName = `${data.fileName}${format === 'story' ? '-story' : ''}.png`;
  const makeFile = async () => new File([await canvasToBlob(canvasRef.current)], fileName, { type: 'image/png' });

  const download = async () => {
    const url = URL.createObjectURL(await makeFile());
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setState('saved');
  };

  const share = async () => {
    try {
      const file = await makeFile();
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'TrailCoach', text: data.shareText || `${data.title} · TrailCoach` });
        setState('shared');
      } else {
        await download();
      }
    } catch (e) {
      if (e?.name !== 'AbortError') setState('Le partage a échoué : essayez « Télécharger ».');
    }
  };

  const canShareFiles = typeof navigator !== 'undefined' && !!navigator.canShare && !!navigator.share;
  const { w, h } = FORMATS[format];

  return (
    <Overlay label="Partager" onClose={onClose}>
      <div className="rise flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Carte de partage</div>
            <div className="text-sm font-extrabold">Montrez votre entraînement</div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink" aria-label="Fermer"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <Segmented options={Object.entries(FORMATS).map(([value, f]) => ({ value, label: `${f.label} (${f.w} × ${f.h})` }))} value={format} onChange={(v) => { setFormat(v); setState(null); }} />
          <div className="grid place-items-center rounded-2xl bg-sunken p-3">
            <canvas
              ref={canvasRef}
              data-testid="share-canvas"
              className="rounded-xl shadow-lg"
              style={{ aspectRatio: `${w} / ${h}`, height: format === 'story' ? 'min(52dvh, 460px)' : 'min(46dvh, 400px)', maxWidth: '100%' }}
              aria-label="Aperçu de la carte de partage"
            />
          </div>
          <div className="flex gap-2">
            {canShareFiles && <Button className="flex-1" onClick={share}><Share2 className="h-4 w-4" /> Partager</Button>}
            <Button className="flex-1" variant={canShareFiles ? 'ghost' : 'primary'} onClick={download}><Download className="h-4 w-4" /> Télécharger</Button>
          </div>
          {state && (
            <p className="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted">
              {(state === 'saved' || state === 'shared') && <Check className="h-3.5 w-3.5" style={{ color: 'var(--type-ef)' }} />}
              {state === 'saved' ? 'Image enregistrée : ajoutez-la à votre activité Strava ou à votre story.' : state === 'shared' ? 'Partagé.' : state}
            </p>
          )}
        </div>
      </div>
    </Overlay>
  );
}
