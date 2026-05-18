import * as React from "react"
import { cn } from "@/lib/utils"
import { PatchPort } from "./patch-port"
import { CLASS_COLORS, type GraphNode } from "./_types"
import { classOf } from "./_types"

export const NODE_WIDTH = 200

export interface PatchNodeProps {
  node: GraphNode
  selected?: boolean
  /** Show signal-flow activity glow on the node frame (any-port activity). */
  active?: boolean
  /** Per-port connected map: connected[portId] === true if any wire touches it. */
  connected?: Record<string, boolean>
  /** Per-port highlighted map: highlighted[portId] === true while drawing a wire from/to it. */
  highlighted?: Record<string, boolean>
  onSelect?: () => void
}

/**
 * A single graph node. Header carries the class color + name; body shows the
 * config preview (kind-dependent); ports line both sides — inputs left,
 * outputs right.
 *
 * Layout-only for now. Drag interaction lands in a later iteration.
 */
export function PatchNode({
  node,
  selected,
  active,
  connected,
  highlighted,
  onSelect,
}: PatchNodeProps) {
  const cls = classOf(node.kind)
  const palette = CLASS_COLORS[cls]
  const inputs = node.ports.filter((p) => p.direction === "in")
  const outputs = node.ports.filter((p) => p.direction === "out")

  const headerBg = `oklch(0.35 0.08 ${palette.hue})`
  const headerText = `oklch(0.95 0.05 ${palette.hue})`
  const accent = `oklch(0.7 0.18 ${palette.hue})`

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
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
        "shadow-md hover:shadow-lg cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between gap-2 rounded-t-md px-2.5 py-1.5"
        style={{ background: headerBg, color: headerText }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[10px] font-semibold uppercase tracking-wider opacity-75">
            {palette.label}
          </div>
          <div className="truncate text-xs font-semibold">{node.name}</div>
        </div>
      </div>

      {/* Body: inputs left / config middle / outputs right */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 px-1.5 py-2">
        {/* Input ports */}
        <div className="flex flex-col gap-1.5">
          {inputs.map((p) => (
            <PatchPort
              key={p.id}
              port={p}
              connected={connected?.[p.id]}
              highlighted={highlighted?.[p.id]}
            />
          ))}
          {inputs.length === 0 && <span className="h-2" />}
        </div>

        {/* Optional middle config preview */}
        <NodeConfigPreview node={node} />

        {/* Output ports */}
        <div className="flex flex-col items-end gap-1.5">
          {outputs.map((p) => (
            <PatchPort
              key={p.id}
              port={p}
              connected={connected?.[p.id]}
              highlighted={highlighted?.[p.id]}
            />
          ))}
          {outputs.length === 0 && <span className="h-2" />}
        </div>
      </div>
    </div>
  )
}

function NodeConfigPreview({ node }: { node: GraphNode }) {
  // POC: just show a brief readout for the kinds where it's load-bearing.
  switch (node.kind) {
    case "midi.transpose": {
      const semitones = (node.config?.semitones as number | undefined) ?? 0
      const sign = semitones > 0 ? "+" : ""
      return (
        <span className="self-center font-mono text-[10px] text-muted-foreground">
          {sign}
          {semitones} st
        </span>
      )
    }
    case "instrument.plugin": {
      const uri = node.config?.pluginUri as string | undefined
      return (
        <span className="max-w-[60px] self-center truncate text-[10px] text-muted-foreground">
          {uri ?? "no plugin"}
        </span>
      )
    }
    case "instrument.sine": {
      const poly = (node.config?.polyphony as number | undefined) ?? 8
      return (
        <span className="self-center text-[10px] text-muted-foreground">
          {poly}-voice
        </span>
      )
    }
    default:
      return <span className="self-center" />
  }
}

// =============================================================================
// Geometry helpers used by the canvas to draw wires between ports.
// =============================================================================

const HEADER_HEIGHT = 36
const BODY_TOP_PAD = 8
const PORT_ROW_HEIGHT = 16

/** Pixel-space center of a port relative to the node's top-left corner. */
export function portOffset(node: GraphNode, portId: string): { x: number; y: number } | null {
  const port = node.ports.find((p) => p.id === portId)
  if (!port) return null
  const sideList = node.ports.filter((p) => p.direction === port.direction)
  const indexInSide = sideList.findIndex((p) => p.id === portId)
  if (indexInSide < 0) return null
  const x = port.direction === "in" ? 0 : NODE_WIDTH
  const y = HEADER_HEIGHT + BODY_TOP_PAD + indexInSide * PORT_ROW_HEIGHT + 5 // 5 ≈ port radius
  return { x, y }
}

/** Absolute canvas-space center of a port (node origin + offset). */
export function absolutePortPosition(
  node: GraphNode,
  portId: string
): { x: number; y: number } | null {
  const offset = portOffset(node, portId)
  if (!offset) return null
  return { x: node.x + offset.x, y: node.y + offset.y }
}
