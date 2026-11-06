// Owner: Agent E. "Meet: Linh · Rosa · Ana · Priya" — each chip flies the camera to her.
import { PERSONA_NAMES, type PersonaChipsProps } from '@/lib/types';
import { ui } from './text';

export default function PersonaChips({ personas, onPersona }: PersonaChipsProps) {
  const names = PERSONA_NAMES.filter((n) => personas[n]);
  return (
    <div className="chips" role="group" aria-labelledby="chips-label" data-hud="persona-chips">
      <span id="chips-label">{ui('meet')}</span>
      {names.map((n) => (
        <button key={n} type="button" className="pill chip" onClick={() => onPersona(n)} data-persona={n}>{personas[n].persona}</button>
      ))}
    </div>
  );
}
