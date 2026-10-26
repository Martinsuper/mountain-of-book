import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import { encodePlantUml } from './plantuml';

/** Render cloud Markdown safely and load PlantUML diagrams automatically. */
export function renderCloudMarkdown(markdown: string): DocumentFragment {
  const diagrams: string[] = [];
  const marker = `plantuml-${crypto.randomUUID()}`;
  const parser = new Marked({ renderer: {
    code(token) {
      if (token.lang?.trim().split(/\s+/)[0].toLowerCase() !== 'plantuml') return false;
      diagrams.push(token.text);
      return `<pre class="${marker}"><code></code></pre>`;
    },
  } });
  // Never allow arbitrary Markdown images, embeds, or raw SVG to contact external services.
  const fragment = DOMPurify.sanitize(parser.parse(markdown, { async: false }), {
    ALLOWED_TAGS: ['p','br','h1','h2','h3','h4','h5','h6','ul','ol','li','strong','em','del','blockquote','pre','code','hr','table','thead','tbody','tr','th','td','a'],
    ALLOWED_ATTR: ['href','title','class'], ALLOW_DATA_ATTR: false, RETURN_DOM_FRAGMENT: true,
  });
  fragment.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!/^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(href)) link.removeAttribute('href');
    link.rel = 'noreferrer noopener'; link.referrerPolicy = 'no-referrer';
  });
  const placeholders = [...fragment.querySelectorAll(`pre.${marker}`)];
  // Raw HTML must not opt itself into diagram/zoom behavior through a CSS class.
  fragment.querySelectorAll('[class]').forEach(element => element.removeAttribute('class'));
  placeholders.forEach((placeholder, index) => {
    const code = diagrams[index];
    const container = document.createElement('div');
    container.className = 'not-prose my-6';
    const source = document.createElement('pre');
    const sourceCode = document.createElement('code');
    sourceCode.textContent = code; source.append(sourceCode);
    const load = () => {
      const image = document.createElement('img');
      image.alt = 'PlantUML Diagram'; image.loading = 'lazy';
      image.className = 'max-w-full h-auto'; image.referrerPolicy = 'no-referrer';
      const diagram = document.createElement('div'); diagram.className = 'plantuml-img not-prose';
      image.addEventListener('error', () => {
        diagram.replaceWith(source);
        const message = document.createElement('p'); message.textContent = 'PlantUML 图表加载失败，已显示源码。';
        container.prepend(message);
      }, { once: true });
      image.src = encodePlantUml(code);
      diagram.append(image); container.replaceChildren(diagram);
      document.dispatchEvent(new Event('article:rendered'));
    };
    placeholder.replaceWith(container);
    load();
  });
  return fragment;
}
