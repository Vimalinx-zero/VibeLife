# Pomodoro Break Chimes Design

**Date:** 2026-03-16

## Context

VibeLife 当前的专注计时器只有两种模式：

- `classic`: 固定时长倒计时
- `flow`: 正向累计时长

现有实现里，计时结束时只会统一触发一次 `playChime('complete')`，并且没有真正独立的“休息阶段”状态机。设置面板虽然已经有 `autoBreak` 开关，但当前代码并没有进入专门的休息倒计时流程，也没有“休息结束响铃”的能力。

用户现在要的行为更明确：

- `classic` 模式下，专注结束要响，休息结束也要响；
- `flow` 模式下，专注时长由用户自己决定，结束专注后自动进入休息；
- `flow` 的休息时长 = 本次专注分钟数 / 10；
- `flow` 只在休息结束时响；
- 休息时间要可调，至少 `classic` 模式要能在设置里调整。

## Goal

把番茄钟补成一个最小但完整的“专注 / 休息”双阶段计时器，让：

1. `classic` 模式支持真正的休息倒计时；
2. `flow` 模式结束专注后自动进入休息倒计时；
3. 不同阶段触发正确的提示音；
4. 设置面板支持调整 `classic` 休息时长；
5. 不引入外部音频文件，继续复用现有 Web Audio 铃声。

## Non-Goals

- 不重做计时器整体 UI 风格。
- 不新增复杂的多段番茄配置。
- 不做系统级桌面通知。
- 不为 `flow` 模式加入固定专注时长。

## Approaches Considered

### Approach A: 只补一个到点音效

继续沿用当前状态机，只在 `classic` 归零时补一声提示。

Pros:
- 改动最小。

Cons:
- 无法满足“休息结束也要响”；
- `flow` 模式仍然没有休息阶段；
- `autoBreak` 继续名存实亡。

### Approach B: 增加轻量阶段状态 `focus / break`

保留现有 `classic / flow` 模式划分，但给计时器增加单独的阶段状态，并把休息倒计时补齐。

Pros:
- 能完整覆盖用户要的行为；
- 不需要重做 UI；
- 可以把计时逻辑收敛成可测试的纯函数。

Cons:
- 需要调整 `MediaContext` 的计时状态结构；
- 需要同步更新设置和 UI 文案。

### Approach C: 重写整套番茄引擎

一次性支持多轮番茄、长休息、短休息、统计面板等。

Pros:
- 长期更完整。

Cons:
- 明显超出当前切口；
- 风险大，不符合这轮“顺手补齐”的目标。

## Decision

选择 **Approach B**。

这是能满足用户要求的最小完整方案：逻辑上补足休息阶段，表现上维持现有计时器界面，只增加必要状态和提示。

## Design

### 1. 计时器状态增加阶段字段

`frontend/src/context/MediaContext.tsx` 的计时器状态在现有基础上增加：

- `timerPhase: 'focus' | 'break'`

保留现有：

- `timerMode: 'classic' | 'flow'`
- `timerStatus: 'idle' | 'running' | 'paused'`

语义固定：

- `timerMode` 决定专注模式；
- `timerPhase` 决定当前显示的是专注阶段还是休息阶段；
- `timerStatus` 决定当前是否在计时。

### 2. 设置项新增休息时长

`frontend/src/context/ThemeContext.tsx` 的 `FocusSettings` 增加：

- `breakDuration: number`

默认值建议：

- `duration: 25`
- `breakDuration: 5`
- `autoBreak: false`

这个 `breakDuration` 只用于 `classic` 模式的休息时长。

### 3. `classic` 模式行为

#### 专注阶段

- `timerPhase = 'focus'`
- `timerSeconds` 从 `focusSettings.duration * 60` 倒计时到 0
- 到 0 时：
  - 播放 `playChime('complete')`
  - 记录一次 focus session
  - 如果 `autoBreak = true`：
    - 自动切到 `timerPhase = 'break'`
    - `timerSeconds = focusSettings.breakDuration * 60`
    - `timerStatus = 'running'`
  - 如果 `autoBreak = false`：
    - 回到 `idle`
    - `timerPhase = 'focus'`
    - `timerSeconds` 重置到专注时长

#### 休息阶段

- `timerPhase = 'break'`
- `timerSeconds` 从 `focusSettings.breakDuration * 60` 倒计时到 0
- 到 0 时：
  - 播放 `playChime('break')`
  - 回到 `idle`
  - `timerPhase = 'focus'`
  - `timerSeconds` 重置到专注时长

### 4. `flow` 模式行为

#### 专注阶段

- `timerPhase = 'focus'`
- `timerSeconds` 和 `flowDuration` 继续向上累计
- 用户点击停止时，才视为结束本次专注
- 结束专注时：
  - 记录一次 focus session
  - 不播放提示音
  - 自动进入休息阶段

#### 休息阶段

- `timerPhase = 'break'`
- 休息时长 = `ceil(flowDuration / 60 / 10)` 分钟，且最少 1 分钟
- `timerSeconds` 从该值倒计时到 0
- 到 0 时：
  - 播放 `playChime('break')`
  - 回到 `idle`
  - `timerPhase = 'focus'`
  - `timerSeconds = 0`
  - `flowDuration = 0`

### 5. 按钮行为保持直觉

#### `toggleTimer`

- `idle` 或 `paused` 时：开始 / 继续当前阶段
- `running` 时：暂停当前阶段

#### `stopTimer`

- `classic`
  - 无论在专注还是休息阶段，都直接回到 `idle`
  - 阶段重置为 `focus`
  - 秒数重置为专注时长
- `flow`
  - 如果当前在 `focus` 且 `running/paused`，把这次 stop 视为“结束专注并开始休息”
  - 如果当前已经在 `break`，stop 代表提前结束休息并回到 `idle`

### 6. UI 只做最小补充

计时器界面不重做，只增加最少必要状态提示：

- 在主时间数字附近显示一个小标签：
  - `专注中`
  - `休息中`
- `classic` 休息阶段的圆环继续按倒计时渲染
- `flow` 休息阶段也显示倒计时，而不是正计时

设置面板增加“休息时长”滑块或数值控件，用于控制 `breakDuration`。

### 7. 音效继续复用现有 Web Audio

不引入外部音频文件，继续使用 `frontend/src/utils/audio.ts`：

- `classic` 专注结束：`playChime('complete')`
- `classic` 休息结束：`playChime('break')`
- `flow` 休息结束：`playChime('break')`

当前 `playChime` 的现有序列足够，不需要新增音频资源。

## Data Flow

### Classic + AutoBreak

1. 用户开始 `classic` 专注；
2. 倒计时归零；
3. 播放 `complete`；
4. 记录专注 session；
5. 自动切到休息倒计时；
6. 休息归零；
7. 播放 `break`；
8. 回到 idle。

### Flow

1. 用户开始 `flow` 专注；
2. 用户点击 stop 结束专注；
3. 记录专注 session；
4. 按 `ceil(focusMinutes / 10)` 自动开始休息倒计时；
5. 休息归零；
6. 播放 `break`；
7. 回到 idle。

## Error Handling

- 铃声播放失败：仅记录 `console.warn/error`，不阻塞计时器状态切换；
- focus session 写库失败：记录错误，但仍按计时器状态继续；
- 非法休息时长：回退到最小 1 分钟；
- 本地设置缺失旧字段：自动补默认 `breakDuration = 5`。

## Testing

### Frontend Logic

建议把核心阶段切换逻辑提取成纯函数，并新增测试覆盖：

- `classic` 专注结束 + `autoBreak = true` 会切到休息；
- `classic` 专注结束 + `autoBreak = false` 会回到 idle；
- `classic` 休息结束会回到专注 idle；
- `flow` stop 会开始休息倒计时；
- `flow` 休息时长按 `ceil(focusMinutes / 10)` 计算；
- `flow` 休息结束只播放 `break`。

### UI / Type Safety

- `focusSettings` 旧存储数据能兼容新字段；
- `cd frontend && npx tsc --noEmit`
- `cd frontend && npm run build`

## Success Criteria

- `classic` 专注结束会响；
- `classic` 休息结束会响；
- `flow` 结束专注后自动开始休息；
- `flow` 休息结束会响；
- 设置面板可以调整 `classic` 休息时长；
- 现有 UI 不需要大改就能看懂当前处于专注还是休息阶段。
