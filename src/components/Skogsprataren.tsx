import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Check, Loader2, Send, Sparkles } from 'lucide-react';

// Skogsprataren: the optional AI feature. The browser only ever talks to
// /api/ai on this same site. The provider key lives in the server function's
// environment variables and is never readable here.

type ApiStatus =
  | { state: 'checking' }
  | { state: 'ready'; provider?: string; model?: string }
  | { state: 'not-configured'; hint?: string }
  | { state: 'offline' };

const PRESETS: [string, string][] = [
  ['Skylt till stugan', 'Skriv en kort, lagom kaxig träskylt som Leffe och Bill kan sätta upp vid stugan.'],
  ['Nytt småuppdrag', 'Föreslå ett litet och ofarligt uppdrag i skogsbyn Gråmyren som passar på en kvart.'],
  ['Byskvaller', 'Hitta på tre korta rykten som byborna kan prata om vid kaffet i Gråmyren.'],
];

const MAX_PROMPT = 1200;

async function readJson(response: Response) {
  const type = response.headers.get('content-type') ?? '';
  if (!type.includes('json')) return null;
  try { return await response.json(); } catch { return null; }
}

export function Skogsprataren() {
  const [status, setStatus] = useState<ApiStatus>({ state: 'checking' });
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    (async () => {
      try {
        const response = await fetch('/api/ai', { headers: { accept: 'application/json' }, signal: controller.signal });
        const data = await readJson(response);
        if (!data) setStatus({ state: 'offline' });
        else if (data.configured) setStatus({ state: 'ready', provider: data.provider, model: data.model });
        else setStatus({ state: 'not-configured', hint: data.hint });
      } catch {
        setStatus({ state: 'offline' });
      } finally {
        window.clearTimeout(timer);
      }
    })();
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, []);

  const ask = useCallback(async () => {
    const text = prompt.trim();
    if (text.length < 3 || busy) return;
    setBusy(true); setError(null); setAnswer(null);
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await readJson(response);
      if (!data) {
        setError('Fick inget svar från servern. Är API-funktionen publicerad på den här adressen?');
        setStatus({ state: 'offline' });
      } else if (data.ok && typeof data.text === 'string') {
        setAnswer(data.text);
        if (data.model && data.provider) setStatus({ state: 'ready', provider: data.provider, model: data.model });
      } else if (data.error === 'not-configured') {
        setStatus({ state: 'not-configured', hint: data.message });
        setError(data.message ?? 'Servern saknar API-nyckel.');
      } else {
        setError(data.message ?? 'Tjänsten svarade inte som väntat.');
      }
    } catch {
      setError('Kunde inte nå servern. Kontrollera anslutningen och försök igen.');
    } finally {
      setBusy(false);
      window.setTimeout(() => answerRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 40);
    }
  }, [busy, prompt]);

  return (
    <section className="ai-panel" aria-labelledby="ai-panel-title">
      <div className="setting-label ai-panel-head">
        <Bot size={20} />
        <span>
          <strong id="ai-panel-title">Skogsprataren · frivilligt API</strong>
          <small>Skickar bara din text till servern som hör till den här adressen. API-nyckeln ligger på servern, aldrig i webbläsaren.</small>
        </span>
      </div>

      {status.state === 'checking' && <p className="ai-state checking"><Loader2 size={14} />Kollar om API:t svarar…</p>}
      {status.state === 'ready' && <p className="ai-state ready"><Check size={14} />Redo{status.provider ? ` · ${status.provider}` : ''}{status.model ? ` · ${status.model}` : ''}</p>}
      {status.state === 'not-configured' && <p className="ai-state info"><AlertTriangle size={14} />Servern är publicerad men saknar nyckel. {status.hint ?? 'Sätt AI_API_KEY som miljövariabel på värden och publicera igen.'}</p>}
      {status.state === 'offline' && <p className="ai-state info"><AlertTriangle size={14} />Ingen API-funktion på den här adressen. Publicera appen på Netlify eller Vercel för att använda Skogsprataren.</p>}

      <div className="ai-presets">
        {PRESETS.map(([label, text]) => (
          <button key={label} className="secondary-button ai-preset" onClick={() => { setPrompt(text); setError(null); }}>{label}</button>
        ))}
      </div>

      <textarea
        className="ai-input"
        rows={3}
        maxLength={MAX_PROMPT}
        value={prompt}
        placeholder="Fråga Skogsprataren om en skylt, en replik eller ett litet uppdrag…"
        aria-label="Din fråga till Skogsprataren"
        onChange={event => setPrompt(event.target.value)}
      />
      <div className="ai-actions">
        <span className="ai-counter">{prompt.trim().length}/{MAX_PROMPT}</span>
        <button className="primary-button ai-send" onClick={ask} disabled={busy || prompt.trim().length < 3}>
          {busy ? <><Loader2 size={15} className="ai-spin" />Tänker…</> : <><Send size={15} />Fråga<Sparkles size={14} /></>}
        </button>
      </div>

      {error && <p className="ai-error" role="alert">{error}</p>}
      <div className="ai-answer" ref={answerRef} aria-live="polite">{answer}</div>
    </section>
  );
}
