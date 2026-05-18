import * as React from "react"
import { Lock, Unlock } from "lucide-react"
import { cn } from "@/lib/utils"
import { NODE_WIDTH } from "./patch-node"
import type { CompositeBlock, GraphNode } from "./_types"

const PADDING = 22
/** Approximate visible height per node. Bounding box can be slightly
 *  oversized rather than clip. */
const APPROX_NODE_HEIGHT = 170

export interface CompositeBlockFrameProps {
  composite: CompositeBlock
  nodes: GraphNode[]
  selected?: boolean
  onToggleLock?: () => void
  /** Click the label area — opens the composite's context menu. */
  onOpenMenu?: (anchor: { x: number; y: number }) => void
}

/**
 * Labelled bounding box wrapping a sub-graph. Title sits in the top-left
 * corner. The title chip is high-contrast (card background, accent border,
 * white text) so it stays readable against either light or dark themes.
 *
 * The title chip is the context-menu click target. Right-click on the
 * frame body opens the same menu.
 */
export function CompositeBlockFrame({
  composite,
  nodes,
  selected,
  onToggleLock,
  onOpenMenu,
}: CompositeBlockFrameProps) {
  if (nodes.length === 0) return null

  const rect = computeBounds(nodes)
  // Different accent per lock state — amber for locked (use it as-is), violet for editable.
  const accentVar = composite.locked ? "amber" : "violet"
  const borderClass =
    accentVar === "amber"
      ? "border-amber-500/70"
      : "border-violet-500/70"
  const bgClass =
    accentVar === "amber"
      ? "bg-amber-500/[0.06]"
      : "bg-violet-500/[0.06]"
  const borderStyle = composite.locked ? "border-solid" : "border-dashed"

  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-xl border-2",
        borderClass,
        bgClass,
        borderStyle,
        selected && "ring-2 ring-primary/40"
      )}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
      onContextMenu={(e) => {
        if (!onOpenMenu) return
        e.preventDefault()
        onOpenMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      {/* Title chip — high-contrast, click target for the menu */}
      <button
        type="button"
        className={cn(
          "pointer-events-auto absolute -top-[14px] left-3 flex items-center gap-1.5",
          "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm",
          "bg-card text-foreground",
          "hover:brightness-110",
          accentVar === "amber"
            ? "border-amber-400"
            : "border-violet-400"
        )}
        onClick={(e) => {
          e.stopPropagation()
          onOpenMenu?.({ x: e.clientX, y: e.clientY })
        }}
        title="Composite options"
      >
        <span
          onClick={(e) => {
            e.stopPropagation()
            onToggleLock?.()
          }}
          role="button"
          tabIndex={-1}
          className={cn(
            "grid size-4 place-items-center rounded hover:bg-muted",
            accentVar === "amber" ? "text-amber-400" : "text-violet-400"
          )}
          aria-label={composite.locked ? "Unlock composite" : "Lock composite"}
        >
          {composite.locked ? (
            <Lock className="size-3" />
          ) : (
            <Unlock className="size-3" />
          )}
        </span>
        <span className="normal-case">{composite.name}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{nodes.length} blocks</span>
      </button>
    </div>
  )
}

function computeBounds(nodes: GraphNode[]): {
  x: number
  y: number
  width: number
  height: number
} {
  const minX = Math.min(...nodes.map((n) => n.x))
  const minY = Math.min(...nodes.map((n) => n.y))
  const maxX = Math.max(...nodes.map((n) => n.x + NODE_WIDTH))
  const maxY = Math.max(...nodes.map((n) => n.y + APPROX_NODE_HEIGHT))
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  }
}
