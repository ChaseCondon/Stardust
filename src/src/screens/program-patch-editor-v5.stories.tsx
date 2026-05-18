import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import {
  Box,
  Copy,
  Eye,
  Layers,
  Lock,
  Music,
  Palette,
  Pencil,
  Plus,
  Settings,
  Settings2,
  Trash2,
  Unlock,
  Volume2,
  Waves,
} from "lucide-react"
import {
  AppShellFrame,
  InspectorFrame,
} from "@/components/shell/app-shell-frame"
import type { AppMode } from "@/components/shell/nav-rail"
import { ShowOutline } from "@/components/show/show-outline"
import type {
  OutlineSong as ShowOutlineSong,
} from "@/components/show/show-outline"
import { Keyboard } from "@/components/rig/keyboard"
import { PatchCanvas } from "@/components/patch-graph/patch-canvas"
import { makeNode } from "@/components/patch-graph/_catalog"
import { NodeLibraryPanel } from "@/components/patch-graph/node-library-panel"
import { PatchTabRail, type PatchTabSpec } from "@/components/patch-graph/patch-tab-rail"
import {
  ContextMenu,
  type ContextMenuSection,
} from "@/components/patch-graph/context-menu"
import type {
  GraphNode,
  NodeKind,
  PatchGraph,
} from "@/components/patch-graph/_types"
import { CLASS_COLORS, classOf } from "@/components/patch-graph/_types"

const meta: Meta = {
  title: "Screens/Program/Patch Editor v5 — Node Graph",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Patch as a freeform node graph. v5 iteration 3 lands: " +
          "ShowOutline floating-island on the left, NodeLibraryPanel as a " +
          "matching card on the right, collapsible top + bottom tab rails " +
          "(pinnable), context menus on right-click everywhere, drag-to-move " +
          "nodes, drag-to-connect ports (with ghost wire + snap), smart wire " +
          "routing that avoids third-party node collisions. " +
          "Library drag-to-place and pan/zoom land in the next iteration.",
      },
    },
  },
}
export default meta
type Story = StoryObj

// =============================================================================
// Seed: songs / patches for the ShowOutline (left panel)
// =============================================================================

const LSOH_SONGS: ShowOutlineSong[] = [
  {
    id: "s1",
    number: 1,
    name: "Prologue",
    patches: [
      { id: "p1.1", number: 1, name: "Cold open" },
      { id: "p1.2", number: 2, name: "Underscoring" },
    ],
  },
  {
    id: "s2",
    number: 2,
    name: "Skid Row (Downtown)",
    patches: [
      { id: "p2.1", number: 1, name: "Verse groove" },
      { id: "p2.2", number: 2, name: "Chorus pads" },
      { id: "p2.3", number: 3, name: "Final lift" },
    ],
  },
  {
    id: "s3",
    number: 3,
    name: "Somewhere That's Green",
    patches: [
      { id: "p3.1", number: 1, name: "Solo piano" },
      { id: "p3.2", number: 2, name: "Strings entry" },
    ],
  },
  {
    id: "s4",
    number: 4,
    name: "Feed Me (Git It)",
    patches: [
      { id: "p4.1", number: 1, name: "Stab section" },
      { id: "p4.2", number: 2, name: "Growl bass + pads" },
    ],
  },
  {
    id: "s5",
    number: 5,
    name: "Suddenly Seymour",
    patches: [{ id: "p5.1", number: 1, name: "Acoustic + strings" }],
  },
]

// =============================================================================
// Seed graphs
// =============================================================================

function casualPatchGraph(): PatchGraph {
  const keyboard = makeNode("source.keyboard", { x: 80, y: 200 })
  keyboard.name = "Main keyboard"
  const sine = makeNode("instrument.sine", { x: 420, y: 200 })
  sine.name = "Sine synth"
  const out = makeNode("sink.main-out", { x: 760, y: 200 })

  return {
    nodes: [keyboard, sine, out],
    wires: [
      { id: "w1", fromNode: keyboard.id, fromPort: "out", toNode: sine.id, toPort: "midi-in" },
      { id: "w2", fromNode: sine.id, fromPort: "audio-l", toNode: out.id, toPort: "in-l" },
      { id: "w3", fromNode: sine.id, fromPort: "audio-r", toNode: out.id, toPort: "in-r" },
    ],
    composites: [],
  }
}

function transposedSplitPatchGraph(): PatchGraph {
  const keyboard = makeNode("source.keyboard", { x: 80, y: 240 })
  keyboard.name = "Main keyboard"
  keyboard.ports = [
    { id: "out-low", label: "Low (C2–B3)", signal: "midi", direction: "out", config: { kind: "zone", fromNote: 36, toNote: 59 } },
    { id: "out-high", label: "High (C4–C8)", signal: "midi", direction: "out", config: { kind: "zone", fromNote: 60, toNote: 108 } },
  ]

  const transpose = makeNode("midi.transpose", { x: 400, y: 100 })
  transpose.name = "−12 semitones"
  transpose.config = { semitones: -12 }

  const bass = makeNode("instrument.plugin", { x: 700, y: 100 })
  bass.name = "Bass synth"
  bass.config = { pluginUri: "Surge XT", preset: "MS-20 Bass" }

  const lead = makeNode("instrument.plugin", { x: 700, y: 400 })
  lead.name = "Lead synth"
  lead.config = { pluginUri: "Surge XT", preset: "Modern Brass" }

  const mix = makeNode("audio.mix", { x: 1040, y: 260 })
  mix.name = "Sum"

  const out = makeNode("sink.main-out", { x: 1380, y: 260 })

  return {
    nodes: [keyboard, transpose, bass, lead, mix, out],
    wires: [
      { id: "w1", fromNode: keyboard.id, fromPort: "out-low", toNode: transpose.id, toPort: "in" },
      { id: "w2", fromNode: transpose.id, fromPort: "out", toNode: bass.id, toPort: "midi-in" },
      { id: "w3", fromNode: keyboard.id, fromPort: "out-high", toNode: lead.id, toPort: "midi-in" },
      { id: "w4", fromNode: bass.id, fromPort: "audio-l", toNode: mix.id, toPort: "in-1-l" },
      { id: "w5", fromNode: bass.id, fromPort: "audio-r", toNode: mix.id, toPort: "in-1-r" },
      { id: "w6", fromNode: lead.id, fromPort: "audio-l", toNode: mix.id, toPort: "in-2-l" },
      { id: "w7", fromNode: lead.id, fromPort: "audio-r", toNode: mix.id, toPort: "in-2-r" },
      { id: "w8", fromNode: mix.id, fromPort: "out-l", toNode: out.id, toPort: "in-l" },
      { id: "w9", fromNode: mix.id, fromPort: "out-r", toNode: out.id, toPort: "in-r" },
    ],
    composites: [],
  }
}

function pianoWithSendsPatchGraph(): PatchGraph {
  const keyboard = makeNode("source.keyboard", { x: 80, y: 180 })
  keyboard.name = "Main keyboard"
  const sustain = makeNode("source.sustain-pedal", { x: 80, y: 420 })
  sustain.name = "Sustain"

  const piano = makeNode("instrument.plugin", { x: 440, y: 240 })
  piano.name = "Piano"
  piano.config = { pluginUri: "Surge XT", preset: "Felt Piano" }

  const eq = makeNode("audio.eq", { x: 800, y: 140 })
  eq.name = "EQ"
  eq.config = { low: 2, mid: -1, high: 3 }

  const reverb = makeNode("audio.eq", { x: 800, y: 420 })
  reverb.name = "Reverb"

  const mix = makeNode("audio.mix", { x: 1120, y: 260 })
  mix.name = "Dry + wet"

  const out = makeNode("sink.main-out", { x: 1440, y: 260 })

  return {
    nodes: [keyboard, sustain, piano, eq, reverb, mix, out],
    wires: [
      { id: "w1", fromNode: keyboard.id, fromPort: "out", toNode: piano.id, toPort: "midi-in" },
      { id: "w2", fromNode: sustain.id, fromPort: "out", toNode: piano.id, toPort: "midi-in" },
      { id: "w3", fromNode: piano.id, fromPort: "audio-l", toNode: eq.id, toPort: "in-l" },
      { id: "w4", fromNode: piano.id, fromPort: "audio-r", toNode: eq.id, toPort: "in-r" },
      { id: "w5", fromNode: piano.id, fromPort: "audio-l", toNode: reverb.id, toPort: "in-l" },
      { id: "w6", fromNode: piano.id, fromPort: "audio-r", toNode: reverb.id, toPort: "in-r" },
      { id: "w7", fromNode: eq.id, fromPort: "out-l", toNode: mix.id, toPort: "in-1-l" },
      { id: "w8", fromNode: eq.id, fromPort: "out-r", toNode: mix.id, toPort: "in-1-r" },
      { id: "w9", fromNode: reverb.id, fromPort: "out-l", toNode: mix.id, toPort: "in-2-l" },
      { id: "w10", fromNode: reverb.id, fromPort: "out-r", toNode: mix.id, toPort: "in-2-r" },
      { id: "w11", fromNode: mix.id, fromPort: "out-l", toNode: out.id, toPort: "in-l" },
      { id: "w12", fromNode: mix.id, fromPort: "out-r", toNode: out.id, toPort: "in-r" },
    ],
    composites: [],
  }
}

function compositeBlockPatchGraph(): PatchGraph {
  const keyboard = makeNode("source.keyboard", { x: 80, y: 220 })
  keyboard.name = "Main keyboard"
  const expression = makeNode("source.expression-pedal", { x: 80, y: 480 })
  expression.name = "Leslie speed pedal"

  const organ = makeNode("instrument.plugin", { x: 480, y: 180 })
  organ.name = "B3 organ"
  organ.config = { pluginUri: "Surge XT", preset: "Tonewheel" }

  const leslie = makeNode("audio.eq", { x: 800, y: 180 })
  leslie.name = "Leslie sim"

  const out = makeNode("sink.main-out", { x: 1140, y: 220 })

  return {
    nodes: [keyboard, expression, organ, leslie, out],
    wires: [
      { id: "w1", fromNode: keyboard.id, fromPort: "out", toNode: organ.id, toPort: "midi-in" },
      { id: "w2", fromNode: expression.id, fromPort: "out", toNode: leslie.id, toPort: "in-l" },
      { id: "w3", fromNode: organ.id, fromPort: "audio-l", toNode: leslie.id, toPort: "in-l" },
      { id: "w4", fromNode: organ.id, fromPort: "audio-r", toNode: leslie.id, toPort: "in-r" },
      { id: "w5", fromNode: leslie.id, fromPort: "out-l", toNode: out.id, toPort: "in-l" },
      { id: "w6", fromNode: leslie.id, fromPort: "out-r", toNode: out.id, toPort: "in-r" },
    ],
    composites: [
      {
        id: "c1",
        name: "B3 + Leslie",
        contains: [organ.id, leslie.id],
        locked: true,
        promotedPorts: [
          { id: "in", label: "Keys", direction: "in", signal: "midi", internalNode: organ.id, internalPort: "midi-in" },
          { id: "out-l", label: "Out L", direction: "out", signal: "audio", internalNode: leslie.id, internalPort: "out-l" },
          { id: "out-r", label: "Out R", direction: "out", signal: "audio", internalNode: leslie.id, internalPort: "out-r" },
        ],
      },
    ],
  }
}

// =============================================================================
// Stories
// =============================================================================

export const CasualPatch: Story = {
  name: "Casual patch (Keyboard → Sine → Output)",
  render: () => (
    <PatchEditorShell graph={casualPatchGraph()} selectedPatchId="p1.1" />
  ),
}

export const SplitWithTranspose: Story = {
  name: "Split keyboard + transpose + parallel synths",
  render: () => (
    <PatchEditorShell graph={transposedSplitPatchGraph()} selectedPatchId="p4.2" />
  ),
}

export const PianoWithSends: Story = {
  name: "Piano with EQ + reverb send (auto-merged MIDI in)",
  render: () => (
    <PatchEditorShell graph={pianoWithSendsPatchGraph()} selectedPatchId="p3.1" />
  ),
}

export const WithCompositeBlock: Story = {
  name: "With composite block (B3 + Leslie, locked)",
  render: () => (
    <PatchEditorShell
      graph={compositeBlockPatchGraph()}
      selectedPatchId="p2.2"
      savedComposites={[
        { id: "b3", name: "B3 + Leslie", nodeCount: 2 },
        { id: "rhodes", name: "Rhodes + chorus + tape", nodeCount: 3 },
        { id: "pad", name: "Lush pad layer", nodeCount: 4 },
      ]}
    />
  ),
}

// =============================================================================
// Shell — graph editor with floating panels + tab rails + context menus
// =============================================================================

interface ContextMenuState {
  anchor: { x: number; y: number }
  sections: ContextMenuSection[]
}

function PatchEditorShell({
  graph: initialGraph,
  selectedPatchId: initialSelectedPatchId,
  savedComposites = [],
}: {
  graph: PatchGraph
  selectedPatchId?: string
  savedComposites?: Array<{ id: string; name: string; nodeCount: number }>
}) {
  const [mode, setMode] = React.useState<AppMode>("program")
  const [graph, setGraph] = React.useState<PatchGraph>(initialGraph)
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | undefined>()
  const [selectedWireId, setSelectedWireId] = React.useState<string | undefined>()
  const [selectedPatchId, setSelectedPatchId] = React.useState<string | undefined>(
    initialSelectedPatchId
  )
  const [contextMenu, setContextMenu] = React.useState<ContextMenuState | null>(null)

  // -----------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------

  const addNode = (kind: NodeKind) => {
    const x = 80 + ((graph.nodes.length * 32) % 240)
    const y = 100 + ((graph.nodes.length * 56) % 300)
    const node = makeNode(kind, { x, y })
    setGraph((g) => ({ ...g, nodes: [...g.nodes, node] }))
    setSelectedNodeId(node.id)
  }

  const moveNode = (id: string, x: number, y: number) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }))
  }

  const deleteNode = (id: string) => {
    setGraph((g) => ({
      ...g,
      nodes: g.nodes.filter((n) => n.id !== id),
      wires: g.wires.filter((w) => w.fromNode !== id && w.toNode !== id),
      composites: g.composites
        .map((c) => ({ ...c, contains: c.contains.filter((c2) => c2 !== id) }))
        .filter((c) => c.contains.length > 0),
    }))
    if (selectedNodeId === id) setSelectedNodeId(undefined)
  }

  const deleteWire = (id: string) => {
    setGraph((g) => ({ ...g, wires: g.wires.filter((w) => w.id !== id) }))
    if (selectedWireId === id) setSelectedWireId(undefined)
  }

  const createWire = (p: {
    fromNode: string
    fromPort: string
    toNode: string
    toPort: string
  }) => {
    // Prevent duplicate wires.
    const dup = graph.wires.find(
      (w) =>
        w.fromNode === p.fromNode &&
        w.fromPort === p.fromPort &&
        w.toNode === p.toNode &&
        w.toPort === p.toPort
    )
    if (dup) return
    const id = `w-${Date.now()}`
    setGraph((g) => ({ ...g, wires: [...g.wires, { id, ...p }] }))
  }

  const toggleCompositeLock = (id: string) => {
    setGraph((g) => ({
      ...g,
      composites: g.composites.map((c) =>
        c.id === id ? { ...c, locked: !c.locked } : c
      ),
    }))
  }

  // -----------------------------------------------------------------
  // Context menus
  // -----------------------------------------------------------------

  const openCanvasMenu = (anchor: { x: number; y: number }) => {
    setContextMenu({
      anchor,
      sections: [
        {
          id: "quick-add",
          items: [
            { id: "add-keyboard", label: "Add keyboard", icon: Music, onSelect: () => addNode("source.keyboard") },
            { id: "add-sine", label: "Add sine synth", icon: Waves, onSelect: () => addNode("instrument.sine") },
            { id: "add-eq", label: "Add EQ", icon: Settings2, onSelect: () => addNode("audio.eq") },
            { id: "add-out", label: "Add output", icon: Volume2, onSelect: () => addNode("sink.main-out") },
          ],
        },
        {
          id: "library",
          items: [
            { id: "open-library", label: "Browse full library…", icon: Layers, shortcut: "L", disabled: true },
          ],
        },
      ],
    })
  }

  const openNodeMenu = (nodeId: string, anchor: { x: number; y: number }) => {
    const node = graph.nodes.find((n) => n.id === nodeId)
    if (!node) return
    setContextMenu({
      anchor,
      sections: [
        {
          id: "edit",
          items: [
            { id: "rename", label: "Rename", icon: Pencil, disabled: true },
            { id: "duplicate", label: "Duplicate", icon: Copy, disabled: true },
            { id: "wrap", label: "Wrap as composite…", icon: Box, disabled: true },
          ],
        },
        {
          id: "destroy",
          items: [
            { id: "delete", label: "Delete node", icon: Trash2, variant: "danger", onSelect: () => deleteNode(nodeId) },
          ],
        },
      ],
    })
  }

  const openWireMenu = (wireId: string, anchor: { x: number; y: number }) => {
    setContextMenu({
      anchor,
      sections: [
        {
          id: "edit",
          items: [
            { id: "color", label: "Change cable color…", icon: Palette, disabled: true },
          ],
        },
        {
          id: "destroy",
          items: [
            { id: "delete", label: "Delete wire", icon: Trash2, variant: "danger", onSelect: () => deleteWire(wireId) },
          ],
        },
      ],
    })
  }

  const openCompositeMenu = (id: string, anchor: { x: number; y: number }) => {
    const c = graph.composites.find((x) => x.id === id)
    if (!c) return
    setContextMenu({
      anchor,
      sections: [
        {
          id: "state",
          items: [
            {
              id: "lock",
              label: c.locked ? "Unlock (edit contents)" : "Lock (drag as one)",
              icon: c.locked ? Unlock : Lock,
              onSelect: () => toggleCompositeLock(id),
            },
            { id: "rename", label: "Rename composite", icon: Pencil, disabled: true },
            { id: "save", label: "Save to My Blocks…", icon: Plus, disabled: true },
          ],
        },
        {
          id: "destroy",
          items: [
            { id: "unwrap", label: "Unwrap (keep nodes)", icon: Box, disabled: true },
            { id: "delete", label: "Delete (and contained nodes)", icon: Trash2, variant: "danger", disabled: true },
          ],
        },
      ],
    })
  }

  // -----------------------------------------------------------------
  // Top + bottom tab content
  // -----------------------------------------------------------------

  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId)

  const topTabs: PatchTabSpec[] = [
    {
      id: "global",
      label: "Global settings",
      content: <GlobalSettingsTab />,
    },
    {
      id: "mix",
      label: "Mix",
      content: <MixTab nodes={graph.nodes} />,
    },
    {
      id: "live",
      label: "Live preview",
      content: <LivePreviewTab nodes={graph.nodes} />,
    },
  ]

  const bottomTabs: PatchTabSpec[] = [
    {
      id: "inspector",
      label: "Inspector / Plugin UI",
      content: <InspectorTab node={selectedNode} />,
    },
    {
      id: "config",
      label: "Node config",
      content: <NodeConfigTab node={selectedNode} />,
    },
  ]

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  return (
    <>
      <AppShellFrame
        mode={mode}
        onModeChange={setMode}
        showName="Little Shop of Horrors"
        contextPanel={
          <ShowOutline
            showName="Little Shop of Horrors"
            songs={LSOH_SONGS}
            mode="program"
            currentPatchId={selectedPatchId}
            onPickPatch={(_s, p) => setSelectedPatchId(p)}
            className="h-full"
          />
        }
        inspector={
          <InspectorFrame>
            <NodeLibraryPanel
              onAddNode={addNode}
              savedComposites={savedComposites}
            />
          </InspectorFrame>
        }
        canvas={
          <div className="flex h-full flex-col">
            <PatchTabRail tabs={topTabs} side="top" />
            <div className="min-h-0 flex-1">
              <PatchCanvas
                graph={graph}
                selectedNodeId={selectedNodeId}
                selectedWireId={selectedWireId}
                onSelectNode={setSelectedNodeId}
                onSelectWire={setSelectedWireId}
                onMoveNode={moveNode}
                onCreateWire={createWire}
                onOpenCanvasMenu={openCanvasMenu}
                onOpenNodeMenu={openNodeMenu}
                onOpenWireMenu={openWireMenu}
                onOpenCompositeMenu={openCompositeMenu}
              />
            </div>
            <PatchTabRail tabs={bottomTabs} side="bottom" expandedHeight={280} />
          </div>
        }
      />

      {contextMenu && (
        <ContextMenu
          anchor={contextMenu.anchor}
          sections={contextMenu.sections}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
}

// =============================================================================
// Tab content
// =============================================================================

function GlobalSettingsTab() {
  return (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">
      <div className="max-w-md text-center">
        <Settings className="mx-auto mb-2 size-6 opacity-40" />
        Show-level settings (transition defaults, master level, post-mix FX rack)
        will land here.
      </div>
    </div>
  )
}

function MixTab({ nodes }: { nodes: GraphNode[] }) {
  const instruments = nodes.filter((n) => classOf(n.kind) === "instrument")
  if (instruments.length === 0) {
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">
        Add an instrument to see channel strips here.
      </div>
    )
  }
  return (
    <div className="flex h-full items-end gap-2">
      {instruments.map((n) => (
        <ChannelStrip key={n.id} node={n} />
      ))}
      <div className="ml-auto flex h-full flex-col items-center gap-2 border-l pl-3">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          Master
        </span>
        <Fader />
      </div>
    </div>
  )
}

function ChannelStrip({ node }: { node: GraphNode }) {
  const cls = CLASS_COLORS[classOf(node.kind)]
  return (
    <div
      className="flex h-full w-16 flex-col items-center gap-1.5 rounded-md border bg-card px-2 py-2"
      style={{ borderTopColor: `oklch(0.7 0.18 ${cls.hue})`, borderTopWidth: 3 }}
    >
      <span className="line-clamp-2 text-[9px] font-medium leading-tight">
        {node.name}
      </span>
      <Fader />
      <span className="font-mono text-[9px] text-muted-foreground">−6 dB</span>
    </div>
  )
}

function Fader() {
  return (
    <div className="relative h-24 w-3 flex-1 rounded-full bg-muted/40">
      <div
        className="absolute left-1/2 size-3.5 -translate-x-1/2 rounded-sm bg-foreground/40"
        style={{ top: "30%" }}
      />
    </div>
  )
}

function LivePreviewTab({ nodes }: { nodes: GraphNode[] }) {
  const keyboards = nodes.filter((n) => n.kind === "source.keyboard")
  if (keyboards.length === 0) {
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">
        <div className="max-w-md text-center">
          <Eye className="mx-auto mb-2 size-6 opacity-40" />
          Live performance widgets — keyboards with colored zones, level meters,
          patch name — will render here, derived from the graph above.
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {keyboards.map((kb) => {
        const zones = kb.ports
          .filter((p) => p.direction === "out" && p.config?.kind === "zone")
          .map((p, i) => {
            const cfg = p.config as { kind: "zone"; fromNote: number; toNote: number }
            return {
              id: p.id,
              label: p.label,
              fromNote: cfg.fromNote,
              toNote: cfg.toNote,
              color: `oklch(0.65 0.18 ${(i * 130) % 360})`,
            }
          })
        return (
          <div key={kb.id} className="rounded-md border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold">{kb.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {zones.length || 1} zone{zones.length === 1 ? "" : "s"}
              </span>
            </div>
            <Keyboard fromNote={21} toNote={108} whiteKeyWidth={9} zones={zones} readOnly />
          </div>
        )
      })}
    </div>
  )
}

function InspectorTab({ node }: { node: GraphNode | undefined }) {
  if (!node) {
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">
        Select a node on the canvas to see its inspector + plugin UI here.
      </div>
    )
  }
  if (node.kind === "instrument.plugin") {
    return (
      <div className="grid h-full place-items-center rounded border-2 border-dashed text-xs text-muted-foreground">
        <div className="max-w-md p-6 text-center">
          <Box className="mx-auto mb-2 size-6 opacity-40" />
          <div className="font-medium text-foreground">
            {(node.config?.pluginUri as string | undefined) ?? "(no plugin loaded)"}{" "}
            UI docks here
          </div>
          <div className="mt-1">
            CLAP / VST3 plugin GUIs embed in this region. Float-out via the
            window button (top-right of the bottom tab rail).
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="font-semibold">{node.name}</div>
      <div className="rounded border bg-muted/30 px-3 py-2 text-[10px] text-muted-foreground">
        Kind-specific settings (transpose semitones with stepper, EQ band detail,
        synth ADSR sliders, etc.) render here. POC version still under design —
        the in-node controls already cover quick edits.
      </div>
    </div>
  )
}

function NodeConfigTab({ node }: { node: GraphNode | undefined }) {
  if (!node) {
    return (
      <div className="grid h-full place-items-center text-xs text-muted-foreground">
        Select a node to edit its name, color, and port structure.
      </div>
    )
  }
  const palette = CLASS_COLORS[classOf(node.kind)]
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Name
          </label>
          <input
            defaultValue={node.name}
            className="h-8 rounded-md border bg-card px-2 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Header color
          </label>
          <div className="flex h-8 items-center gap-2 rounded-md border bg-card px-2">
            <span
              className="size-4 rounded"
              style={{ background: `oklch(0.55 0.15 ${palette.hue})` }}
            />
            <span className="font-mono text-[10px] text-muted-foreground">
              {palette.label}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Ports ({node.ports.length})
        </label>
        <div className="rounded-md border bg-card">
          {node.ports.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b px-3 py-1.5 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2 rounded-full"
                  style={{
                    background: p.signal === "midi" ? "oklch(0.7 0.15 280)" : "oklch(0.7 0.15 145)",
                  }}
                />
                <span className="font-mono text-[10px] text-muted-foreground">
                  {p.direction === "in" ? "←" : "→"}
                </span>
                <span>{p.label}</span>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                {p.signal}
              </span>
            </div>
          ))}
        </div>
        <div className="text-[10px] text-muted-foreground">
          Add/remove ports (keyboard zones, mix inputs) coming next iteration.
        </div>
      </div>
    </div>
  )
}
