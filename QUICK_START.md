# 快速开始 - Git 版本管理

## 🚀 5分钟快速上手指南

### 第一次设置（只需做一次）

1. **在 GitHub 创建仓库**
   - 访问 https://github.com/new
   - 仓库名：`layer-optimizer`
   - 点击 "Create repository"

2. **连接本地代码到 GitHub**
   
   打开终端，执行（替换 YOUR_USERNAME 为你的 GitHub 用户名）：
   
   ```bash
   cd "/Users/jingjing.xia1/Desktop/图层优化"
   git remote add origin https://github.com/YOUR_USERNAME/layer-optimizer.git
   git push -u origin main
   ```

3. **输入 GitHub 用户名和密码**（或使用 Personal Access Token）

完成！现在你的代码已经在 GitHub 上了。

---

## 📝 日常使用（每次修改代码后）

只需要 3 个命令：

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
git add .
git commit -m "描述你做了什么改动"
git push
```

**示例**：
```bash
git commit -m "修复了Auto Layout下的检测bug"
git commit -m "添加了新的UI功能"
git commit -m "更新了README文档"
```

---

## 🔄 回退到 MVP 版本

```bash
cd "/Users/jingjing.xia1/Desktop/图层优化"
git checkout v1.0.0-mvp
```

回到最新版本：
```bash
git checkout main
```

---

## 📚 更多帮助

- 详细设置指南：查看 `GITHUB_SETUP.md`
- 回退指南：查看 `ROLLBACK.md`
- 版本信息：查看 `VERSION.md`

