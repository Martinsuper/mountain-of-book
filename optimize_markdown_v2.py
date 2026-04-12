#!/usr/bin/env python3
"""
Markdown文档排版优化脚本 - 增强版
"""

import re

def optimize_markdown_v2(content):
    """增强版markdown优化"""
    lines = content.split('\n')
    result = []

    # 跟踪当前章节上下文
    current_section = None
    section_stack = []

    # 定义标题层级映射
    heading_patterns = {
        '##': [  # 一级章节
            r'^DeepSeek[是什么|可以做什么|如何使用|如何从入门到精通]',
            r'^(提示语|AIGC|设计|策略|类型|本质|体系|DNA|秘籍|陷阱|误区|检查清单|缺陷|幻觉|评测|项目|平台|创新|火花|思维|链|框架|机制|策略|优化|叙事|文案|营销|策划|品牌|总结|玩转|公众号|选题|创作|论述|需求|表达|任务|决策|分析|执行|还要不要学|避免误区|从.*到.*|掌握|挖掘|融合|行动|创想|整合|跨域|元叙事|文案|营销|策划|品牌|年终|玩转|平台|选题|创作|标题|内容|论述|逻辑|证据|分析|需求|示例|步骤|关键|考量|陷阱|应对|避免]',
            r'^(语用意图分析|主题聚焦机制|细节增强策略|跨域映射机制|概念嫁接策略|知识转移技术|随机组合机制|极端假设策略|多重约束策略|语体模拟机制|情感融入策略|修辞技巧应用|语言风格优化)',
        ],
        '###': [  # 二级章节/功能模块
            r'^(文本生成|文本创作|摘要与改写|结构化生成|自然语言理解与分析|编程与代码相关|常规绘图|知识推理|推理模型|通用模型|模型选择|提示语设计|决策需求|分析需求|创造性需求|验证性需求|执行需求|实战技巧|从"下达指令"到"表达需求"|任务需求与提示语策略|如何向AI表达需求|提示语示例|性能对齐|关键原则|避免误区|提示语类型|提示语的本质|SPECTRA任务分解模型|思维拓展的认知理论基础|发散思维的提示语链设计|聚合思维的提示语链设计|跨界思维的提示语链设计|深度融合|即学即用|需要注意的因素|整体提示语链设计框架|执行技巧与注意事项|成果展示与改进建议|理论层面|方法层面|SVG矢量图|Mermaid图表|React图表|代码生成|代码调试|技术文档处理)',
        ],
        '####': [  # 三级子章节
            r'^(语义分析|文本分类|逻辑问题解答|因果分析|AI缺陷|臆造之辞|形成原因|AI幻觉|五类|七特|两项国家级项目|大模型多学科自动化测评平台|构建项目|设计思路和方法|IDEA框架|FOCUS框架|BRIDGE框架|逻辑链优化策略|知识链优化策略|创意链优化策略|主题原型|语义框架|重点梯度|主题引导符|理论基础|实施步骤|应用示例|操作方法|PIA的理论基础|PIA实施步骤|TFM的理论基础|TFM实施步骤|DES的理论基础|DES实施步骤|CMM的理论基础|CMM实施步骤|CGS的理论基础|CGS实施步骤|KTT的理论基础|KTT实施步骤|RCM的理论基础|RCM实施步骤|EHS的理论基础|EHS实施步骤|MCS的理论基础|MCS实施步骤|RSM的理论基础|RSM实施步骤|EIS的理论基础|EIS实施步骤|RTA的理论基础|RTA实施步骤|逻辑链优化|知识链优化|创意链优化|三链融合的动态优化系统|嵌入式自反提示|递归元叙事提示|多重人格提示|读者互动元叙事提示|风格模拟提示|信息传递|设计清晰精准的信息框架提示语|情感共鸣|设计触发情感反应的提示语|行动引导|设计促进决策和行动的提示语|创意概念|设计激发创新思维的提示语|传播策略|设计精准定位的传播方案提示语|执行方案|设计可操作的行动计划提示语|品牌定位|在市场中找到独特位置|价值主张|传递独特的品牌价值|未来愿景|描绘品牌的长远目标|平台特性与算法机制|选题规划提示语|创作引导提示语|标题创作的提示设计|内容结构的提示设计|论述逻辑的提示设计|证据链完整|逻辑递进|多维视角|设定论证框架|控制论证深度|规定证据要求)',
        ]
    }

    # 预编译正则
    compiled_patterns = {}
    for level, patterns in heading_patterns.items():
        compiled_patterns[level] = [re.compile(pattern) for pattern in patterns]

    # 确定标题级别
    def determine_heading_level(text):
        # 如果包含"是什么"、"可以做什么"等，通常是二级
        for pattern in compiled_patterns['##']:
            if pattern.search(text):
                return '##'
        # 检查是否是功能模块
        for pattern in compiled_patterns['###']:
            if pattern.search(text):
                return '###'
        # 检查是否是子小节
        for pattern in compiled_patterns['####']:
            if pattern.search(text):
                return '####'
        # 默认为三级
        return '###'

    for i, line in enumerate(lines):
        original_line = line

        # 处理标题
        if line.startswith('# '):
            title_text = line[2:].strip()
            level = determine_heading_level(title_text)
            line = level + ' ' + title_text

        # 处理原二级标题 -> 保留三级
        elif line.startswith('## '):
            title_text = line[3:].strip()
            # 如果不是主标题，降为三级
            if '从入门到精通' in title_text:
                line = '# ' + title_text
            else:
                # 检查是否应该是四级
                level = determine_heading_level(title_text)
                if level == '####':
                    line = '#### ' + title_text
                else:
                    line = '### ' + title_text

        # 处理原三级标题
        elif line.startswith('### '):
            title_text = line[4:].strip()
            level = determine_heading_level(title_text)
            if level == '####':
                line = '#### ' + title_text
            else:
                line = '### ' + title_text

        # 处理列表符号
        elif line.strip().startswith('•') or line.strip().startswith('·'):
            indent = len(line) - len(line.lstrip())
            content_text = line.strip()[1:].strip()
            line = ' ' * indent + '- ' + content_text

        # 处理 + 符号列表
        elif re.match(r'^\s*\+\s*$', line):
            # 单独的 + 行，跳过
            continue
        elif re.match(r'^\s*\+\s*[^+]', line):
            # + 开头的列表项
            indent = len(line) - len(line.lstrip())
            content_text = re.sub(r'^\s*\+\s*', '', line).strip()
            line = ' ' * indent + '- ' + content_text

        result.append(line)

    # 后处理：优化空行和间距
    final = []
    prev_type = None  # 'heading', 'blank', 'list', 'text', 'image'

    for i, line in enumerate(result):
        line_stripped = line.strip()
        is_heading = line.startswith('#') and (line.startswith('# ') or line.startswith('## ') or line.startswith('### ') or line.startswith('#### '))
        is_blank = line_stripped == ''
        is_image = line_stripped.startswith('![image](')
        is_list = line_stripped.startswith('- ')
        is_text = not is_blank and not is_heading and not is_image and not is_list

        # 1. 标题后确保有空行（除非下一个内容就是空白）
        if is_heading:
            final.append(line)
            prev_type = 'heading'
            # 如果下一行不是空行且不是标题，添加空行
            if i + 1 < len(result):
                next_line = result[i+1]
                if next_line.strip() != '' and not next_line.startswith('#'):
                    final.append('')
                    prev_type = 'blank'
            continue

        # 2. 图片前后添加空行
        if is_image:
            if prev_type not in ['blank', 'heading']:
                final.append('')
            final.append(line)
            prev_type = 'image'
            # 图片后通常加空行
            if i + 1 < len(result):
                next_line = result[i+1]
                if next_line.strip() != '':
                    final.append('')
                    prev_type = 'blank'
            continue

        # 3. 列表项：连续列表之间不需要空行，但列表结束后需要空行
        if is_list:
            final.append(line)
            prev_type = 'list'
            continue

        # 4. 段落文本：确保与前后内容有空行
        if is_text:
            if prev_type not in ['blank', 'heading']:
                final.append('')
            if line_stripped:
                final.append(line)
                prev_type = 'text'
            continue

        # 5. 空白行：保留但避免连续多个空行
        if is_blank:
            if prev_type != 'blank':
                final.append('')
                prev_type = 'blank'
            continue

    # 清理开始和结束的空行
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

    optimized = optimize_markdown_v2(content)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(optimized)

    print(f'✅ 优化完成！已保存到: {output_file}')
    print(f'📊 原文件行数: {len(content.splitlines())}')
    print(f'📊 优化后行数: {len(optimized.splitlines())}')
    print(f'📈 标题层级已规范化，列表符号已统一，段落间距已优化')

if __name__ == '__main__':
    main()
