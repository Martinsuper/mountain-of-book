// src/lib/plantuml.ts
import plantumlEncoder from 'plantuml-encoder';

/** Encode PlantUML source into the shared SVG rendering service URL (not encryption). */
export function encodePlantUml(code: string): string {
  const encoded = plantumlEncoder.encode(code);
  return `https://www.plantuml.com/plantuml/svg/${encoded}`;
}
