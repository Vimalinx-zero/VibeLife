#!/bin/bash
# FlowStudy 快速添加想法脚本
# 用法: ./scripts/add-idea.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== FlowStudy 添加新想法 ===${NC}"
echo ""

# 输入想法定义
read -p "$(echo -e ${YELLOW}想法ID (例如: MOBILE-001): ${NC})" id
read -p "$(echo -e ${YELLOW}想法标题: ${NC})" title
read -p "$(echo -e ${YELLOW}优先级 (P0/P1/P2/P3): ${NC})" priority

# 映射优先级
case $priority in
    p0) priority_label="P0 (紧急)"
        ;;
    p1) priority_label="P1 (高)"
        ;;
    p2) priority_label="P2 (中)"
        ;;
    p3) priority_label="P3 (低)"
        ;;
    *) priority_label="P2 (中)"
        ;;
esac

echo ""
read -p "$(echo -e ${YELLOW}分类 (核心功能/用户体验/性能/安全/文档/Bug/重构): ${NC})" category
read -p "$(echo -e ${YELLOW}详细描述: ${NC})" description

# 确定
echo ""
echo -e "${BLUE}=== 确认信息 ===${NC}"
echo "ID: $id"
echo "标题: $title"
echo "优先级: $priority_label"
echo "分类: $category"
echo "描述: $description"
echo ""
read -p "$(echo -e ${GREEN}确认添加? (y/n): ${NC})" confirm

if [ "$confirm" != "y" ]; then
    echo -e "${RED}已取消${NC}"
    exit 0
fi

# 生成想法定义
date=$(date +%Y-%m-%d)

cat >> /home/chesten/Programs/flowstudy/IDEAS.md << EOF

### [IDEA-$id] $title

**状态**: 🔴 待讨论
**优先级**: $priority_label
**分类**: $category
**提出时间**: $date
**最后更新**: $date

#### 📝 详细描述

$description

#### 🎯 目标

（目标）

#### 💡 方案

**方案 A**: ...

#### 📊 影响范围

影响的模块和功能...

#### 💬 讨论

<!-- 在这里添加讨论内容 -->

#### ✅ 决策

<!-- 最终决策 -->

#### 🚀 实施计划

如果决定实施，记录实施计划...

- [ ] 调研阶段
- [ ] 设计阶段
- [ ] 开发阶段
- [ ] 测试阶段
- [ ] 部署阶段

#### 📚 相关资源

- [相关文档]
- [参考项目]
- [技术文章]

---

EOF

echo -e "${GREEN}✅ 想法已添加到 IDEAS.md${NC}"
echo ""
echo "下一步："
echo "1. 查看 IDEAS.md 确认格式"
echo "2. 如需多人讨论，创建 GitHub Issue: gh issue create --title \"[想法] $title\""
