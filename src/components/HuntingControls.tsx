import { Crosshair, LockKeyhole, MousePointer2, Target } from 'lucide-react';
import type { GameSnapshot } from '../game/types';

const feedback = {
  ready: 'Redo att skjuta', flying: 'Kulan är på väg…', hit: 'Träff!',
  miss: 'Bom – sikta och prova igen.', blocked: 'Hinder framför pipan eller i skottlinjen.',
  person: 'Jaktgeväret är bara till för älgar.',
};

export function HuntingControls({ state, onAim, onShoot }: { state: GameSnapshot; onAim: () => void; onShoot: () => void }) {
  if (!state.started) return null;
  if (!state.hasRifle && state.location === 'Jaktmarken') return <div className="hunting-controls missing-rifle" aria-label="Geväret saknas">
    <button onClick={onAim}><LockKeyhole size={16} /><span>Hämta geväret i huset först</span></button>
  </div>;
  if (!state.canAim && !state.aiming) return null;
  const canShoot = state.canAim && state.aiming && state.aimPlaced && state.shotCooldown <= 0;
  return <>
    {state.aiming && <>
      <aside className="hunting-panel" aria-label="Siktning">
        <span className="hunting-kicker"><Crosshair size={14} /> GEVÄRET ÄR HÖJT</span>
        <strong>{!state.aimPlaced ? 'Placera siktet först.' : state.shotCooldown > 0 ? 'Nästa skott strax…' : 'Siktet är placerat. Skjut!'}</strong>
        <p><MousePointer2 size={13} /> {state.huntTargets.some(target => target.visible)
          ? 'Flytta siktet med musen, fingret eller piltangenterna. Skjut med knappen, F eller mellanslag.'
          : 'Ingen älg i bild? Sänk geväret och dra i spelbilden för att vrida kameran.'}</p>
        <span className={`shot-feedback ${state.shotFeedback}`} role="status">{!state.aimPlaced ? 'Skjut är låst tills du har siktat själv.' : state.shotCooldown > 0 && state.shotFeedback === 'ready' ? 'Vänta ett ögonblick mellan skotten.' : feedback[state.shotFeedback]}</span>
        <small>Träffar {state.shotsHit} / {state.shotsFired} skott · ingen automatisk träff</small>
      </aside>
      <span className={`aim-reticle ${state.aimPlaced ? 'placed' : 'unplaced'} ${state.shotFeedback === 'hit' ? 'hit' : ''}`} aria-hidden="true"
        style={{ left: `${state.aim.x * 100}%`, top: `${state.aim.y * 100}%` }}><i /><b /><em /></span>
    </>}
    <div className={`hunting-controls ${state.aiming ? 'active' : ''}`} aria-label="Gevärskontroller">
      <span className="hunting-steps">Höj geväret → sikta → skjut</span>
      <div className="hunting-buttons">
        <button className="aim-toggle-button" onClick={onAim} aria-pressed={state.aiming} aria-label={state.aiming ? 'Lägg ner geväret' : 'Sikta med geväret'}>
          <Crosshair size={17} /><span>{state.aiming ? 'Sänk' : 'Sikta'}</span><kbd>Q</kbd>
        </button>
        <button className="shoot-button" onClick={onShoot} disabled={!canShoot} aria-label="Skjut"
          title={!state.aiming ? 'Höj geväret med Sikta först' : !state.aimPlaced ? 'Placera siktet först' : state.shotCooldown > 0 ? 'Ett ögonblick till nästa skott' : 'Skjut · F eller mellanslag'}>
          {state.aiming && state.aimPlaced ? <Target size={18} /> : <LockKeyhole size={16} />}<span>Skjut</span><kbd>F</kbd>
        </button>
      </div>
    </div>
  </>;
}
