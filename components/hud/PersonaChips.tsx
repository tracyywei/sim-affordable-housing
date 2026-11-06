// Owner: Agent E. Persona chips — each flies the camera to her.
import { chrome } from '@/lib/copy';
import { PERSONA_NAMES, type PersonaChipsProps } from '@/lib/types';

export default function PersonaChips({ personas, onPersona }: PersonaChipsProps) {
  const names = PERSONA_NAMES.filter((n) => personas[n]);
  return (
    <div className="chips" role="group" aria-labelledby="chips-label" data-hud="persona-chips">
      <span id="chips-label">{chrome.meet}</span>
      {names.map((n) => (
        <button key={n} type="button" className="chip" onClick={() => onPersona(n)} data-persona={n}>{personas[n].persona}</button>
      ))}
    </div>
  );
}
