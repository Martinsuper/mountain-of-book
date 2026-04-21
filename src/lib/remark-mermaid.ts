// src/lib/remark-mermaid.ts
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

export default function remarkMermaid(): Plugin<void[], Root> {
  return function (tree: any) {
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];

      if (node.type === 'code' && node.lang === 'mermaid') {
        const mermaidCode = node.value || '';

        // 替换为 html 节点,包含特殊的 class 和 data 属性
        tree.children[i] = {
          type: 'html',
          value: `<pre class="mermaid">${mermaidCode}</pre>`
        };
      }
    }
  };
}