import * as React from "react"
import { SIGNAL_DEFAULT_COLORS, type SignalKind } from "./_types"

export interface PatchWireProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  signal: SignalKind
  /** Per-wire color override; falls back to signal default. */
  color?: string
  /** True while signal flows through it — pulse / glow effect. */
  active?: boolean
  selected?: boolean
  onSelect?: () => void
}

/**
 * Bézier-curved cable between two ports. Outgoing-direction tangents fan
 * the curve horizontally so the wire reads as "flowing right".
 *
 * Activity glow is a duplicate path beneath the main stroke with a wider
 * stroke + filter blur. CSS opacity animation pulses it.
 */
export function PatchWire({
  from,
  to,
  signal,
  color,
  active,
  selected,
  onSelect,
}: PatchWireProps) {
  const stroke = color ?? SIGNAL_DEFAULT_COLORS[signal]
  const path = bezierPath(from, to)
  return (
    <g
      onClick={onSelect}
      style={{ cursor: onSelect ? "pointer" : "default" }}
    >
      {/* Wide invisible hit target so the cable is clickable without pixel-perfect aim */}
      {onSelect && (
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
      )}
      {/* Glow underlay — appears only when active */}
      {active && (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={8}
          strokeLinecap="round"
          opacity={0.45}
          style={{ filter: "blur(3px)" }}
        />
      )}
      {/* Selection ring */}
      {selected && (
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth={5}
          strokeLinecap="round"
          opacity={0.5}
        />
      )}
      {/* Main cable */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  )
}

/** Cubic Bézier between two points, with horizontal tangents that scale with horizontal span. */
function bezierPath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const dx = to.x - from.x
  // Tangent length: 60% of horizontal distance, clamped so reverse/vertical wires still curve.
  const tangent = Math.max(40, Math.abs(dx) * 0.6)
  const c1 = { x: from.x + tangent, y: from.y }
  const c2 = { x: to.x - tangent, y: to.y }
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`
}
