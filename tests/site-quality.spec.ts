import { test, expect, type Page } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

interface SearchPost {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
}

const articleURL = '/posts/mimo-code-ai-coding-agent.md/';
const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

async function publishedPosts(page: Page): Promise<SearchPost[]> {
  const response = await page.request.get('/api/search-index.json');
  expect(response.status()).toBe(200);
  const posts = await response.json() as SearchPost[];
  expect(posts.length).toBeGreaterThan(0);
  expect(new Set(posts.map(post => post.slug)).size).toBe(posts.length);
  return posts;
}

async function expectTagBounds(page: Page) {
  const tags = page.locator('main a[href^="/tags/"]');
  expect(await tags.count()).toBeGreaterThan(0);
  // 只检查标签的盒子和文本行，不遍历 pre/code 的内部滚动内容。
  const violations = await tags.evaluateAll(elements => elements.flatMap(element => {
    const box = element.getBoundingClientRect();
    const article = element.closest('article')!.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(element);
    const textOutside = [...range.getClientRects()].some(rect =>
      rect.left < box.left - 1 || rect.right > box.right + 1
    );
    const outside = box.left < article.left - 1 || box.right > article.right + 1 ||
      box.left < -1 || box.right > document.documentElement.clientWidth + 1;
    return outside || textOutside ? [element.textContent] : [];
  }));
  expect(violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
}

for (const width of [390, 1280]) {
  test(`${width}px 首页和文章标签保持在内容边界内`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expectTagBounds(page);
    await page.goto(articleURL);
    await expectTagBounds(page);
    // 覆盖未来新增的超长标签；不改源文章或生成文件。
    await page.locator('article header a[href^="/tags/"]').first().evaluate(element => {
      element.textContent = `#${'very-long-tag-'.repeat(30)}`;
    });
    await expectTagBounds(page);
  });
}

test('每篇公开文章具有专属 SEO 摘要、ISO 日期及可访问的 OG 图', async ({ page }) => {
  test.setTimeout(120_000);
  const posts = await publishedPosts(page);
  const checkedImages = new Set<string>();
  for (const post of posts) {
    await test.step(post.slug, async () => {
      const response = await page.goto(`/posts/${encodeURIComponent(post.slug)}/`);
      expect(response?.status()).toBe(200);
      const description = post.description || `${post.title}，书山有路技术笔记。`;
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', description);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', description);
      await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute('content', description);
      expect(description.trim().length).toBeGreaterThan(0);
      expect(post.date).toMatch(isoDate);
      expect(new Date(post.date).toISOString()).toBe(post.date);
      await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute('content', post.date);
      const image = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(image).toBeTruthy();
      const imageURL = new URL(image!);
      expect(imageURL.protocol).toBe('https:');
      // 社交元数据使用生产绝对 URL；资源请求改为本地路径，以验证本次工作树的产物。
      if (!checkedImages.has(imageURL.href)) {
        const resource = await page.request.get(`${imageURL.pathname}${imageURL.search}`);
        expect(resource.status()).toBe(200);
        expect(resource.headers()['content-type']).toMatch(/^image\//);
        checkedImages.add(imageURL.href);
      }
    });
  }
});

test('RSS 和 sitemap 是合法 XML，URL 唯一、日期有效、分类齐全且不暴露 dev', async ({ page }) => {
  const posts = await publishedPosts(page);
  await page.goto('/');
  const rssResponse = await page.request.get('/rss.xml');
  const sitemapResponse = await page.request.get('/sitemap.xml');
  expect(rssResponse.status()).toBe(200);
  expect(sitemapResponse.status()).toBe(200);
  const parsed = await page.evaluate(({ rss, sitemap }) => {
    const parser = new DOMParser();
    const feed = parser.parseFromString(rss, 'application/xml');
    const map = parser.parseFromString(sitemap, 'application/xml');
    const text = (element: Element, selector: string) => element.querySelector(selector)?.textContent?.trim() || '';
    return {
      errors: [feed, map].flatMap(doc => [...doc.querySelectorAll('parsererror')].map(error => error.textContent)),
      rssRoot: feed.documentElement.localName,
      sitemapRoot: map.documentElement.localName,
      namespace: map.documentElement.namespaceURI,
      items: [...feed.querySelectorAll('item')].map(item => ({
        title: text(item, 'title'), link: text(item, 'link'), guid: text(item, 'guid'),
        date: text(item, 'pubDate'), tags: [...item.querySelectorAll('category')].map(tag => tag.textContent || '')
      })),
      urls: [...map.querySelectorAll('url')].map(url => ({ loc: text(url, 'loc'), date: text(url, 'lastmod') }))
    };
  }, { rss: await rssResponse.text(), sitemap: await sitemapResponse.text() });
  expect(parsed.errors).toEqual([]);
  expect(parsed.rssRoot).toBe('rss');
  expect(parsed.sitemapRoot).toBe('urlset');
  expect(parsed.namespace).toBe('http://www.sitemaps.org/schemas/sitemap/0.9');
  expect(parsed.items).toHaveLength(posts.length);
  const feedURLs = parsed.items.map(item => item.link);
  const sitemapURLs = parsed.urls.map(url => url.loc);
  expect(new Set(feedURLs).size).toBe(feedURLs.length);
  expect(new Set(sitemapURLs).size).toBe(sitemapURLs.length);
  for (const value of [...feedURLs, ...sitemapURLs]) {
    const url = new URL(value);
    expect(url.origin).toBe('https://fblog.younote.top');
    expect(decodeURIComponent(url.pathname)).not.toMatch(/^\/dev(?:\/|$)/);
  }
  for (const post of posts) {
    const path = `/posts/${post.slug}/`;
    const item = parsed.items.find(item => decodeURIComponent(new URL(item.link).pathname) === path);
    expect(item, post.slug).toBeTruthy();
    expect(item!.title).toBe(post.title);
    expect(item!.guid).toBe(item!.link);
    expect(item!.tags).toEqual(post.tags);
    // RSS 2.0 pubDate 是 RFC 822，而不是 ISO；与索引中的 ISO 日期逐一比较。
    expect(new Date(item!.date).toISOString()).toBe(post.date);
    const entry = parsed.urls.find(url => decodeURIComponent(new URL(url.loc).pathname) === path);
    expect(entry?.date).toMatch(isoDate);
    expect(entry?.date).toBe(post.date);
  }
  for (const entry of parsed.urls.filter(entry => entry.date)) {
    expect(entry.date).toMatch(isoDate);
    expect(new Date(entry.date).toISOString()).toBe(entry.date);
  }
  const categoryPaths = await page.locator('main a[href^="/categories/"]').evaluateAll(elements =>
    [...new Set(elements.map(element => (element as HTMLAnchorElement).pathname))]
  );
  expect(categoryPaths.length).toBeGreaterThan(0);
  const paths = sitemapURLs.map(url => decodeURIComponent(new URL(url).pathname));
  for (const path of categoryPaths) expect(paths).toContain(decodeURIComponent(path));
});

test('搜索首次打开才加载，加载中输入保留且重复打开不重复请求', async ({ page }) => {
  const requested = gate();
  const responseGate = gate();
  let requests = 0;
  await page.route('**/api/search-index.json', async route => {
    requests++;
    requested.release();
    await responseGate.promise;
    await route.fulfill({ json: [{ slug: 'gate.md', title: 'gate result', description: '', tags: [] }] });
  });
  try {
    await page.goto('/');
    await expect(page.locator('#search-btn')).toBeVisible();
    expect(requests).toBe(0);
    await page.locator('#search-btn').click();
    await requested.promise;
    await expect(page.locator('#search-status')).toBeVisible();
    await expect(page.locator('#search-results')).toHaveAttribute('aria-busy', 'true');
    await page.locator('#search-input').fill('gate');
    await page.keyboard.press('Escape');
    await expect(page.locator('#search-btn')).toBeFocused();
    await page.locator('#search-btn').click();
    await page.locator('#search-input').fill('gate');
    expect(requests).toBe(1);
    responseGate.release();
    await expect(page.locator('#search-results a')).toHaveText('gate result');
    await expect(page.locator('#search-status')).toBeHidden();
    await page.keyboard.press('Escape');
    await page.locator('#search-btn').click();
    await expect(page.locator('#search-input')).toBeFocused();
    expect(requests).toBe(1);
  } finally {
    responseGate.release();
  }
});

test('搜索失败可重试，恶意 HTML 按文本显示，原生弹窗约束焦点并支持 Esc 回焦', async ({ page }) => {
  const retryRequested = gate();
  const retryResponse = gate();
  const payload = '<img src=x onerror="window.__searchXss=1">';
  let requests = 0;
  await page.route('**/api/search-index.json', async route => {
    if (++requests === 1) {
      await route.fulfill({ status: 503, body: 'unavailable' });
      return;
    }
    retryRequested.release();
    await retryResponse.promise;
    await route.fulfill({ json: [{ slug: 'safe.md', title: payload, description: payload, tags: [payload] }] });
  });
  try {
    await page.goto('/');
    const modal = page.locator('#search-modal');
    const input = page.locator('#search-input');
    await page.locator('#search-btn').click();
    await expect(input).toBeFocused();
    await expect(page.locator('#search-error')).toBeVisible();
    await page.locator('#search-retry').click();
    await retryRequested.promise;
    await expect(page.locator('#search-status')).toBeVisible();
    await input.fill('img');
    retryResponse.release();
    const result = page.locator('#search-results a');
    await expect(result.locator('h3')).toHaveText(payload);
    await expect(result.locator('p')).toHaveText(payload);
    await expect(result.locator('span')).toHaveText(`#${payload}`);
    await expect(result.locator('img, script, iframe, [onerror]')).toHaveCount(0);
    expect(await page.evaluate(() => Reflect.get(window, '__searchXss'))).toBeUndefined();
    expect(requests).toBe(2);
    expect(await modal.evaluate(element => element instanceof HTMLDialogElement && element.matches(':modal'))).toBe(true);
    await input.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(result).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
    await expect(page.locator('#search-btn')).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  } finally {
    retryResponse.release();
  }
});

test('目录从 390px 折叠状态切换至 1280px 后桌面目录可见', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(articleURL);
  const mobile = page.locator('.toc').first();
  await expect(mobile.locator('.toc-toggle')).toBeVisible();
  await expect(mobile.locator('.toc-list')).toBeHidden();
  await mobile.locator('.toc-toggle').click();
  await expect(mobile.locator('.toc-list')).toBeVisible();
  await mobile.locator('.toc-toggle').click();
  await expect(mobile.locator('.toc-list')).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('aside .toc-list')).toBeVisible();
  expect(await page.locator('aside .toc-list a').count()).toBeGreaterThan(0);
});

test('关闭的手机菜单保持 inert，打开后可聚焦，Esc 及桌面切换重新关闭', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const button = page.locator('#mobile-menu-btn');
  const menu = page.locator('#mobile-menu');
  const link = menu.locator('a').first();
  await expect(menu).toHaveJSProperty('inert', true);
  await link.evaluate(element => (element as HTMLElement).focus());
  await expect(link).not.toBeFocused();
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(menu).toHaveJSProperty('inert', false);
  await link.focus();
  await expect(link).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveJSProperty('inert', true);
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(button).toBeFocused();
  await button.click();
  await button.click();
  await expect(menu).toHaveJSProperty('inert', true);
  await button.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(menu).toHaveJSProperty('inert', true);
});

test('图表通过键盘打开原生 dialog，缩放和 Esc 关闭后回焦', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const diagram = document.createElement('div');
    diagram.id = 'test-diagram';
    diagram.className = 'mermaid';
    diagram.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><rect width="120" height="60" fill="blue" /></svg>';
    document.querySelector('main')!.prepend(diagram);
    document.dispatchEvent(new Event('mermaid-rendered'));
  });
  const trigger = page.locator('#test-diagram');
  await expect(trigger).toHaveAttribute('role', 'button');
  await expect(trigger).toHaveAttribute('tabindex', '0');
  await trigger.focus();
  await page.keyboard.press('Enter');
  const modal = page.locator('#zoom-modal');
  await expect(modal).toBeVisible();
  expect(await modal.evaluate(element => element.matches(':modal'))).toBe(true);
  await expect(modal.locator('.zoom-modal-close')).toBeFocused();
  await page.keyboard.press('+');
  await expect(page.locator('#zoom-level')).toHaveText('120%');
  await page.keyboard.press('0');
  await expect(page.locator('#zoom-level')).toHaveText('100%');
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('可选：生产产物不输出草稿页面，RSS 和搜索索引不包含草稿', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dist = `${root}dist/`;
  test.skip(!existsSync(`${dist}rss.xml`) || !existsSync(`${dist}api/search-index.json`), '没有完整 dist；请先 pnpm build 后再校验生产草稿过滤。');
  const content = `${root}src/content/posts/`;
  const drafts = readdirSync(content).filter(name => /\.md$/.test(name)).filter(name => {
    const source = readFileSync(`${content}${name}`, 'utf8');
    const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return !!frontmatter && /^draft:\s*true\s*(?:#.*)?$/m.test(frontmatter[1]);
  });
  const rss = readFileSync(`${dist}rss.xml`, 'utf8');
  const index = JSON.parse(readFileSync(`${dist}api/search-index.json`, 'utf8')) as SearchPost[];
  for (const slug of drafts) {
    expect(existsSync(`${dist}posts/${slug}/index.html`), slug).toBe(false);
    expect(index.some(post => post.slug === slug), slug).toBe(false);
    expect(rss).not.toContain(`/posts/${encodeURIComponent(slug)}/`);
  }
});
