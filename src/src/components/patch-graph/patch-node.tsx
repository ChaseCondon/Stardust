import * as React from "react"
import { cn } from "@/lib/utils"
import { PatchPort } from "./patch-port"
import { NodeBody, PluginChip, hasPluginChip, pluginChipName } from "./node-body"
import { CLASS_COLORS, classOf, type GraphNode, type Port } from "./_types"

export const NODE_WIDTH = 220

/** Pixel height of a node's header band — used by the wire-layout helpers. */
const HEADER_HEIGHT = 44

export interface PortDragHandle {
  /** Begin dragging a wire from this output port. */
  onPortPointerDown?: (
    nodeId: string,
    portId: string,
    e: React.PointerEvent
  ) => void
  /** Pointer entered an input port while a wire drag is in flight. */
  onPortPointerEnter?: (
    nodeId: string,
    portId: string,
    e: React.PointerEvent
  ) => void
  /** Pointer left an input port that we were hovering. */
  onPortPointerLeave?: (nodeId: string, portId: string) => void
  /** Pointer released on an input port — possibly completes a wire drag. */
  onPortPointerUp?: (
    nodeId: string,
    portId: string,
    e: React.PointerEvent
  ) => void
}

export interface PatchNodeProps extends PortDragHandle {
  node: GraphNode
  selected?: boolean
  /** Show signal-flow activity glow on the node frame. */
  active?: boolean
  /** Per-port connected map: connected[portId] === true if any wire touches it. */
  connected?: Record<string, boolean>
  /** Per-port highlighted map (drag-to-connect hover, etc). */
  highlighted?: Record<string, boolean>
  onSelect?: () => void
  /** Drag started on the node body (not on a port). */
  onBodyPointerDown?: (e: React.PointerEvent) => void
  /** Right-click context menu request. */
  onOpenMenu?: (anchor: { x: number; y: number }) => void
}

/**
 * A single graph node, styled like a guitar pedal: bold header strip with
 * class color + name + (for plugin nodes) the plugin chip; body shows
 * kind-specific inline controls; ports line both sides.
 *
 * Pointer handling:
 *   - mousedown on the body (not on a port): selection + drag-to-move
 *   - mousedown on an output port: starts a wire drag (handled at canvas level)
 *   - mouseup on an input port during a wire drag: completes a connection
 *   - context menu: opens via right-click
 */
export function PatchNode({
  node,
  selected,
  active,
  connected,
  highlighted,
  onSelect,
  onBodyPointerDown,
  onOpenMenu,
  onPortPointerDown,
  onPortPointerEnter,
  onPortPointerLeave,
  onPortPointerUp,
}: PatchNodeProps) {
  const cls = classOf(node.kind)
  const palette = CLASS_COLORS[cls]
  const inputs = node.ports.filter((p) => p.direction === "in")
  const outputs = node.ports.filter((p) => p.direction === "out")

  const headerBg = `oklch(0.35 0.08 ${palette.hue})`
  const headerText = `oklch(0.95 0.05 ${palette.hue})`
  const accent = `oklch(0.7 0.18 ${palette.hue})`

  const chipName = hasPluginChip(node) ? pluginChipName(node) : undefined

  return (
    <div
      style={{
        width: NODE_WIDTH,
        borderColor: selected ? accent : undefined,
        boxShadow: active
          ? `0 0 0 1px ${accent}, 0 0 16px -2px ${accent}`
          : selected
            ? `0 0 0 2px ${accent}`
            : undefined,
      }}
      className={cn(
        "rounded-md border bg-card text-card-foreground transition-shadow",
        "shadow-md hover:shadow-lg select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
      onContextMenu={(e) => {
        if (!onOpenMenu) return
        e.preventDefault()
        onOpenMenu({ x: e.clientX, y: e.clientY })
      }}
    >
      {/* Header — also the drag handle. Click selects; press+drag moves. */}
      <div
        className="flex cursor-grab items-center justify-between gap-2 rounded-t-md px-2.5 py-1.5 active:cursor-grabbing"
        style={{ background: headerBg, color: headerText, height: HEADER_HEIGHT }}
        onPointerDown={(e) => {
          // Left button only.
          if (e.button !== 0) return
          onSelect?.()
          onBodyPointerDown?.(e)
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[9px] font-semibold uppercase tracking-wider opacity-70">
              {palette.label}
            </span>
            {chipName && <PluginChip name={chipName} />}
          </div>
          <div className="truncate text-xs font-semibold">{node.name}</div>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-[auto_1fr_auto] gap-1.5 px-1.5 py-2">
        <div className="flex min-w-0 flex-col gap-1.5 pr-1">
          {inputs.map((p) => (
            <PortContainer
              key={p.id}
              node={node}
              port={p}
              connected={connected?.[p.id]}
              highlighted={highlighted?.[p.id]}
              onPortPointerDown={onPortPointerDown}
              onPortPointerEnter={onPortPointerEnter}
              onPortPointerLeave={onPortPointerLeave}
              onPortPointerUp={onPortPointerUp}
            />
          ))}
          {inputs.length === 0 && <span className="h-2" />}
        </div>

        <div className="min-w-0">
          <NodeBody node={node} />
        </div>

        <div className="flex min-w-0 flex-col items-end gap-1.5 pl-1">
          {outputs.map((p) => (
            <PortContainer
              key={p.id}
              node={node}
              port={p}
              connected={connected?.[p.id]}
              highlighted={highlighted?.[p.id]}
              onPortPointerDown={onPortPointerDown}
              onPortPointerEnter={onPortPointerEnter}
              onPortPointerLeave={onPortPointerLeave}
              onPortPointerUp={onPortPointerUp}
            />
          ))}
          {outputs.length === 0 && <span className="h-2" />}
        </div>
      </div>
    </div>
  )
}

/** Wraps PatchPort to intercept pointer events and forward node+port ids. */
function PortContainer({
  node,
  port,
  connected,
  highlighted,
  onPortPointerDown,
  onPortPointerEnter,
  onPortPointerLeave,
  onPortPointerUp,
}: {
  node: GraphNode
  port: Port
  connected?: boolean
  highlighted?: boolean
} & PortDragHandle) {
  return (
    <div
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.stopPropagation()
        onPortPointerDown?.(node.id, port.id, e)
      }}
      onPointerEnter={(e) => onPortPointerEnter?.(node.id, port.id, e)}
      onPointerLeave={() => onPortPointerLeave?.(node.id, port.id)}
      onPointerUp={(e) => onPortPointerUp?.(node.id, port.id, e)}
    >
      <PatchPort port={port} connected={connected} highlighted={highlighted} />
    </div>
  )
}

// =============================================================================
// Geometry helpers used by the canvas to draw wires between ports.
// =============================================================================

const BODY_TOP_PAD = 10
const PORT_ROW_HEIGHT = 20

export function portOffset(
  node: GraphNode,
  portId: string
): { x: number; y: number } | null {
  const port = node.ports.find((p) => p.id === portId)
  if (!port) return null
  const sideList = node.ports.filter((p) => p.direction === port.direction)
  const indexInSide = sideList.findIndex((p) => p.id === portId)
  if (indexInSide < 0) return null
  const x = port.direction === "in" ? 0 : NODE_WIDTH
  const y =
    HEADER_HEIGHT + BODY_TOP_PAD + indexInSide * PORT_ROW_HEIGHT + 5
  return { x, y }
}

export function absolutePortPosition(
  node: GraphNode,
  portId: string
): { x: number; y: number } | null {
  const offset = portOffset(node, portId)
  if (!offset) return null
  return { x: node.x + offset.x, y: node.y + offset.y }
}

/** Conservative node bounding box for wire-routing obstacle avoidance. */
export function nodeBounds(node: GraphNode): {
  x: number
  y: number
  width: number
  height: number
} {
  // Estimate height: header + body padding + ports + body content room.
  const portCount = Math.max(
    node.ports.filter((p) => p.direction === "in").length,
    node.ports.filter((p) => p.direction === "out").length
  )
  const bodyHeight = Math.max(
    BODY_TOP_PAD + portCount * PORT_ROW_HEIGHT + 20,
    // Bodies with mini-widgets (keyboards/pads) need more room:
    minBodyHeightForKind(node.kind)
  )
  return {
    x: node.x,
    y: node.y,
    width: NODE_WIDTH,
    height: HEADER_HEIGHT + bodyHeight,
  }
}

function minBodyHeightForKind(kind: GraphNode["kind"]): number {
  switch (kind) {
    case "source.keyboard":
      return 60
    case "source.pads":
      return 70
    case "instrument.plugin":
    case "instrument.sine":
      return 70
    case "audio.eq":
      return 60
    case "sink.main-out":
      return 60
    default:
      return 50
  }
}
