#!/bin/bash

# GitHub 设置脚本
# 使用方法：在终端执行：bash setup-github.sh

echo "=========================================="
echo "GitHub 仓库设置向导"
echo "=========================================="
echo ""

# 检查是否在正确的目录
if [ ! -f "manifest.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

echo "✅ 检测到项目文件"
echo ""

# 检查是否已有远程仓库
if git remote -v | grep -q "origin"; then
    echo "⚠️  检测到已配置远程仓库："
    git remote -v
    echo ""
    read -p "是否要更新远程仓库地址？(y/n): " update_remote
    if [ "$update_remote" = "y" ]; then
        git remote remove origin
    else
        echo "跳过远程仓库配置"
        exit 0
    fi
fi

echo ""
echo "请按照以下步骤操作："
echo ""
echo "1. 访问 https://github.com/new 创建新仓库"
echo "2. 仓库名建议：layer-optimizer"
echo "3. 选择 Public 或 Private"
echo "4. 不要勾选 'Initialize with README'"
echo "5. 点击 'Create repository'"
echo ""
read -p "按回车键继续，然后输入你的 GitHub 仓库地址（例如：https://github.com/用户名/仓库名.git）: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ 未输入仓库地址，退出"
    exit 1
fi

echo ""
echo "正在配置远程仓库..."
git remote add origin "$repo_url"

echo ""
echo "✅ 远程仓库已添加"
echo ""
echo "正在推送代码到 GitHub..."
echo ""

# 尝试推送
if git push -u origin main; then
    echo ""
    echo "=========================================="
    echo "✅ 成功！代码已推送到 GitHub"
    echo "=========================================="
    echo ""
    echo "你的仓库地址：$repo_url"
    echo ""
    echo "下次推送代码，只需执行："
    echo "  git add ."
    echo "  git commit -m '描述你的更改'"
    echo "  git push"
else
    echo ""
    echo "=========================================="
    echo "⚠️  推送失败，可能的原因："
    echo "=========================================="
    echo ""
    echo "1. 需要输入 GitHub 用户名和密码"
    echo "2. 如果使用密码，需要使用 Personal Access Token"
    echo "3. 查看 GITHUB_SETUP.md 获取详细帮助"
    echo ""
    echo "你可以手动执行："
    echo "  git push -u origin main"
fi

