// src/lib/reading-time.ts

/**
 * 计算阅读时间（中文按字符数，英文按单词数）
 * @param content 文章内容
 * @param wordsPerMinute 阅读速度（默认 300 字/分钟）
 */
export function calculateReadingTime(content: string, wordsPerMinute = 300): number {
  // 统计中文字符数
  const chineseChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;

  // 统计英文单词数
  const englishWords = (content.match(/[a-zA-Z]+/g) || []).length;

  // 代码块按行数计算（权重 0.5）
  const codeLines = (content.match(/```[\s\S]*?```/g) || [])
    .reduce((acc, block) => acc + block.split('\n').length, 0);

  const totalWords = chineseChars + englishWords + Math.floor(codeLines * 0.5);

  return Math.ceil(totalWords / wordsPerMinute);
}