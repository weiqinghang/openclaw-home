# 老君 UI 交付链路

适用场景：

- 飞书群里提出页面设计、交互设计、原型、设计图需求
- 希望由老君先和人类收敛，再交给 `uiux-designer` 执行
- 需要固定交付可交互原型、截图和设计说明

## 角色分工

### 老君负责

1. 收敛页面目标、用户类型、核心流程、页面范围
2. 追问风格参考、品牌约束、平台范围、验收人
3. 判断是新建类还是存量变更类
4. 输出 UI 任务包并路由给 `uiux-designer`
5. 回群汇报进度、风险、待拍板项与交付物

### `uiux-designer` 负责

1. 基于任务包产出可交互原型
2. 输出关键页面截图
3. 写设计说明和待确认项
4. 若提供 Figma 链接，优先走 Figma 实现链路

## 默认问题清单

老君在群里至少应补齐：

1. 这次要设计哪些页面或流程
2. 面向谁用
3. 核心任务是什么
4. 平台范围：Web / Mobile / Responsive
5. 风格参考：竞品、品牌、已有页面、Figma
6. 必须保留或必须避开的约束
7. 谁拍板
8. 这次期望交付到什么程度

## 默认交付物

无论用户怎么说，第一阶段默认交付：

1. `prototype/` 下的可交互原型
2. 关键页面截图
3. `docs/design/` 下的设计说明
4. 待确认项清单

## 项目目录落点

- 项目根：`~/Documents/OpenClawData/projects/<projectId>/`
- 设计说明：`~/Documents/OpenClawData/projects/<projectId>/docs/design/`
- 设计源文件：`~/Documents/OpenClawData/projects/<projectId>/design/`
- 可交互原型：`~/Documents/OpenClawData/projects/<projectId>/prototype/`

## Figma 路径

若用户给了 Figma 链接：

1. 老君在任务包里保留链接和目标节点
2. `uiux-designer` 执行时优先用：
   - `figma`
   - `figma-implement-design`

若用户没有给 Figma：

1. 先由 `uiux-designer` 产出高保真原型
2. 再用截图回传设计结果

## 群里汇报模板

老君对人汇报时，建议固定成：

1. 当前目标
2. 已交付内容
3. 查看路径 / 链接
4. 待确认项
5. 下一步

## 注意

1. 老君不把设计执行工件长期保留在自己的 workspace
2. 老君不直接把自己当 UI 设计师长期做图
3. 项目未绑定前，不进入设计执行
4. 设计任务仍需先完成 workflow 选择
