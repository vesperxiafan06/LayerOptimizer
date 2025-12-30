# 回退到 MVP 版本指南

## 当前 MVP 版本
- **版本标签**: `v1.0.0-mvp`
- **提交哈希**: `0d80ea0`
- **日期**: 2024

## 如何回退到 MVP 版本

### 方法 1: 使用 Git 标签（推荐）

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
git checkout v1.0.0-mvp
```

### 方法 2: 使用提交哈希

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
git checkout 0d80ea0
```

### 方法 3: 创建新分支（保留当前工作）

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
# 先保存当前工作
git add .
git commit -m "WIP: Current work in progress"

# 创建基于MVP版本的新分支
git checkout -b rollback-to-mvp v1.0.0-mvp
```

### 方法 4: 重置到 MVP 版本（⚠️ 会丢失未提交的更改）

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
git reset --hard v1.0.0-mvp
```

## 查看版本信息

```bash
# 查看所有标签
git tag -l

# 查看提交历史
git log --oneline --decorate

# 查看 MVP 版本的详细信息
git show v1.0.0-mvp
```

## 回到最新版本

回退后，如果想回到最新版本：

```bash
git checkout main
# 或
git checkout master
```

## MVP 版本包含的文件

- `manifest.json` - 插件配置
- `code.js` - 核心逻辑
- `ui.html` - 用户界面
- `README.md` - 使用说明
- `VERSION.md` - 版本记录
- `help.html` - 帮助页面（如有）
- `index.html` - 索引页面（如有）

## 注意事项

⚠️ **重要提示**:
- 回退操作会覆盖当前工作目录的文件
- 如果有未提交的更改，建议先提交或创建分支
- 回退后，所有在 MVP 版本之后的更改都会丢失（除非已提交到其他分支）

## 备份建议

在回退前，建议先备份当前版本：

```bash
# 创建当前版本的备份分支
git branch backup-before-rollback

# 或者创建压缩包备份
cd "/Users/jingjing.xia1/Desktop"
zip -r "图层优化-backup-$(date +%Y%m%d).zip" "图层优化"
```

