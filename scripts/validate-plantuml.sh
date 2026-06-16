#!/bin/bash
# scripts/validate-plantuml.sh
# PlantUML 语法校验脚本（使用官方 JAR）
#
# 用法:
#   ./scripts/validate-plantuml.sh <file.puml>        # 校验文件
#   echo "..." | ./scripts/validate-plantuml.sh       # 从 stdin 读取
#   ./scripts/validate-plantuml.sh -q <file.puml>     # 静默模式
#   ./scripts/validate-plantuml.sh                    # 交互式
#
# 返回码:
#   0 = 语法正确
#   1 = 语法错误
#   2 = 其他错误（JAR 不存在、Java 未安装等）

set -e

# 解析参数
QUIET_MODE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        -q|--quiet)
            QUIET_MODE=true
            shift
            ;;
        *)
            break
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PLANTUML_JAR="$PROJECT_ROOT/bin/plantuml.jar"

# 检查 JAR 是否存在
if [ ! -f "$PLANTUML_JAR" ]; then
    if [ "$QUIET_MODE" = false ]; then
        echo "❌ PlantUML JAR 不存在: $PLANTUML_JAR"
        echo "请先下载: curl -L -o bin/plantuml.jar https://github.com/plantuml/plantuml/releases/latest/download/plantuml.jar"
    fi
    exit 2
fi

# 检查 Java 是否可用
if ! command -v java &> /dev/null; then
    if [ "$QUIET_MODE" = false ]; then
        echo "❌ Java 未安装"
    fi
    exit 2
fi

# 临时文件
TEMP_FILE=$(mktemp /tmp/plantuml-XXXXXX.puml)
TEMP_DIR=$(mktemp -d /tmp/plantuml-out-XXXXXX)
trap "rm -f $TEMP_FILE; rm -rf $TEMP_DIR" EXIT

# 读取输入
if [ $# -eq 0 ]; then
    # 从 stdin 读取
    if [ -t 0 ] && [ "$QUIET_MODE" = false ]; then
        echo "请输入 PlantUML 代码（Ctrl+D 结束）:"
    fi
    cat > "$TEMP_FILE"
elif [ -f "$1" ]; then
    # 文件路径
    cp "$1" "$TEMP_FILE"
else
    if [ "$QUIET_MODE" = false ]; then
        echo "❌ 文件不存在: $1"
    fi
    exit 2
fi

# 校验（使用 -tsvg 生成图片以获取详细错误信息）
# 使用 headless 模式避免 GUI 窗口闪烁
set +e  # 临时禁用 exit on error
OUTPUT=$(java -Djava.awt.headless=true -jar "$PLANTUML_JAR" -tsvg "$TEMP_FILE" -o "$TEMP_DIR" 2>&1)
EXIT_CODE=$?
set -e  # 重新启用

if [ $EXIT_CODE -eq 0 ]; then
    exit 0
else
    # 输出错误信息（会被 check-plantuml.mjs 捕获）
    if [ "$QUIET_MODE" = false ]; then
        echo "$OUTPUT"
    fi
    exit 1
fi
