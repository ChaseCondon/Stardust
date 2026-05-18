import * as React from "react"
import { SIGNAL_DEFAULT_COLORS, type SignalKind } from "./_types"

/** Axis-aligned obstacle the wire should route around. */
export interface ObstacleRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PatchWireProps {
  from: { x: number; y: number }
  to: { x: number; y: number }
  signal: SignalKind
  /** Per-wire color override; falls back to signal default. */
  color?: string
  /** True while signal flows through it — pulse / glow effect. */
  active?: boolean
  selected?: boolean
  /**
   * Node bounding rects the wire should avoid. The source/target nodes
   * for this wire should NOT be in this list — they're the endpoints.
   * Used to pick an "above" or "below" deflection when the direct route
   * would cross a third-party node.
   */
  obstacles?: ObstacleRect[]
  onSelect?: () => void
  onOpenMenu?: (anchor: { x: number; y: number }) => void
}

/**
 * Bézier-curved cable between two ports with collision-avoiding routing.
 *
 * Step 1: try a simple Bézier with horizontal output / horizontal input
 * tangents. Sample at 24 points. If any sample lands inside an obstacle
 * (with padding), step 2 kicks in.
 *
 * Step 2: pick a Y above or below the offending cluster (whichever is
 * closer to the average of from.y and to.y) and re-issue the Bézier with
 * intermediate control points at that Y. The result is a wire that swoops
 * up or down to clear blocking nodes without losing the curve's flow.
 *
 * This is intentionally not a full orthogonal router — those produce
 * dense angular paths in tight layouts. A bent Bézier reads as one
 * smooth cable even in routed-around cases.
 */
export function PatchWire({
  from,
  to,
  signal,
  color,
  active,
  selected,
  obstacles,
  onSelect,
  onOpenMenu,
}: PatchWireProps) {
  const stroke = color ?? SIGNAL_DEFAULT_COLORS[signal]
  const path = routedBezier(from, to, obstacles ?? [])
  return (
    <g
      onClick={onSelect}
      onContextMenu={(e) => {
        if (!onOpenMenu) return
        e.preventDefault()
        onOpenMenu({ x: e.clientX, y: e.clientY })
      }}
      style={{ cursor: onSelect ? "pointer" : "default" }}
    >
      {/* Wide invisible hit target so the cable is clickable without pixel-perfect aim */}
      {(onSelect || onOpenMenu) && (
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
      )}
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

// =============================================================================
// Routing
// =============================================================================

const OBSTACLE_PADDING = 12
const SAMPLE_COUNT = 24

function routedBezier(
  from: { x: number; y: number },
  to: { x: number; y: number },
  obstacles: ObstacleRect[]
): string {
  // Step 1: try the straightforward path.
  const simpleControls = computeControls(from, to, from.y, to.y)
  const simplePath = bezierString(from, to, simpleControls.c1, simpleControls.c2)

  // No obstacles to worry about? Fast path.
  if (obstacles.length === 0) return simplePath

  // Step 2: check for collisions.
  const samples = sampleBezier(from, to, simpleControls.c1, simpleControls.c2, SAMPLE_COUNT)
  const colliding = obstacles.filter((obs) =>
    samples.some((s) => pointInRect(s, expand(obs, OBSTACLE_PADDING)))
  )

  if (colliding.length === 0) return simplePath

  // Step 3: route around the colliding cluster.
  const minY = Math.min(...colliding.map((o) => o.y - OBSTACLE_PADDING))
  const maxY = Math.max(
    ...colliding.map((o) => o.y + o.height + OBSTACLE_PADDING)
  )
  const avgY = (from.y + to.y) / 2

  // Pick the closer clearance — above or below.
  const distAbove = Math.abs(avgY - minY)
  const distBelow = Math.abs(avgY - maxY)
  const clearY = distAbove < distBelow ? minY : maxY

  // Re-issue with control points pulled to clearY. This shapes the curve
  // through that altitude without spiking — the tangents leave the source
  // horizontally then arc to clearY before arcing back to the target.
  const bent = computeControls(from, to, clearY, clearY)
  return bezierString(from, to, bent.c1, bent.c2)
}

function computeControls(
  from: { x: number; y: number },
  to: { x: number; y: number },
  c1y: number,
  c2y: number
): { c1: { x: number; y: number }; c2: { x: number; y: number } } {
  const dx = to.x - from.x
  // Stronger tangent when the wire bends — wider control distance gives
  // a smoother arc to the chosen clearance Y.
  const bending = c1y !== from.y || c2y !== to.y
  const tangent = Math.max(48, Math.abs(dx) * (bending ? 0.4 : 0.6))
  return {
    c1: { x: from.x + tangent, y: c1y },
    c2: { x: to.x - tangent, y: c2y },
  }
}

function bezierString(
  from: { x: number; y: number },
  to: { x: number; y: number },
  c1: { x: number; y: number },
  c2: { x: number; y: number }
): string {
  return `M ${from.x} ${from.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${to.x} ${to.y}`
}

function sampleBezier(
  p0: { x: number; y: number },
  p3: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  count: number
): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = new Array(count)
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const mt = 1 - t
    const mt2 = mt * mt
    const mt3 = mt2 * mt
    const t2 = t * t
    const t3 = t2 * t
    out[i] = {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
    }
  }
  return out
}

function pointInRect(p: { x: number; y: number }, r: ObstacleRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

function expand(r: ObstacleRect, pad: number): ObstacleRect {
  return {
    x: r.x - pad,
    y: r.y - pad,
    width: r.width + 2 * pad,
    height: r.height + 2 * pad,
  }
}
