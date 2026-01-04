# 图层重命名功能可行性分析

## 需求概述

很多设计师不会单独给每个图层命名，导致图层管理混乱。希望参考 Figma 原生的图层重命名功能，在插件中增加类似的重命名能力。

## Figma 原生重命名功能分析

### 1. 交互方式

Figma 原生的重命名功能：
- **单图层重命名**：双击图层名称 → 进入编辑模式 → 输入新名称 → 回车确认
- **批量重命名**：选中多个图层 → 右键菜单 → "Rename Layers" → 批量重命名对话框
- **智能命名**：支持添加前缀、后缀、数字编号、基于内容自动命名等

### 2. 功能特点

- ✅ 支持单个和批量重命名
- ✅ 支持添加前缀/后缀
- ✅ 支持数字编号（1, 2, 3... 或 01, 02, 03...）
- ✅ 支持基于图层类型、尺寸、位置等自动命名
- ✅ 支持查找和替换
- ✅ 实时预览重命名结果

## Figma Plugin API 能力分析

### ✅ 可实现的 API 操作

#### 1. **读取和修改节点名称**
```javascript
// 读取节点名称
const nodeName = node.name;

// 修改节点名称（可写属性）
node.name = "新名称";
```

**可行性**: ✅ 100% - `node.name` 是可写属性

#### 2. **批量操作**
```javascript
// 遍历节点树
function renameNodesRecursively(node, renameFunction) {
  node.name = renameFunction(node);
  if ("children" in node) {
    for (const child of node.children) {
      renameNodesRecursively(child, renameFunction);
    }
  }
}
```

**可行性**: ✅ 100% - 支持递归遍历和批量修改

#### 3. **获取选中图层**
```javascript
// 获取当前选中的图层
const selection = figma.currentPage.selection;
```

**可行性**: ✅ 100% - 已在使用

#### 4. **UI 交互**
```javascript
// 显示输入框、按钮等 UI 元素
figma.showUI(__html__, { width: 400, height: 600 });
```

**可行性**: ✅ 100% - 当前插件已有 UI

## 实现方案

### 方案 1：集成到现有插件（推荐）

**优点**：
- 复用现有的扫描和选择逻辑
- 用户可以在扫描冗余图层的同时重命名
- 统一的用户体验

**实现方式**：
1. 在问题列表中，图层名称支持双击编辑
2. 添加批量重命名功能按钮
3. 支持重命名规则配置（前缀、后缀、编号等）

### 方案 2：独立的重命名功能模块

**优点**：
- 功能独立，不影响现有功能
- 可以单独使用

**实现方式**：
1. 添加新的功能标签页或按钮
2. 独立的 UI 界面
3. 支持多种重命名规则

## 技术实现细节

### 1. 单图层重命名

```javascript
// 处理重命名请求
async function handleRenameNode(nodeId, newName) {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node) {
      node.name = newName;
      return { success: true };
    }
    return { success: false, error: 'Node not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

### 2. 批量重命名

```javascript
// 批量重命名选中的图层
async function handleBatchRename(selectedNodeIds, renameRule) {
  const results = [];
  for (const nodeId of selectedNodeIds) {
    try {
      const node = await figma.getNodeByIdAsync(nodeId);
      if (node) {
        const newName = applyRenameRule(node, renameRule);
        node.name = newName;
        results.push({ nodeId, success: true, newName });
      }
    } catch (error) {
      results.push({ nodeId, success: false, error: error.message });
    }
  }
  return results;
}

// 应用重命名规则
function applyRenameRule(node, rule) {
  let newName = node.name;
  
  // 添加前缀
  if (rule.prefix) {
    newName = rule.prefix + newName;
  }
  
  // 添加后缀
  if (rule.suffix) {
    newName = newName + rule.suffix;
  }
  
  // 数字编号
  if (rule.numbering) {
    const number = rule.startNumber + rule.currentIndex;
    const formattedNumber = rule.zeroPadding 
      ? String(number).padStart(rule.digits, '0')
      : String(number);
    newName = rule.numberingPosition === 'prefix'
      ? `${formattedNumber} ${newName}`
      : `${newName} ${formattedNumber}`;
  }
  
  // 基于类型命名
  if (rule.typeBased) {
    newName = `${node.type} ${rule.currentIndex + 1}`;
  }
  
  return newName;
}
```

### 3. UI 交互设计

#### 方案 A：双击编辑（类似 Figma 原生）
```javascript
// 在问题列表中，图层名称支持双击编辑
name.addEventListener('dblclick', (e) => {
  e.stopPropagation();
  // 显示输入框
  showRenameInput(issue.id, issue.name);
});
```

#### 方案 B：右键菜单
```javascript
// 添加右键菜单
item.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  showContextMenu(e.clientX, e.clientY, issue.id);
});
```

#### 方案 C：批量重命名按钮
```javascript
// 添加批量重命名按钮
const batchRenameButton = document.createElement('button');
batchRenameButton.textContent = '批量重命名';
batchRenameButton.addEventListener('click', () => {
  showBatchRenameDialog();
});
```

## 重命名规则设计

### 1. 基础规则
- **前缀**：在名称前添加文本（如 "Button_"）
- **后缀**：在名称后添加文本（如 "_v1"）
- **替换**：查找并替换文本（如 "Frame" → "Container"）

### 2. 编号规则
- **数字编号**：1, 2, 3... 或 01, 02, 03...
- **编号位置**：前缀或后缀
- **起始数字**：自定义起始数字

### 3. 智能命名
- **基于类型**：Frame 1, Frame 2...
- **基于尺寸**：24x24 Icon, 48x48 Icon...
- **基于位置**：Left Button, Right Button...

### 4. 高级规则
- **正则表达式**：支持正则匹配和替换
- **条件命名**：根据图层属性条件命名
- **模板命名**：支持变量（如 "{type}_{index}"）

## 用户体验设计

### 1. 交互流程

**单图层重命名**：
1. 用户在问题列表中双击图层名称
2. 图层名称变为可编辑的输入框
3. 用户输入新名称
4. 回车确认或点击外部取消
5. 更新图层名称并刷新列表

**批量重命名**：
1. 用户选中多个图层（通过 checkbox）
2. 点击"批量重命名"按钮
3. 弹出重命名规则配置对话框
4. 配置重命名规则（前缀、后缀、编号等）
5. 预览重命名结果
6. 确认后批量应用

### 2. UI 组件

- **内联编辑输入框**：双击图层名称时显示
- **批量重命名对话框**：包含规则配置和预览
- **重命名规则预设**：常用规则快速选择

## 技术挑战和限制

### ⚠️ 需要注意的限制

#### 1. **组件和实例保护**
- 不能重命名组件本身（会影响所有实例）
- 可以重命名组件实例（不影响组件定义）
- **解决方案**：添加安全检查，跳过组件本身

#### 2. **权限限制**
- 某些节点可能被锁定，无法重命名
- **解决方案**：检查节点是否可编辑，跳过锁定的节点

#### 3. **性能考虑**
- 批量重命名大量节点可能较慢
- **解决方案**：添加进度显示，分批处理

#### 4. **撤销/重做**
- Figma 的撤销/重做系统会自动记录名称变更
- **解决方案**：无需特殊处理，Figma 会自动处理

## 实现优先级

### P0（核心功能）
1. ✅ 单图层重命名（双击编辑）
2. ✅ 批量重命名（选中多个图层）
3. ✅ 基础规则（前缀、后缀、替换）

### P1（增强功能）
1. ⏭️ 数字编号
2. ⏭️ 基于类型的智能命名
3. ⏭️ 重命名预览

### P2（高级功能）
1. ⏭️ 正则表达式支持
2. ⏭️ 条件命名
3. ⏭️ 重命名规则预设和保存

## 推荐实现方案

### 阶段 1：MVP（最小可行产品）
1. **单图层重命名**：双击图层名称编辑
2. **批量重命名**：选中多个图层，添加前缀/后缀
3. **基础验证**：组件保护、锁定检查

### 阶段 2：增强功能
1. **数字编号**：支持自动编号
2. **智能命名**：基于类型、尺寸等
3. **预览功能**：重命名前预览结果

### 阶段 3：高级功能
1. **正则表达式**：支持复杂匹配和替换
2. **规则预设**：保存常用规则
3. **批量操作优化**：进度显示、错误处理

## 与现有功能的集成

### 集成点 1：问题列表
- 在问题列表中，图层名称支持双击编辑
- 重命名后自动刷新列表显示

### 集成点 2：批量操作
- 在优化按钮旁边添加"批量重命名"按钮
- 支持对选中的问题图层批量重命名

### 集成点 3：扫描结果
- 扫描后可以立即重命名识别出的冗余图层
- 重命名不影响优化功能

## 总结

### ✅ 可行性评估：**高度可行**

1. **API 支持**：✅ Figma Plugin API 完全支持节点重命名
2. **技术实现**：✅ 实现难度低，主要是 UI 交互
3. **用户体验**：✅ 可以完全参考 Figma 原生交互
4. **功能价值**：✅ 解决设计师的实际痛点

### 推荐实施路径

1. **第一步**：实现单图层重命名（双击编辑）
2. **第二步**：添加批量重命名功能
3. **第三步**：增强重命名规则和智能命名

### 注意事项

- 保持现有功能不变
- 重命名功能作为可选功能
- 添加组件和实例保护
- 提供清晰的用户反馈

