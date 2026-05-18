import * as React from "react"
import { cn } from "@/lib/utils"
import { PatchNode, absolutePortPosition, nodeBounds } from "./patch-node"
import { PatchWire } from "./patch-wire"
import { CompositeBlockFrame } from "./composite-block"
import type {
  GraphNode,
  PatchGraph,
  Port,
  SignalKind,
  Wire,
} from "./_types"

// =============================================================================
// Drag types
// =============================================================================

/** A live drag-to-connect operation. */
interface WireDrag {
  fromNode: string
  fromPort: string
  /** Cached at drag-start so we don't re-derive on every move. */
  signal: SignalKind
  direction: "out" | "in"
  /** Anchor point in canvas-space (top-left of inner div). */
  anchor: { x: number; y: number }
  /** Live cursor position in canvas-space. */
  cursor: { x: number; y: number }
  /** Port the cursor is currently over (for snap-to-target highlight). */
  hovering: { nodeId: string; portId: string } | null
}

/** A live drag-to-move operation on a node. */
interface NodeDrag {
  nodeId: string
  /** Offset between pointer-down position and node origin. */
  offsetX: number
  offsetY: number
}

// =============================================================================
// Props
// =============================================================================

export interface PatchCanvasProps {
  graph: PatchGraph
  gridSize?: number
  selectedNodeId?: string
  selectedWireId?: string
  onSelectNode?: (id: string | undefined) => void
  onSelectWire?: (id: string | undefined) => void
  onMoveNode?: (id: string, x: number, y: number) => void
  onCreateWire?: (params: {
    fromNode: string
    fromPort: string
    toNode: string
    toPort: string
  }) => void
  onOpenCanvasMenu?: (anchor: { x: number; y: number }) => void
  onOpenNodeMenu?: (nodeId: string, anchor: { x: number; y: number }) => void
  onOpenWireMenu?: (wireId: string, anchor: { x: number; y: number }) => void
  onOpenCompositeMenu?: (
    compositeId: string,
    anchor: { x: number; y: number }
  ) => void
  activeNodeIds?: Set<string>
  activeWireIds?: Set<string>
  className?: string
}

// =============================================================================
// Canvas
// =============================================================================

export function PatchCanvas({
  graph,
  gridSize = 16,
  selectedNodeId,
  selectedWireId,
  onSelectNode,
  onSelectWire,
  onMoveNode,
  onCreateWire,
  onOpenCanvasMenu,
  onOpenNodeMenu,
  onOpenWireMenu,
  onOpenCompositeMenu,
  activeNodeIds,
  activeWireIds,
  className,
}: PatchCanvasProps) {
  // Refs for coordinate conversion (clientX/Y → canvas-space).
  const surfaceRef = React.useRef<HTMLDivElement>(null)

  // Convert a page-space pointer event to canvas-space (accounting for scroll).
  const toCanvasSpace = React.useCallback(
    (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const surface = surfaceRef.current
      if (!surface) return { x: 0, y: 0 }
      const rect = surface.getBoundingClientRect()
      return {
        x: e.clientX - rect.left + surface.scrollLeft,
        y: e.clientY - rect.top + surface.scrollTop,
      }
    },
    []
  )

  // Quick lookup of node by id.
  const nodeMap = React.useMemo(() => {
    const m = new Map<string, GraphNode>()
    for (const n of graph.nodes) m.set(n.id, n)
    return m
  }, [graph.nodes])

  // Connected port map per node (for visual cue on the port handle).
  const connectedPorts = React.useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const w of graph.wires) {
      addPort(m, w.fromNode, w.fromPort)
      addPort(m, w.toNode, w.toPort)
    }
    return m
  }, [graph.wires])

  // -------------------------------------------------------------------------
  // Drag-to-move-node
  // -------------------------------------------------------------------------

  const [nodeDrag, setNodeDrag] = React.useState<NodeDrag | null>(null)

  const onNodeBodyPointerDown =
    (nodeId: string) => (e: React.PointerEvent) => {
      const node = nodeMap.get(nodeId)
      if (!node) return
      const cs = toCanvasSpace(e)
      setNodeDrag({
        nodeId,
        offsetX: cs.x - node.x,
        offsetY: cs.y - node.y,
      })
      // Capture pointer so we keep getting moves even outside the header.
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    }

  // -------------------------------------------------------------------------
  // Drag-to-connect-wire
  // -------------------------------------------------------------------------

  const [wireDrag, setWireDrag] = React.useState<WireDrag | null>(null)

  const onPortPointerDown = (
    nodeId: string,
    portId: string,
    e: React.PointerEvent
  ) => {
    const node = nodeMap.get(nodeId)
    if (!node) return
    const port = node.ports.find((p) => p.id === portId)
    if (!port) return
    const anchor = absolutePortPosition(node, portId)
    if (!anchor) return
    const cs = toCanvasSpace(e)
    setWireDrag({
      fromNode: nodeId,
      fromPort: portId,
      signal: port.signal,
      direction: port.direction,
      anchor,
      cursor: cs,
      hovering: null,
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPortPointerEnter = (
    nodeId: string,
    portId: string,
    _e: React.PointerEvent
  ) => {
    if (!wireDrag) return
    // Snap-highlight only on compatible OPPOSITE-direction same-signal ports.
    const node = nodeMap.get(nodeId)
    if (!node) return
    const port = node.ports.find((p) => p.id === portId)
    if (!port) return
    if (port.signal !== wireDrag.signal) return
    if (port.direction === wireDrag.direction) return
    if (nodeId === wireDrag.fromNode) return
    setWireDrag({ ...wireDrag, hovering: { nodeId, portId } })
  }

  const onPortPointerLeave = (nodeId: string, portId: string) => {
    if (!wireDrag?.hovering) return
    if (
      wireDrag.hovering.nodeId === nodeId &&
      wireDrag.hovering.portId === portId
    ) {
      setWireDrag({ ...wireDrag, hovering: null })
    }
  }

  const onPortPointerUp = (
    nodeId: string,
    portId: string,
    _e: React.PointerEvent
  ) => {
    if (!wireDrag) return
    const node = nodeMap.get(nodeId)
    const port = node?.ports.find((p) => p.id === portId)
    if (
      port &&
      port.signal === wireDrag.signal &&
      port.direction !== wireDrag.direction &&
      nodeId !== wireDrag.fromNode
    ) {
      // Normalise: always go from output -> input regardless of drag direction.
      if (wireDrag.direction === "out") {
        onCreateWire?.({
          fromNode: wireDrag.fromNode,
          fromPort: wireDrag.fromPort,
          toNode: nodeId,
          toPort: portId,
        })
      } else {
        onCreateWire?.({
          fromNode: nodeId,
          fromPort: portId,
          toNode: wireDrag.fromNode,
          toPort: wireDrag.fromPort,
        })
      }
    }
    setWireDrag(null)
  }

  // Highlight map for any port currently in a drag-to-connect interaction.
  const highlightedByNode = React.useMemo(() => {
    const m = new Map<string, Record<string, boolean>>()
    if (wireDrag) {
      ensureHighlight(m, wireDrag.fromNode)[wireDrag.fromPort] = true
      if (wireDrag.hovering) {
        ensureHighlight(m, wireDrag.hovering.nodeId)[
          wireDrag.hovering.portId
        ] = true
      }
    }
    return m
  }, [wireDrag])

  // -------------------------------------------------------------------------
  // Global pointer handlers (move + up) — process active drags.
  // -------------------------------------------------------------------------

  React.useEffect(() => {
    if (!nodeDrag && !wireDrag) return
    const onMove = (e: PointerEvent) => {
      const cs = toCanvasSpace(e)
      if (nodeDrag) {
        const nx = Math.max(0, cs.x - nodeDrag.offsetX)
        const ny = Math.max(0, cs.y - nodeDrag.offsetY)
        onMoveNode?.(nodeDrag.nodeId, nx, ny)
      }
      if (wireDrag) {
        setWireDrag((d) => (d ? { ...d, cursor: cs } : d))
      }
    }
    const onUp = () => {
      if (nodeDrag) setNodeDrag(null)
      if (wireDrag) setWireDrag(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setNodeDrag(null)
        setWireDrag(null)
      }
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      window.removeEventListener("keydown", onKey)
    }
  }, [nodeDrag, wireDrag, onMoveNode, toCanvasSpace])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative h-full w-full overflow-auto bg-background",
        className
      )}
      style={{
        backgroundImage:
          "radial-gradient(circle, var(--border) 1px, transparent 1px)",
        backgroundSize: `${gridSize}px ${gridSize}px`,
      }}
      onContextMenu={(e) => {
        if (!onOpenCanvasMenu) return
        if ((e.target as HTMLElement).closest("[data-node-root]")) return
        e.preventDefault()
        onOpenCanvasMenu({ x: e.clientX, y: e.clientY })
      }}
      onPointerDown={(e) => {
        // Click on bare canvas deselects.
        if (e.target === e.currentTarget) {
          onSelectNode?.(undefined)
        }
      }}
    >
      <div
        className="relative"
        style={{ minWidth: 2400, minHeight: 1600 }}
      >
        {/* Composite block frames (behind everything) */}
        {graph.composites.map((c) => {
          const memberNodes = graph.nodes.filter((n) =>
            c.contains.includes(n.id)
          )
          return (
            <CompositeBlockFrame
              key={c.id}
              composite={c}
              nodes={memberNodes}
              onOpenMenu={
                onOpenCompositeMenu
                  ? (anchor) => onOpenCompositeMenu(c.id, anchor)
                  : undefined
              }
            />
          )
        })}

        {/* Wires (SVG) */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ overflow: "visible" }}
        >
          <g style={{ pointerEvents: "auto" }}>
            {graph.wires.map((w) => {
              const obstacles = computeObstacles(graph.nodes, w)
              return (
                <WireRenderer
                  key={w.id}
                  wire={w}
                  nodeMap={nodeMap}
                  obstacles={obstacles}
                  selected={w.id === selectedWireId}
                  active={activeWireIds?.has(w.id)}
                  onSelect={
                    onSelectWire ? () => onSelectWire(w.id) : undefined
                  }
                  onOpenMenu={
                    onOpenWireMenu
                      ? (anchor) => onOpenWireMenu(w.id, anchor)
                      : undefined
                  }
                />
              )
            })}
            {/* Ghost wire while drag-to-connect is in flight */}
            {wireDrag && (
              <GhostWire drag={wireDrag} nodeMap={nodeMap} />
            )}
          </g>
        </svg>

        {/* Nodes (HTML, on top of wires) */}
        {graph.nodes.map((n) => {
          const cnxSet = connectedPorts.get(n.id)
          const connectedMap: Record<string, boolean> = {}
          if (cnxSet) for (const p of cnxSet) connectedMap[p] = true
          return (
            <div
              key={n.id}
              data-node-root
              className="absolute"
              style={{ left: n.x, top: n.y }}
            >
              <PatchNode
                node={n}
                selected={n.id === selectedNodeId}
                active={activeNodeIds?.has(n.id)}
                connected={connectedMap}
                highlighted={highlightedByNode.get(n.id)}
                onSelect={
                  onSelectNode ? () => onSelectNode(n.id) : undefined
                }
                onBodyPointerDown={onNodeBodyPointerDown(n.id)}
                onOpenMenu={
                  onOpenNodeMenu
                    ? (anchor) => onOpenNodeMenu(n.id, anchor)
                    : undefined
                }
                onPortPointerDown={onPortPointerDown}
                onPortPointerEnter={onPortPointerEnter}
                onPortPointerLeave={onPortPointerLeave}
                onPortPointerUp={onPortPointerUp}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function WireRenderer({
  wire,
  nodeMap,
  obstacles,
  selected,
  active,
  onSelect,
  onOpenMenu,
}: {
  wire: Wire
  nodeMap: Map<string, GraphNode>
  obstacles: ReturnType<typeof computeObstacles>
  selected?: boolean
  active?: boolean
  onSelect?: () => void
  onOpenMenu?: (anchor: { x: number; y: number }) => void
}) {
  const fromNode = nodeMap.get(wire.fromNode)
  const toNode = nodeMap.get(wire.toNode)
  if (!fromNode || !toNode) return null
  const from = absolutePortPosition(fromNode, wire.fromPort)
  const to = absolutePortPosition(toNode, wire.toPort)
  if (!from || !to) return null
  const port = fromNode.ports.find((p) => p.id === wire.fromPort)
  if (!port) return null
  return (
    <PatchWire
      from={from}
      to={to}
      signal={port.signal}
      color={wire.color}
      selected={selected}
      active={active}
      obstacles={obstacles}
      onSelect={onSelect}
      onOpenMenu={onOpenMenu}
    />
  )
}

function GhostWire({
  drag,
  nodeMap,
}: {
  drag: WireDrag
  nodeMap: Map<string, GraphNode>
}) {
  // If hovering a valid target, snap the ghost to that port for clean visual.
  let to = drag.cursor
  if (drag.hovering) {
    const targetNode = nodeMap.get(drag.hovering.nodeId)
    if (targetNode) {
      const snap = absolutePortPosition(targetNode, drag.hovering.portId)
      if (snap) to = snap
    }
  }
  const from = drag.direction === "out" ? drag.anchor : to
  const target = drag.direction === "out" ? to : drag.anchor
  return (
    <PatchWire
      from={from}
      to={target}
      signal={drag.signal}
      // Ghost wire is slightly translucent + selected-styled.
      selected
    />
  )
}

function computeObstacles(
  allNodes: GraphNode[],
  wire: Wire
): ReturnType<typeof nodeBounds>[] {
  // Exclude source + target nodes (those are the endpoints, not obstacles).
  return allNodes
    .filter((n) => n.id !== wire.fromNode && n.id !== wire.toNode)
    .map((n) => nodeBounds(n))
}

function addPort(m: Map<string, Set<string>>, nodeId: string, portId: string) {
  let s = m.get(nodeId)
  if (!s) {
    s = new Set()
    m.set(nodeId, s)
  }
  s.add(portId)
}

function ensureHighlight(
  m: Map<string, Record<string, boolean>>,
  nodeId: string
): Record<string, boolean> {
  let r = m.get(nodeId)
  if (!r) {
    r = {}
    m.set(nodeId, r)
  }
  return r
}
