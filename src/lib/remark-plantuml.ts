// src/lib/remark-plantuml.ts
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import plantumlEncoder from 'plantuml-encoder';

const PLANTUML_SVG_URL = 'https://www.plantuml.com/plantuml/svg/';

function encodePlantUml(code: string): string {
  const encoded = plantumlEncoder.encode(code);
  return `${PLANTUML_SVG_URL}${encoded}`;
}

export default function remarkPlantUml(): Plugin<void[], Root> {
  return function (tree: any) {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type === 'code' && node.lang === 'plantuml') {
        const svgUrl = encodePlantUml(node.value || '');
        tree.children[i] = {
          type: 'html',
          value: `<div class="plantuml-img not-prose"><img src="${svgUrl}" alt="PlantUML Diagram" class="max-w-full h-auto" loading="lazy" /></div>`
        };
      }
    }
  };
}
