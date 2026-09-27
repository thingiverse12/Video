import { useCallback, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Footprints } from 'lucide-react';
import { directionKeys, padDirection } from '../game/input';

type Props = {
  forced: boolean;
  disabled: boolean;
  inCar: boolean;
  aiming: boolean;
  canShoot: boolean;
  onInput: (pointer: number, keys: readonly string[]) => void;
  onClear: () => void;
  onInteract: () => void;
  onAction: () => void;
};
const arrows = [
  { name: 'up', label: 'framåt', code: 'KeyW', icon: ArrowUp, x: 0, y: 1 },
  { name: 'left', label: 'åt vänster', code: 'KeyA', icon: ArrowLeft, x: -1, y: 0 },
  { name: 'down', label: 'bakåt', code: 'KeyS', icon: ArrowDown, x: 0, y: -1 },
  { name: 'right', label: 'åt höger', code: 'KeyD', icon: ArrowRight, x: 1, y: 0 },
] as const;
const neutral = { x: 0, y: 0 };

export function TouchControls(props: Props) {
  // Keep current callbacks without cancelling a hold every time the HUD updates.
  const callbacks = useRef(props); callbacks.current = props;
  const pad = useRef<HTMLDivElement>(null);
  const sprint = useRef<HTMLButtonElement>(null);
  const padPointer = useRef<number | null>(null);
  const sprintPointer = useRef<number | null>(null);
  const direction = useRef(neutral);
  const [active, setActive] = useState(neutral);
  const [sprinting, setSprinting] = useState(false);

  const releaseCapture = (element: HTMLElement | null, id: number | null) => {
    if (id !== null && element?.hasPointerCapture(id)) element.releasePointerCapture(id);
  };
  const stopPad = useCallback(() => {
    const id = padPointer.current;
    padPointer.current = null;
    direction.current = neutral; setActive(neutral);
    if (id !== null) callbacks.current.onInput(id, []);
    releaseCapture(pad.current, id);
  }, []);
  const stopSprint = useCallback(() => {
    const id = sprintPointer.current;
    sprintPointer.current = null; setSprinting(false);
    if (id !== null) callbacks.current.onInput(id, []);
    releaseCapture(sprint.current, id);
  }, []);
  const clear = useCallback(() => {
    stopPad(); stopSprint(); callbacks.current.onClear();
  }, [stopPad, stopSprint]);

  useEffect(() => { clear(); }, [props.disabled, props.inCar, props.aiming, props.forced, clear]);
  useEffect(() => {
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear);
    window.addEventListener('resize', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', clear);
      window.removeEventListener('resize', clear);
      document.removeEventListener('visibilitychange', visibility);
      clear();
    };
  }, [clear]);

  const updatePad = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== padPointer.current || callbacks.current.disabled) return;
    event.preventDefault(); event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const next = padDirection(event.clientX - rect.left - rect.width / 2, event.clientY - rect.top - rect.height / 2, rect.width);
    if (next.x === direction.current.x && next.y === direction.current.y) return;
    direction.current = next; setActive(next);
    callbacks.current.onInput(event.pointerId, directionKeys(next));
  };
  const endPad = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId === padPointer.current) stopPad();
  };
  const endSprint = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerId === sprintPointer.current) stopSprint();
  };
  const keyHold = (event: KeyboardEvent, id: number, codes: readonly string[], down: boolean) => {
    if (event.code !== 'Space' && event.code !== 'Enter') return;
    event.preventDefault(); event.stopPropagation();
    if (!callbacks.current.disabled) callbacks.current.onInput(id, down ? codes : []);
  };

  return <div className={`touch-controls ${props.forced ? 'force-visible' : ''}`} onContextMenu={event => event.preventDefault()}>
    <div className="d-pad" ref={pad} role="group" aria-label="Riktningskontroll"
      onPointerDown={event => {
        event.preventDefault(); event.stopPropagation();
        if (props.disabled || event.button !== 0 || padPointer.current !== null) return;
        padPointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updatePad(event);
      }}
      onPointerMove={updatePad} onPointerUp={endPad} onPointerCancel={endPad} onLostPointerCapture={endPad}>
      {arrows.map(({ name, label, code, icon: Icon, x, y }, index) => <button key={name} type="button"
        className={`pad-${name}`} disabled={props.disabled} aria-label={`Rör dig ${label}`}
        aria-pressed={!!((x && active.x === x) || (y && active.y === y))}
        onKeyDown={event => keyHold(event, -index - 1, [code], true)}
        onKeyUp={event => keyHold(event, -index - 1, [code], false)}
        onBlur={() => callbacks.current.onInput(-index - 1, [])}><Icon size={20} /></button>)}
      <span className="pad-centre" aria-hidden="true" />
    </div>
    <div className="touch-actions">
      <button ref={sprint} type="button" className="touch-sprint" disabled={props.disabled} aria-pressed={sprinting}
        aria-label={props.inCar ? 'Håll för att bromsa' : 'Håll för att springa'}
        onPointerDown={event => {
          event.preventDefault(); event.stopPropagation();
          if (props.disabled || event.button !== 0 || sprintPointer.current !== null) return;
          sprintPointer.current = event.pointerId; setSprinting(true);
          event.currentTarget.setPointerCapture(event.pointerId);
          props.onInput(event.pointerId, [props.inCar ? 'Space' : 'ShiftLeft']);
        }}
        onPointerUp={endSprint} onPointerCancel={endSprint} onLostPointerCapture={endSprint}
        onKeyDown={event => keyHold(event, -5, [props.inCar ? 'Space' : 'ShiftLeft'], true)}
        onKeyUp={event => keyHold(event, -5, [props.inCar ? 'Space' : 'ShiftLeft'], false)}
        onBlur={() => callbacks.current.onInput(-5, [])}>
        <Footprints size={18} /><small>{props.inCar ? 'Bromsa' : 'Spring'}</small>
      </button>
      <button type="button" disabled={props.disabled} onClick={props.onInteract}>E<small>{props.inCar ? 'Kliv ur' : props.aiming ? 'Sänk' : 'Använd'}</small></button>
      <button type="button" className={props.aiming ? 'touch-fire-button' : ''}
        disabled={props.disabled || (props.aiming && !props.canShoot)}
        aria-label={props.aiming ? 'Skjut med F' : props.inCar ? 'Tuta' : 'Slå'}
        onClick={props.onAction}>F<small>{props.aiming ? 'Skjut' : props.inCar ? 'Tuta' : 'Slå'}</small></button>
    </div>
  </div>;
}
