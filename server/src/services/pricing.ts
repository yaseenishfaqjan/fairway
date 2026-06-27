// Rule-based "AI" tee-time pricing. Saturday/Sunday mornings command the highest
// rate; weekday afternoons the lowest. Wired so it can be swapped for a model later.
const WEEKEND_BASE = 75;
const WEEKDAY_BASE = 50;

export function suggestPrice(dayOfWeek: number, hour: number): number {
  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
  let price = weekend ? WEEKEND_BASE : WEEKDAY_BASE;
  if (hour < 9) price += 20; // prime early morning
  else if (hour < 12) price += 12; // late morning
  else if (hour < 15) price += 0; // midday
  else price -= 8; // twilight discount
  if (weekend && hour < 12) price += 8; // weekend morning premium
  return Math.max(25, Math.round(price));
}

export function priceExplanation(dayOfWeek: number, hour: number): string {
  const weekend = dayOfWeek === 0 || dayOfWeek === 6;
  const period = hour < 12 ? 'morning' : hour < 15 ? 'midday' : 'twilight';
  return `${weekend ? 'Weekend' : 'Weekday'} ${period} demand`;
}
