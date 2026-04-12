// src/lib/plantuml.ts
import plantumlEncoder from 'plantuml-encoder';

export function encodePlantUml(code: string): string {
  const encoded = plantumlEncoder.encode(code);
  return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}
