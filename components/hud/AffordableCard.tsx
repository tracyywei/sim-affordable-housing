// Owner: Agent E. "What 'affordable' means here" + a $0–$150K income bar with the qualifying band and a persona tick.
import { affordableMeansCard, chrome, fmtK, fmtMoney, statusLabel } from '@/lib/copy';
import type { AffordableCardProps, Status } from '@/lib/types';

const STATUS_VAR: Record<Status, string> = {
  too_much: 'var(--too-much)', too_little: 'var(--too-little)', qualifies: 'var(--qualifies)',
};
const W = 272, PAD = 8, BAR_Y = 26, BAR_H = 12;

export default function AffordableCard({ meta, persona }: AffordableCardProps) {
  const card = affordableMeansCard(meta);
  const hi = Math.max(150000, Math.ceil(Math.max(persona?.income ?? 0, persona?.limit ?? 0) / 50000) * 50000);
  const x = (v: number) => PAD + (Math.max(0, Math.min(hi, v)) / hi) * (W - 2 * PAD);
  const ticks = Array.from({ length: hi / 50000 + 1 }, (_, i) => i * 50000);

  return (
    <section className="hud-card afford-card" data-hud="affordable-means">
      <h2 className="hud-label">{card.title}</h2>
      {card.sentences.map((segs, i) => (
        <p key={i}>{segs.map((g, j) => (g.bold ? <strong key={j}>{g.text}</strong> : <span key={j}>{g.text}</span>))}</p>
      ))}
      {persona && (
        <figure className="income-bar" style={{ margin: 0 }} aria-label={chrome.incomeBarLabel}>
          <figcaption className="sr-only">
            {`${persona.persona}: ${fmtMoney(persona.income)} · ${statusLabel(persona.status)} · ${fmtMoney(persona.floor)}–${fmtMoney(persona.limit)}`}
          </figcaption>
          <svg viewBox={`0 0 ${W} 66`} aria-hidden="true">
            <rect x={PAD} y={BAR_Y} width={W - 2 * PAD} height={BAR_H} rx={4} fill="#fff" stroke="var(--ink)" strokeWidth={1.5} />
            <rect x={x(persona.floor)} y={BAR_Y + 2} width={Math.max(2, x(persona.limit) - x(persona.floor))} height={BAR_H - 4} rx={2} fill="var(--qualifies)" />
            {ticks.map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={BAR_Y + BAR_H} y2={BAR_Y + BAR_H + 4} stroke="var(--ink)" />
                <text x={x(t)} y={BAR_Y + BAR_H + 15} textAnchor={t === 0 ? 'start' : t === hi ? 'end' : 'middle'}>{fmtK(t)}</text>
              </g>
            ))}
            <text x={(x(persona.floor) + x(persona.limit)) / 2} y={BAR_Y + BAR_H + 26} textAnchor="middle">{statusLabel('qualifies')}</text>
            <g transform={`translate(${x(persona.income)},0)`} data-hud="persona-tick">
              <line y1={BAR_Y - 6} y2={BAR_Y + BAR_H + 2} stroke={STATUS_VAR[persona.status]} strokeWidth={3} strokeLinecap="round" />
              <path d={`M-5 ${BAR_Y - 11} L5 ${BAR_Y - 11} L0 ${BAR_Y - 5} Z`} fill={STATUS_VAR[persona.status]} stroke="var(--ink)" strokeWidth={1} />
              <text className="tick-label" y={BAR_Y - 14} textAnchor={x(persona.income) < 40 ? 'start' : x(persona.income) > W - 40 ? 'end' : 'middle'}>
                {`${persona.persona} ${fmtK(persona.income)}`}
              </text>
            </g>
          </svg>
        </figure>
      )}
    </section>
  );
}
