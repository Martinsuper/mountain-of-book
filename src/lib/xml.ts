// XML 文本与属性统一转义，避免文章摘要中的 <、& 破坏订阅输出。
export function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, character => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;'
  })[character]!);
}
