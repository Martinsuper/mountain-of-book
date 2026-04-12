#!/usr/bin/env python3
"""
Markdown文档排版优化脚本 - 最终版
采用简单有效的规则：统一标题层级和列表格式，优化空行间距
"""

def optimize_markdown(content):
    """优化markdown文档"""
    lines = content.split('\n')
    result = []

    # 定义二级章节标题（这些应该保持为二级）
    h2_titles = {
        'DeepSeek是什么？',
        'Deepseek可以做什么？',
        '如何使用DeepSeek？',
        '如何从入门到精通？',
        '性能对齐OpenAI-o1正式版',
        'AI \\+ 国产 \\+ 免费 \\+ 开源 \\+ 强大',
    }

    for i, line in enumerate(lines):
        original = line
        stripped = line.strip()

        # 1. 标题处理
        if line.startswith('# '):
            title = line[2:].strip()

            # 主标题检查
            if '从入门到精通' in title and 'DeepSeek' in title and len([h for h in ['是什么', '可以做什么', '如何使用', '如何从入门到精通'] if h in title]) == 0:
                line = '# ' + title
            # 是否在大章节列表中
            elif title in h2_titles:
                line = '## ' + title
            # 其他标题都降为二级（简化处理）
            else:
                line = '## ' + title

        # 2. 原二级、三级标题都降为三级
        elif line.startswith('## '):
            title = line[3:].strip()
            line = '### ' + title
        elif line.startswith('### '):
            title = line[4:].strip()
            line = '#### ' + title
        elif line.startswith('#### '):
            # 保持
            pass

        # 3. 列表符号统一
        elif stripped.startswith('•') or stripped.startswith('·'):
            indent = len(line) - len(stripped)
            content = stripped[1:].strip()
            line = ' ' * indent + '- ' + content

        # 4. + 符号列表处理
        elif stripped == '+':
            continue  # 删除单独的 + 行
        elif stripped.startswith('+'):
            indent = len(line) - len(stripped)
            content = stripped[1:].strip()
            if content:  # 确保有内容
                line = ' ' * indent + '- ' + content
            else:
                line = ''  # 空内容则删除

        result.append(line)

    # 后处理：优化空行和间距
    final = []
    prev_type = None

    for i, line in enumerate(result):
        stripped = line.strip()

        if stripped == '':
            # 避免连续空行
            if prev_type != 'blank':
                final.append('')
                prev_type = 'blank'
            continue

        # 判断行类型
        is_heading = line.startswith('#')
        is_image = stripped.startswith('![image](')
        is_list = stripped.startswith('- ')
        is_text = not is_heading and not is_image and not is_list

        # 标题：确保后有空行
        if is_heading:
            final.append(line)
            prev_type = 'heading'
            # 检查下一行是否需要空行
            if i + 1 < len(result):
                next_line = result[i+1] if i+1 < len(result) else ''
                if next_line.strip() != '' and not next_line.startswith('#'):
                    final.append('')
                    prev_type = 'blank'
            continue

        # 图片：前后加空行
        if is_image:
            if prev_type not in ['blank', 'heading']:
                final.append('')
            final.append(line)
            prev_type = 'image'
            # 图片后加空行
            if i + 1 < len(result):
                next_line = result[i+1]
                if next_line.strip() != '':
                    final.append('')
                    prev_type = 'blank'
            continue

        # 列表项：直接添加
        if is_list:
            final.append(line)
            prev_type = 'list'
            continue

        # 普通文本：确保前后有空行
        if is_text:
            if prev_type not in ['blank', 'heading']:
                final.append('')
            final.append(line)
            prev_type = 'text'
            continue

        final.append(line)
        prev_type = 'text'

    # 清理首尾空行
    while final and final[0].strip() == '':
        final.pop(0)
    while final and final[-1].strip() == '':
        final.pop()

    return '\n'.join(final)

def main():
    input_file = '/Users/duanluyao/claude-workspace/mountain-of-book/MinerU_markdown_DeepSeek从入门到精通（清华大学版）_2037877163163688960.md'
    output_file = '/Users/duanluyao/claude-workspace/mountain-of-book/MinerU_markdown_DeepSeek从入门到精通（清华大学版）_2037877163163688960_optimized.md'

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    optimized = optimize_markdown(content)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(optimized)

    print(f'✅ 优化完成！')
    print(f'📄 输入文件: {input_file}')
    print(f'📄 输出文件: {output_file}')
    print(f'📊 原行数: {len(content.splitlines())} -> 新行数: {len(optimized.splitlines())}')
    print(f'✨ 主要改进:')
    print(f'   - 统一标题层级 (#/##/###/####)')
    print(f'   - 规范列表格式 (统一使用 -)')
    print(f'   - 清理 + 符号列表')
    print(f'   - 优化段落间距和空行')
    print(f'   - 图片前后添加空行')

if __name__ == '__main__':
    main()
