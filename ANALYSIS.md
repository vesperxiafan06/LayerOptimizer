# 冗余图层识别但无法移除的问题分析

## 问题描述
有些图层可以被识别为冗余，但点击优化后实际没有被移除。

## 代码流程分析

### 1. 扫描阶段（handleScanSelection）
- 扫描所有节点，识别冗余容器
- 将冗余节点的ID添加到 `issues.redundantLayers` 列表
- 保存扫描时的根节点到 `scanRootNodes`

### 2. 优化阶段（handleOptimize）
- 获取选中的问题ID集合 `selectedIssueIds`
- 对每个问题ID，尝试获取节点：`await figma.getNodeByIdAsync(issueId)`
- **关键步骤**：找到包含该节点的根节点（扫描时的根节点）
- 只将根节点添加到 `nodesToOptimize` 列表
- 对每个根节点执行 `optimizeNodeRecursively`

### 3. 递归优化阶段（optimizeNodeRecursively）
- 自底向上遍历
- 先递归处理子节点
- 然后检查当前节点是否冗余
- 如果冗余且ID在 `selectedIssueIds` 中，才移除

## 可能的问题原因

### 问题1：节点找不到对应的根节点 ⚠️ **最可能**
**位置**：`handleOptimize` 第164-171行

**原因**：
- 如果选中的问题节点不在扫描时的根节点范围内，`rootNode` 会是 `null`
- 第174行的条件 `if (rootNode && !processedRoots.has(rootNode.id))` 会失败
- 节点不会被添加到 `nodesToOptimize` 列表
- 因此不会被处理

**场景**：
- 用户扫描了 FrameA
- 扫描时 FrameA 的子节点 FrameB 被识别为冗余
- 但在优化前，用户手动移动了 FrameB 到 FrameA 外面
- 优化时 FrameB 不在 FrameA 范围内，找不到根节点

### 问题2：节点在递归过程中状态改变
**位置**：`optimizeNodeRecursively` 第265-272行

**原因**：
- 自底向上策略：先处理子节点，再处理当前节点
- 如果节点的子节点先被移除，节点可能不再满足冗余条件
- 例如：节点原本只有1个子节点，子节点被移除后，节点变成0个子节点，不再满足 `children.length === 1` 的条件

**场景**：
```
FrameA (冗余)
  └─ FrameB (冗余)
      └─ FrameC (内容)
```
- 扫描时：FrameA 和 FrameB 都被识别为冗余
- 优化时：先处理 FrameB，FrameB 被移除，FrameC 提升到 FrameA
- 处理 FrameA 时：FrameA 现在有 FrameC 作为子节点，但 FrameA 可能不再满足其他冗余条件（比如尺寸不一致）

### 问题3：节点在优化时不再满足冗余条件
**位置**：`optimizeNodeRecursively` 第265行

**原因**：
- 在递归过程中，节点的状态可能已经改变
- `isRedundantContainer(node)` 在优化时返回 false
- 即使节点ID在 `selectedIssueIds` 中，也不会被移除

**场景**：
- 扫描时节点满足所有冗余条件
- 优化时，由于其他节点的变化，节点不再满足某些条件（比如尺寸、位置等）

### 问题4：节点已经被移除
**位置**：`optimizeNodeRecursively` 第268行

**原因**：
- 如果节点的父节点先被移除，节点可能已经被移除了
- `unwrapNode` 可能返回 false
- 但这种情况应该不会发生，因为自底向上策略应该先处理子节点

## 解决方案

### 方案1：直接处理选中的问题节点（推荐）
不依赖根节点，直接对选中的问题节点进行处理。

**优点**：
- 更直接，不依赖根节点查找
- 即使节点移动了，只要ID有效就能处理

**缺点**：
- 需要确保节点仍然存在
- 需要处理节点状态可能改变的情况

### 方案2：改进根节点查找逻辑
如果找不到根节点，直接处理该节点。

**优点**：
- 保持现有的递归优化逻辑
- 兼容节点移动的情况

**缺点**：
- 可能破坏自底向上的优化策略

### 方案3：添加调试日志
添加详细的日志，帮助定位问题。

**优点**：
- 可以准确定位问题
- 不影响现有逻辑

**缺点**：
- 只是诊断工具，不解决问题

## 推荐方案
采用方案1 + 方案3：
1. 直接处理选中的问题节点
2. 添加调试日志
3. 确保节点在优化时仍然满足冗余条件

