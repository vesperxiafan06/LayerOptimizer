// code.js

// ==========================================
// Figma 插件：图层去冗余 (Layer Cleaner)
// 核心逻辑：自底向上遍历 + 严格的安全检查
// ==========================================

// 显示 UI 界面
figma.showUI(__html__, { width: 400, height: 600 });

// 监听来自 UI 的消息
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'scan-selection') {
    handleScanSelection();
  } else if (msg.type === 'optimize') {
    await handleOptimize(msg.options);
  } else if (msg.type === 'select-node') {
    await handleSelectNode(msg.nodeId);
  }
};

/**
 * 处理扫描选中图层的请求
 */
function handleScanSelection() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: '⚠️ Please select a container (Frame/Group) containing redundant layers first'
    });
    return;
  }

  // 保存扫描时的根节点，用于后续优化
  scanRootNodes = [...selection];

  // 扫描选中节点，查找冗余图层
  const issues = {
    invalidNesting: [],
    redundantLayers: []
  };

  let totalNodes = 0;
  let scannedNodes = 0;

  // 先计算总节点数（用于进度显示）
  function countNodes(node) {
    totalNodes++;
    if ("children" in node) {
      for (const child of node.children) {
        countNodes(child);
      }
    }
  }

  for (const node of selection) {
    countNodes(node);
  }

  // 扫描节点
  function scanNode(node, parentPath = '') {
    scannedNodes++;
    
    // 更新进度
    if (totalNodes > 0 && scannedNodes % 10 === 0) {
      const progress = Math.min(100, Math.round((scannedNodes / totalNodes) * 100));
      figma.ui.postMessage({
        type: 'scan-progress',
        progress: progress,
        message: `Scanning... ${scannedNodes}/${totalNodes}`
      });
    }

    // 检查当前节点是否为冗余容器
    if (isRedundantContainer(node)) {
      issues.redundantLayers.push({
        id: node.id,
        name: node.name,
        type: node.type,
        path: parentPath ? `${parentPath} > ${node.name}` : node.name
      });
    }

    // 递归扫描子节点
    if ("children" in node) {
      const currentPath = parentPath ? `${parentPath} > ${node.name}` : node.name;
      for (const child of node.children) {
        scanNode(child, currentPath);
      }
    }
  }

  // 执行扫描
  for (const node of selection) {
    scanNode(node);
  }

  // 发送扫描结果
  if (issues.redundantLayers.length === 0 && issues.invalidNesting.length === 0) {
    figma.ui.postMessage({
      type: 'no-issues',
      message: '👍 No redundant containers found that can be safely removed'
    });
  } else {
    figma.ui.postMessage({
      type: 'scan-result',
      issues: issues
    });
  }
}

// 存储扫描时的根节点，用于优化时确定优化范围
let scanRootNodes = [];

/**
 * 检查节点是否是另一个节点的后代（或本身）
 */
function isDescendantOf(node, ancestor) {
  if (node === ancestor) {
    return true;
  }
  let current = node.parent;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * 检查节点是否在实例内部（包括节点本身是实例，或者节点的任何祖先节点是实例）
 */
function isInsideInstance(node) {
  if (!node) return false;
  
  // 检查节点本身是否是实例
  if (node.type === "INSTANCE") return true;
  
  // 检查所有祖先节点
  let current = node.parent;
  while (current) {
    if (current.type === "INSTANCE") {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

/**
 * 处理优化请求
 */
async function handleOptimize(options) {
  // 获取选中的问题ID集合
  const selectedIssueIds = options.selectedIssueIds && options.selectedIssueIds.length > 0 
    ? new Set(options.selectedIssueIds) 
    : null;

  if (!selectedIssueIds || selectedIssueIds.size === 0) {
    figma.ui.postMessage({
      type: 'error',
      message: '⚠️ Please select at least one issue to optimize'
    });
    return;
  }

  let optimizedCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // 根据选中的问题ID，获取对应的节点
    const nodesToOptimize = [];
    const processedRoots = new Set();
    const directIssueNodes = []; // 直接处理的问题节点（找不到根节点的）
    
    for (const issueId of selectedIssueIds) {
      try {
        const node = await figma.getNodeByIdAsync(issueId);
        if (node) {
          // 找到包含该节点的根节点（扫描时的根节点）
          let rootNode = null;
          for (const root of scanRootNodes) {
            if (isDescendantOf(node, root) || node === root) {
              rootNode = root;
              break;
            }
          }
          
          // 如果找到了根节点，且还没有处理过，添加到优化列表
          if (rootNode && !processedRoots.has(rootNode.id)) {
            processedRoots.add(rootNode.id);
            nodesToOptimize.push(rootNode);
          } else if (!rootNode) {
            // 如果找不到根节点，直接处理该节点（可能是节点移动了，或者扫描后结构改变了）
            directIssueNodes.push(node);
          }
        }
      } catch (error) {
        errorCount++;
        errors.push({
          type: 'Unknown',
          name: issueId,
          error: error.message || String(error)
        });
      }
    }
    
    // 执行优化：先处理根节点（递归优化）
    for (const node of nodesToOptimize) {
      try {
        const count = optimizeNodeRecursively(node, selectedIssueIds);
        optimizedCount += count;
      } catch (error) {
        errorCount++;
        errors.push({
          type: node.type,
          name: node.name,
          error: error.message || String(error)
        });
      }
    }
    
    // 直接处理找不到根节点的问题节点
    for (const node of directIssueNodes) {
      try {
        // 验证节点是否仍然存在且有效
        if (!node || !node.parent) {
          errorCount++;
          errors.push({
            type: 'Unknown',
            name: node ? node.name : 'Unknown',
            error: 'Node no longer exists or has no parent'
          });
          continue;
        }

        // 检查节点是否仍然满足冗余条件
        const isRedundant = isRedundantContainer(node);
        const isSelected = selectedIssueIds.has(node.id);
        
        if (isRedundant && isSelected) {
          const success = unwrapNode(node);
          if (success) {
            optimizedCount++;
          } else {
            // 移除失败，记录原因
            errorCount++;
            errors.push({
              type: node.type,
              name: node.name,
              error: 'Failed to remove node (unwrapNode returned false)'
            });
            console.error(`Failed to remove node: ${node.name} (${node.id})`);
          }
        } else if (!isRedundant) {
          // 节点不再满足冗余条件，记录原因
          errorCount++;
          errors.push({
            type: node.type,
            name: node.name,
            error: 'Node no longer meets redundant container criteria'
          });
          console.warn(`Node no longer redundant: ${node.name} (${node.id})`);
        } else if (!isSelected) {
          // 节点不在选中的问题列表中（不应该发生，但为了安全起见）
          errorCount++;
          errors.push({
            type: node.type,
            name: node.name,
            error: 'Node not in selected issue list'
          });
        }
      } catch (error) {
        errorCount++;
        errors.push({
          type: node ? node.type : 'Unknown',
          name: node ? node.name : 'Unknown',
          error: error.message || String(error)
        });
        console.error(`Error processing node: ${error.message}`);
      }
    }

    // 发送优化完成消息
    figma.ui.postMessage({
      type: 'optimize-complete',
      optimizedCount: optimizedCount,
      errorCount: errorCount,
      summary: {
        redundantLayersRemoved: optimizedCount,
        errors: errors
      }
    });

    // 显示通知（Figma通知使用英文，因为无法获取前端语言设置）
    if (optimizedCount > 0) {
      figma.notify(`✅ Optimization complete! Removed ${optimizedCount} redundant containers`);
    } else {
      figma.notify("👍 No redundant containers found that can be safely removed");
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: `An error occurred during optimization: ${error.message}`
    });
  }
}

/**
 * 处理选择节点请求
 */
async function handleSelectNode(nodeId) {
  try {
    const node = await figma.getNodeByIdAsync(nodeId);
    if (node) {
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      message: `Unable to select node: ${error.message}`
    });
  }
}

/**
 * 递归函数：自底向上 (Bottom-Up) 遍历
 * 策略：先处理最里面的子孙节点，再处理当前节点。
 * @param {SceneNode} node - 要优化的节点
 * @param {Set<string>|null} selectedIssueIds - 选中的问题ID集合，如果为null则优化所有问题
 */
function optimizeNodeRecursively(node, selectedIssueIds = null) {
  let removedCount = 0;

  // 检查节点是否仍然存在（可能在递归过程中被移除了）
  try {
    // 尝试访问节点的基本属性来验证节点是否仍然有效
    const nodeId = node.id;
    const nodeType = node.type;
  } catch (error) {
    // 节点已经被移除，直接返回
    return removedCount;
  }

  // 1. 递归深入：如果当前节点有子节点，先进去清理子节点
  if ("children" in node) {
    // [...node.children] 创建副本非常重要，因为我们会移除节点
    // 但在递归后，需要重新检查节点是否仍然有效，因为子节点可能已经被移除
    const childrenBefore = [...node.children];
    for (const child of childrenBefore) {
      removedCount += optimizeNodeRecursively(child, selectedIssueIds);
    }
    
    // 递归后，验证节点是否仍然有效
    try {
      const testId = node.id;
      const testParent = node.parent;
    } catch (error) {
      // 节点已经被移除（可能是子节点移除时导致的），直接返回
      return removedCount;
    }
  }

  // 2. 自身检查：子节点清理完回来后，检查当前节点自己是否多余
  // 先检查节点是否在选中的问题列表中
  const isSelected = selectedIssueIds === null || selectedIssueIds.has(node.id);
  
  if (isSelected) {
    // 再次验证节点是否仍然有效（可能在递归过程中被移除了）
    try {
      if (!node.parent || !("children" in node)) {
        console.warn(`Node no longer valid after recursion: ${node.name} (${node.id})`);
        return removedCount;
      }
      
      // 如果节点被选中，检查是否仍然满足冗余条件
      if (isRedundantContainer(node)) {
        // 在移除前，记录节点的详细信息用于调试
        const nodeInfo = {
          id: node.id,
          name: node.name,
          type: node.type,
          hasParent: !!node.parent,
          parentType: node.parent ? node.parent.type : 'none',
          parentId: node.parent ? node.parent.id : null,
          childrenCount: "children" in node ? node.children.length : 0,
          hasChildren: "children" in node && node.children.length > 0,
          childId: node.children && node.children.length > 0 ? node.children[0].id : null
        };
        
        const success = unwrapNode(node);
        if (success) {
          removedCount++;
        } else {
          // 移除失败，记录详细信息
          console.error(`Failed to remove node after recursion:`, nodeInfo);
          console.error(`Current node state:`, {
            parent: node.parent ? { 
              id: node.parent.id, 
              type: node.parent.type,
              childrenCount: "children" in node.parent ? node.parent.children.length : 0
            } : null,
            child: node.children && node.children.length > 0 ? { 
              id: node.children[0].id, 
              type: node.children[0].type,
              parent: node.children[0].parent ? node.children[0].parent.id : null
            } : null
          });
        }
      } else {
        // 节点不再满足冗余条件
        console.warn(`Node no longer redundant: ${node.name} (${node.id})`);
      }
    } catch (error) {
      console.error(`Error checking node after recursion: ${node.name} (${node.id}): ${error.message}`);
      return removedCount;
    }
  } else if (selectedIssueIds === null) {
    // 如果没有指定选中的问题ID，优化所有冗余节点
    if (isRedundantContainer(node)) {
      const success = unwrapNode(node);
      if (success) {
        removedCount++;
      }
    }
  }

  return removedCount;
}

/**
 * 核心逻辑：判断一个节点是否为"冗余容器"
 * 必须满足所有条件才返回 true
 */
function isRedundantContainer(node) {
  // ------------------------------------------------
  // 第一阶段：类型与结构的基础检查
  // ------------------------------------------------

  // 只处理 Frame 和 Group
  if (node.type !== "FRAME" && node.type !== "GROUP") return false;

  // 1. 必须有且只有 1 个子元素 (核心特征)
  // 如果有多个子元素，它是分组用的，不能删。
  if (node.children.length !== 1) return false;

  // ------------------------------------------------
  // 第二阶段：安全与保护检查 (Safety Guardrails)
  // ------------------------------------------------

  // 2. 组件保护：不能是组件本身或实例
  if (node.type === "INSTANCE" || node.type === "COMPONENT") return false;

  // 3. 父级组件保护：如果父亲是实例，不能动内部结构
  if (node.parent && node.parent.type === "INSTANCE") return false;
  
  // 3.1 检查父节点是否在实例内部（包括父节点本身是实例，或者父节点的祖先节点是实例）
  if (node.parent && isInsideInstance(node.parent)) return false;

  // ------------------------------------------------
  // 第三阶段：几何与位置检查 (针对 Icon 和留白)
  // ------------------------------------------------
  
  const child = node.children[0];

  // 4. 尺寸一致性检查 (防止误删 Icon 外框)
  // 如果容器比子元素大(比如 24px 框包着 18px 图标)，说明容器定义了占位空间，不能删。
  // 允许 1px 的浮点数误差
  if (Math.abs(node.width - child.width) > 1 || 
      Math.abs(node.height - child.height) > 1) {
    return false;
  }

  // 5. 坐标原点检查 (针对所有 Frame)
  // 如果子元素没有对齐在 (0,0)，说明父容器提供了 Offset (偏移量)，
  // 删掉父容器虽然可以通过计算保持位置，但破坏了结构意图，且容易出错，建议保留。
  if (node.type === "FRAME") {
    if (Math.abs(child.x) > 0.1 || Math.abs(child.y) > 0.1) {
      return false;
    }
  }

  // 6. 父级 Auto Layout 检查
  // 如果父级是 Auto Layout，需要特殊处理
  const parentIsAutoLayout = node.parent && "layoutMode" in node.parent && node.parent.layoutMode !== "NONE";
  
  if (parentIsAutoLayout) {
    // 在 Auto Layout 父级下，如果当前节点是普通 Frame（非 Auto Layout）
    // 且满足以下条件，可以安全移除：
    // 1. 尺寸与子元素一致（已在第4步检查）
    // 2. 子元素在 (0,0) 位置（已在第5步检查）
    // 3. 无视觉效果（将在第4阶段检查）
    // 4. 无 padding（因为不是 Auto Layout，所以没有 padding）
    // 
    // 在这种情况下，frame A 只是一个"透明包装器"，
    // 移除它不会影响 Auto Layout 的布局，因为：
    // - 子元素（frame B）会直接成为 Auto Layout 的子元素
    // - 子元素的位置和尺寸保持不变
    // - Auto Layout 会自动调整布局
    if (node.layoutMode === "NONE") {
      // 普通 Frame 在 Auto Layout 父级中，如果满足所有其他条件，可以移除
      // 继续后续检查（视觉属性、Auto Layout 属性等）
    } else {
      // 如果当前节点也是 Auto Layout，继续后续检查（会在第五阶段确认 padding 是否为 0）
    }
  }

  // ------------------------------------------------
  // 第四阶段：视觉属性检查 (必须是透明无形的)
  // ------------------------------------------------

  // Group 通常是透明的，只要通过了上面的检查，基本可视为冗余
  if (node.type === "GROUP") return true; 

  // Frame 需要详细检查所有视觉属性
  if (node.type === "FRAME") {
    // 可见性必须开启 (不处理隐藏图层)
    if (!node.visible) return false;

    // 裁剪必须关闭
    if (node.clipsContent) return false;

    // 填充 (Fills) 必须为空或不可见
    if (hasVisiblePaints(node.fills)) return false;

    // 描边 (Strokes) 必须为空或不可见
    if (hasVisiblePaints(node.strokes)) return false;

    // 效果 (Effects) 必须为空或不可见
    if (node.effects.length > 0 && node.effects.some(e => e.visible)) return false;

    // ------------------------------------------------
    // 第五阶段：Auto Layout 属性检查
    // ------------------------------------------------
    if (node.layoutMode !== "NONE") {
      // 检查 Padding (内边距)
      // 如果有 Padding，说明它是用来撑开空间的 (Margin Proxy)，不能删。
      const pLeft = node.paddingLeft || 0;
      const pRight = node.paddingRight || 0;
      const pTop = node.paddingTop || 0;
      const pBottom = node.paddingBottom || 0;
      
      if (pLeft !== 0 || pRight !== 0 || pTop !== 0 || pBottom !== 0) return false;
      
      // 注意：这里我们不再检查 Gap。
      // 因为只要 children.length === 1，Gap 是不起作用的。
      // 只要 Padding 为 0 且只有一个子元素，Auto Layout 也是无意义的。
    }

    return true; // 所有检查通过，确认为冗余！
  }

  return false;
}

/**
 * 辅助工具：检查颜色填充是否可见
 */
function hasVisiblePaints(paints) {
  if (paints === figma.mixed) return true; 
  if (!Array.isArray(paints)) return false;
  return paints.some(paint => paint.visible);
}

/**
 * 执行动作：移除冗余父节点，提升子节点
 */
function unwrapNode(node) {
  const nodeName = node ? node.name : 'Unknown';
  const nodeId = node ? node.id : 'Unknown';
  
  try {
    // 验证节点是否仍然有效
    if (!node) {
      console.error(`unwrapNode [${nodeName}]: Node is null or undefined`);
      return false;
    }
    
    if (!node.parent) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Node has no parent`);
      return false;
    }

    const parent = node.parent;
    
    // 检查父节点是否是实例或在实例内部
    if (isInsideInstance(parent)) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Cannot remove node. Parent is an instance or is inside of an instance`);
      console.error(`Parent details:`, {
        id: parent.id,
        name: parent.name,
        type: parent.type,
        isInstance: parent.type === "INSTANCE",
        isInsideInstance: isInsideInstance(parent)
      });
      return false;
    }
    
    // 验证节点是否有子节点
    if (!("children" in node)) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Node does not support children`);
      return false;
    }
    
    if (node.children.length === 0) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Node has no children (children.length = ${node.children.length})`);
      return false;
    }

    const child = node.children[0];

    if (!child) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: First child is null`);
      return false;
    }

    // 检查父级是否是 Auto Layout
    const parentIsAutoLayout = "layoutMode" in parent && parent.layoutMode !== "NONE";

    // 1. 保持层级顺序
    const index = parent.children.indexOf(node);
    if (index === -1) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Node not found in parent children. Parent: ${parent.name} (${parent.id}), Parent children count: ${parent.children.length}`);
      // 列出父节点的所有子节点ID用于调试
      const siblingIds = parent.children.map(c => `${c.name} (${c.id})`).join(', ');
      console.error(`Parent children: [${siblingIds}]`);
      return false;
    }

    // 2. 移动子元素到爷爷节点 (Re-parenting)
    try {
      // 检查子节点是否已经在父节点中（可能已经在递归过程中被移动了）
      if (child.parent === parent) {
        // 子节点已经在父节点中，说明在递归过程中已经被移动了
        // 这种情况下，我们只需要移除冗余节点即可
        console.warn(`unwrapNode [${nodeName} (${nodeId})]: Child already in parent, node may have been partially processed`);
        
        // 验证子节点确实在父节点的子节点列表中
        const childIndexInParent = parent.children.indexOf(child);
        if (childIndexInParent === -1) {
          console.error(`unwrapNode [${nodeName} (${nodeId})]: Child is in parent but not in parent.children array`);
          return false;
        }
        
        // 子节点已经在正确的位置，跳过 insertChild，直接继续
      } else {
        // 子节点不在父节点中，需要移动
        // 但首先需要从当前父节点中移除（如果它有父节点且不是当前节点）
        if (child.parent && child.parent !== node) {
          try {
            // 从当前父节点中移除子节点
            const currentParent = child.parent;
            const childIndexInCurrentParent = currentParent.children.indexOf(child);
            if (childIndexInCurrentParent !== -1) {
              currentParent.removeChild(child);
            } else {
              console.warn(`unwrapNode [${nodeName} (${nodeId})]: Child not found in current parent's children array`);
            }
          } catch (removeError) {
            // 如果移除失败，可能是子节点已经在其他地方了
            console.warn(`unwrapNode [${nodeName} (${nodeId})]: Failed to remove child from current parent: ${removeError.message}`);
            // 检查子节点现在是否已经在目标父节点中
            if (child.parent === parent && parent.children.indexOf(child) !== -1) {
              console.warn(`unwrapNode [${nodeName} (${nodeId})]: Child is now in target parent after remove attempt, continuing`);
              // 子节点已经在目标父节点中，继续执行
            } else {
              // 继续尝试插入
            }
          }
        }
        
        // 再次检查子节点是否已经在目标父节点中（可能在移除过程中被移动了）
        const childNowInParent = child.parent === parent && parent.children.indexOf(child) !== -1;
        
        if (!childNowInParent) {
          // 将子节点插入到新父节点
          try {
            parent.insertChild(index, child);
          } catch (insertError) {
            console.error(`unwrapNode [${nodeName} (${nodeId})]: Failed to insert child: ${insertError.message}`);
            console.error(`Error details:`, {
              childId: child.id,
              childName: child.name,
              childCurrentParent: child.parent ? { id: child.parent.id, name: child.parent.name, type: child.parent.type } : null,
              targetParentId: parent.id,
              targetParentName: parent.name,
              targetParentType: parent.type,
              index: index,
              parentChildrenCount: parent.children.length,
              nodeIndexInParent: parent.children.indexOf(node),
              childInParentChildren: parent.children.indexOf(child),
              childInParentChildrenIndex: parent.children.indexOf(child)
            });
            return false;
          }
        } else {
          console.warn(`unwrapNode [${nodeName} (${nodeId})]: Child is now in target parent, skipping insertChild`);
        }
      }
    } catch (error) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Unexpected error in insertChild: ${error.message}`);
      console.error(`Error details:`, {
        childId: child.id,
        childName: child.name,
        parentId: parent.id,
        parentName: parent.name,
        index: index,
        parentChildrenCount: parent.children.length
      });
      return false;
    }

    // 3. 应用新坐标
    if (parentIsAutoLayout) {
      // 如果父级是 Auto Layout，不需要手动设置坐标
      // Auto Layout 会自动管理子元素的位置
      // 由于子元素在 frame A 中的位置是 (0,0)，且 frame A 的尺寸与子元素一致
      // 移除 frame A 后，子元素在 Auto Layout 中的位置会自动保持正确
    } else {
      // 如果父级不是 Auto Layout，需要计算绝对坐标补偿
      // 公式：新位置 = 爷爷里的冗余容器位置 + 容器里的子元素位置
      // (注：由于我们在前面做了坐标原点检查，这里的 child.x 通常接近 0，但加上更保险)
      try {
        const newX = node.x + child.x;
        const newY = node.y + child.y;
        child.x = newX;
        child.y = newY;
      } catch (error) {
        console.error(`unwrapNode [${nodeName} (${nodeId})]: Failed to set child position: ${error.message}`);
        // 继续执行，因为位置设置失败不应该阻止移除
      }
    }

    // 4. 销毁冗余节点
    try {
      // 再次验证节点是否仍然有效
      if (!node.parent) {
        console.error(`unwrapNode [${nodeName} (${nodeId})]: Node has no parent before remove (may have been removed already)`);
        return false;
      }
      
      node.remove();
      
      // 验证节点是否被成功移除
      try {
        // 尝试访问节点，如果节点已被移除，这会抛出错误
        const test = node.id;
        console.warn(`unwrapNode [${nodeName} (${nodeId})]: Node still accessible after remove, may not have been removed`);
      } catch (e) {
        // 节点已被移除，这是正常的
      }
    } catch (error) {
      console.error(`unwrapNode [${nodeName} (${nodeId})]: Failed to remove node: ${error.message}`);
      console.error(`Error details:`, {
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        hasParent: !!node.parent,
        parentId: node.parent ? node.parent.id : null
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error(`unwrapNode [${nodeName} (${nodeId})]: Unexpected error: ${error.message}`);
    console.error(`Stack trace:`, error.stack);
    return false;
  }
}
