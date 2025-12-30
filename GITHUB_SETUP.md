# GitHub 设置指南 - 将代码推送到远程仓库

## 为什么需要推送到 GitHub？

✅ **备份代码** - 即使电脑损坏，代码也不会丢失  
✅ **版本管理** - 可以查看所有历史版本和更改  
✅ **多设备同步** - 可以在不同电脑上工作  
✅ **协作分享** - 可以与他人分享代码  
✅ **发布插件** - 发布到 Figma 社区时需要代码仓库  

## 第一步：在 GitHub 上创建仓库

### 1. 登录 GitHub
- 访问 https://github.com
- 使用你的账号登录

### 2. 创建新仓库
1. 点击右上角的 **"+"** 按钮
2. 选择 **"New repository"**（新建仓库）
3. 填写仓库信息：
   - **Repository name**: `layer-optimizer` （或你喜欢的名字）
   - **Description**: "Figma plugin to detect and remove redundant layers"
   - **Visibility**: 
     - ✅ **Public**（公开）- 任何人都能看到（推荐，方便分享）
     - ⚠️ **Private**（私有）- 只有你能看到
   - ❌ **不要**勾选 "Initialize this repository with a README"（我们已经有了）
4. 点击 **"Create repository"**（创建仓库）

### 3. 复制仓库地址
创建成功后，GitHub 会显示仓库地址，类似：
```
https://github.com/你的用户名/layer-optimizer.git
```
**请复制这个地址，下一步会用到！**

---

## 第二步：连接本地仓库到 GitHub

### 方法 A：使用命令行（推荐）

打开终端（Terminal），执行以下命令：

```bash
# 1. 进入项目目录
cd "/Users/jingjing.xia1/Desktop/图层优化"

# 2. 添加远程仓库（将 YOUR_USERNAME 和 REPO_NAME 替换为你的实际信息）
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 例如，如果你的用户名是 jingjing，仓库名是 layer-optimizer：
# git remote add origin https://github.com/jingjing/layer-optimizer.git

# 3. 验证远程仓库已添加
git remote -v

# 4. 推送代码到 GitHub（首次推送）
git push -u origin main
```

### 方法 B：如果遇到问题，使用完整命令

如果上面的命令不工作，尝试：

```bash
# 1. 确保你在正确的目录
cd "/Users/jingjing.xia1/Desktop/图层优化"

# 2. 检查当前分支
git branch

# 3. 如果分支名不是 main，重命名它
git branch -M main

# 4. 添加远程仓库
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# 5. 推送代码
git push -u origin main
```

---

## 第三步：验证推送成功

1. 刷新你的 GitHub 仓库页面
2. 你应该能看到所有文件：
   - `code.js`
   - `ui.html`
   - `manifest.json`
   - `README.md`
   - `VERSION.md`
   - 等等...

3. 点击 **"tags"** 标签，应该能看到 `v1.0.0-mvp` 标签

---

## 常见问题解决

### 问题 1: 需要输入用户名和密码

**解决方案**：使用 Personal Access Token（个人访问令牌）

1. 在 GitHub 上：
   - 点击右上角头像 → **Settings**（设置）
   - 左侧菜单 → **Developer settings**
   - **Personal access tokens** → **Tokens (classic)**
   - 点击 **"Generate new token"**（生成新令牌）
   - 勾选 `repo` 权限
   - 点击 **"Generate token"**
   - **复制生成的令牌**（只显示一次！）

2. 推送时使用令牌作为密码：
```bash
git push -u origin main
# Username: 你的GitHub用户名
# Password: 粘贴刚才复制的令牌（不是你的GitHub密码！）
```

### 问题 2: 远程仓库已存在内容

如果 GitHub 仓库已经有文件（比如你创建时勾选了 README），执行：

```bash
# 先拉取远程内容
git pull origin main --allow-unrelated-histories

# 解决可能的冲突后，再推送
git push -u origin main
```

### 问题 3: 分支名不匹配

如果错误提示分支名不匹配：

```bash
# 查看当前分支
git branch

# 重命名为 main（如果当前是 master）
git branch -M main

# 然后推送
git push -u origin main
```

---

## 日常使用指南

### 每次修改代码后，推送到 GitHub：

```bash
# 1. 查看更改的文件
git status

# 2. 添加所有更改
git add .

# 3. 提交更改（写清楚这次改了什么）
git commit -m "描述你的更改，例如：添加新功能"

# 4. 推送到 GitHub
git push
```

### 从 GitHub 拉取最新代码（在其他电脑上）：

```bash
git pull
```

### 查看提交历史：

```bash
git log --oneline
```

### 回退到 MVP 版本：

```bash
git checkout v1.0.0-mvp
```

---

## 重要提示

🔒 **安全提示**：
- 不要在代码中存储密码或 API 密钥
- 如果代码包含敏感信息，使用 `.gitignore` 排除

📝 **提交信息**：
- 每次提交时，写清楚这次改了什么
- 例如："修复了优化逻辑bug" 或 "添加了新的检测规则"

🔄 **定期推送**：
- 建议每次完成一个功能就推送一次
- 这样即使电脑出问题，代码也不会丢失

---

## 需要帮助？

如果遇到问题，可以：
1. 查看错误信息，通常会有提示
2. 搜索错误信息 + "GitHub" 在 Google 上查找解决方案
3. 查看 GitHub 官方文档：https://docs.github.com

