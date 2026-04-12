#!/usr/bin/env python3
"""
Markdown文档排版优化脚本
"""

import re
import sys

def optimize_markdown(content):
    """优化markdown文档排版"""

    lines = content.split('\n')
    result = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # 处理标题层级
        if line.startswith('# '):
            # 根据内容确定标题级别
            title_text = line[2:].strip()

            # 主标题
            if '从入门到精通' in title_text and not any(x in title_text for x in ['是什么', '可以做什么', '如何使用', '如何从入门到精通']):
                result.append('# ' + title_text)
            # 一级章节标题 (包含"什么", "可以做什么", "如何使用", "如何从入门到精通", "提示语", "实战"等)
            elif any(keyword in title_text for keyword in ['是什么', '可以做什么', '如何使用', '如何从入门到精通', '提示语', '设计', '策略', '实战', '技巧', '原则', '模型', '方法', '应用', '理论', '机制', '框架', '本质', '类型', '体系', 'DNA', '秘籍', '陷阱', '误区', '检查清单', '缺陷', '幻觉', '评测', '平台', '项目', '创新', '思维', '链', 'PIA', 'TFM', 'DES', 'CMM', 'CGS', 'KTT', 'RCM', 'EHS', 'MCS', 'RSM', 'EIS', 'RTA', '优化', '叙事', '文案', '营销', '策划', '品牌', '总结', '玩转', '公众号', '选题', '创作', '标题', '内容', '论述', '逻辑', '证据', '视角', '深度', '要求', '需求', '示例', '技巧', '步骤', '关键', '考量', '常见', '应对', '避免', '从', '到', 'AIGC']):
                result.append('## ' + title_text)
            # 其他标题降为三级
            else:
                result.append('### ' + title_text)

        # 处理列表项符号
        elif line.strip().startswith('•') or line.strip().startswith('·') or (re.match(r'^\s*\d+\.', line) and len(line.strip()) < 50):
            # 将 • 和 · 替换为标准的 -
            if line.strip().startswith('•') or line.strip().startswith('·'):
                # 保持缩进
                indent = len(line) - len(line.lstrip())
                content_text = line.strip()[1:].strip()
                result.append(' ' * indent + '- ' + content_text)
            else:
                result.append(line)

        # 处理图片：添加alt文本
        elif line.strip().startswith('![image]('):
            # 为图片添加描述性alt文本
            match = re.match(r'!\[image\]\((https?://[^)]+)\)', line.strip())
            if match:
                url = match.group(1)
                # 生成基于上下文的alt文本（这里使用通用描述）
                result.append(line)  # 暂时保持原样，后续可以改进

        # 处理空行和间距
        else:
            result.append(line)

        i += 1

    # 后处理：确保标题后有空行，列表间有空行等
    final = []
    prev_was_blank = True  # 标记前一行是否为空

    for i, line in enumerate(result):
        # 检查是否是标题
        is_heading = line.startswith('#') and (line.startswith('# ') or line.startswith('## ') or line.startswith('### '))
        is_blank = line.strip() == ''
        is_image = line.strip().startswith('![image](')
        is_list = line.strip().startswith('- ')

        # 规则1：标题后必须有空行（除非已经是空行或最后一行）
        if is_heading and i + 1 < len(result) and result[i+1].strip() != '':
            final.append(line)
            final.append('')
            prev_was_blank = True
            continue

        # 规则2：图片前后添加空行（如果前后有内容）
        if is_image:
            if not prev_was_blank and final:
                final.append('')
            final.append(line)
            # 如果下一行不是空行且不是图片/标题/列表结尾，添加空行
            if i + 1 < len(result):
                next_line = result[i+1]
                if next_line.strip() != '' and not next_line.startswith('#') and not next_line.strip().startswith('- '):
                    final.append('')
                    prev_was_blank = True
                else:
                    prev_was_blank = False
            continue

        # 规则3：列表项之间不需要空行
        if is_list:
            final.append(line)
            prev_was_blank = False
            continue

        # 其他行
        final.append(line)
        prev_was_blank = is_blank

    # 输出
    return '\n'.join(final)

def main():
    input_file = '/Users/duanluyao/claude-workspace/mountain-of-book/MinerU_markdown_DeepSeek从入门到精通（清华大学版）_2037877163163688960.md'
    output_file = '/Users/duanluyao/claude-workspace/mountain-of-book/MinerU_markdown_DeepSeek从入门到精通（清华大学版）_2037877163163688960_optimized.md'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    optimized = optimize_markdown(content)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(optimized)

    print(f'优化完成！已保存到: {output_file}')

if __name__ == '__main__':
    main()
