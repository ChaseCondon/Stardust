import type { Meta, StoryObj } from "@storybook/react"
import * as React from "react"
import {
  AppShellFrame,
  InspectorFrame,
  Placeholder,
} from "@/components/shell/app-shell-frame"
import type { AppMode } from "@/components/shell/nav-rail"
import { PatchCanvas } from "@/components/patch-graph/patch-canvas"
import { makeNode } from "@/components/patch-graph/_catalog"
import type { PatchGraph } from "@/components/patch-graph/_types"

const meta: Meta = {
  title: "Screens/Program/Patch Editor v5 — Node Graph",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Patch as a freeform node graph. v5 redesign — replaces the linear " +
          "sound-chain model with a drag-drop signal-flow canvas. " +
          "This file is iteration 1: static rendering only. Drag, wire-draw, " +
          "library-add, composites, inspector, mix tab, live preview tab " +
          "land in subsequent passes.",
      },
    },
  },
}
export default meta
type Story = StoryObj

// =============================================================================
// Seed graphs — three flavours to exercise the visual range
// =============================================================================

function casualPatchGraph(): PatchGraph {
  // Minimal "casual user" patch: one controller, one instrument, one out.
  const keyboard = makeNode("source.keyboard", { x: 60, y: 200 })
  keyboard.name = "Main keyboard"
  const sine = makeNode("instrument.sine", { x: 360, y: 200 })
  sine.name = "Sine synth"
  const out = makeNode("sink.main-out", { x: 700, y: 200 })

  return {
    nodes: [keyboard, sine, out],
    wires: [
      {
        id: "w1",
        fromNode: keyboard.id,
        fromPort: "out",
        toNode: sine.id,
        toPort: "midi-in",
      },
      {
        id: "w2",
        fromNode: sine.id,
        fromPort: "audio-l",
        toNode: out.id,
        toPort: "in-l",
      },
      {
        id: "w3",
        fromNode: sine.id,
        fromPort: "audio-r",
        toNode: out.id,
        toPort: "in-r",
      },
    ],
    composites: [],
  }
}

function transposedSplitPatchGraph(): PatchGraph {
  // Keyboard with two zone outs: low → bass synth (transposed down 12);
  // high → lead synth, both summed to main out.
  const keyboard = makeNode("source.keyboard", { x: 60, y: 240 })
  keyboard.name = "Main keyboard"
  keyboard.ports = [
    {
      id: "out-low",
      label: "Low (C2–B3)",
      signal: "midi",
      direction: "out",
      config: { kind: "zone", fromNote: 36, toNote: 59 },
    },
    {
      id: "out-high",
      label: "High (C4–C8)",
      signal: "midi",
      direction: "out",
      config: { kind: "zone", fromNote: 60, toNote: 108 },
    },
  ]

  const transpose = makeNode("midi.transpose", { x: 340, y: 120 })
  transpose.name = "−12 semitones"
  transpose.config = { semitones: -12 }

  const bass = makeNode("instrument.plugin", { x: 600, y: 120 })
  bass.name = "Bass synth"
  bass.config = { pluginUri: "Surge XT", preset: "MS-20 Bass" }

  const lead = makeNode("instrument.plugin", { x: 600, y: 380 })
  lead.name = "Lead synth"
  lead.config = { pluginUri: "Surge XT", preset: "Modern Brass" }

  const mix = makeNode("audio.mix", { x: 920, y: 240 })
  mix.name = "Sum"

  const out = makeNode("sink.main-out", { x: 1220, y: 240 })

  return {
    nodes: [keyboard, transpose, bass, lead, mix, out],
    wires: [
      // Low zone → transpose → bass
      {
        id: "w1",
        fromNode: keyboard.id,
        fromPort: "out-low",
        toNode: transpose.id,
        toPort: "in",
      },
      {
        id: "w2",
        fromNode: transpose.id,
        fromPort: "out",
        toNode: bass.id,
        toPort: "midi-in",
      },
      // High zone → lead
      {
        id: "w3",
        fromNode: keyboard.id,
        fromPort: "out-high",
        toNode: lead.id,
        toPort: "midi-in",
      },
      // Bass → mix in 1
      {
        id: "w4",
        fromNode: bass.id,
        fromPort: "audio-l",
        toNode: mix.id,
        toPort: "in-1-l",
      },
      {
        id: "w5",
        fromNode: bass.id,
        fromPort: "audio-r",
        toNode: mix.id,
        toPort: "in-1-r",
      },
      // Lead → mix in 2
      {
        id: "w6",
        fromNode: lead.id,
        fromPort: "audio-l",
        toNode: mix.id,
        toPort: "in-2-l",
      },
      {
        id: "w7",
        fromNode: lead.id,
        fromPort: "audio-r",
        toNode: mix.id,
        toPort: "in-2-r",
      },
      // Mix → out
      {
        id: "w8",
        fromNode: mix.id,
        fromPort: "out-l",
        toNode: out.id,
        toPort: "in-l",
      },
      {
        id: "w9",
        fromNode: mix.id,
        fromPort: "out-r",
        toNode: out.id,
        toPort: "in-r",
      },
    ],
    composites: [],
  }
}

function pianoWithSendsPatchGraph(): PatchGraph {
  // Keyboard → piano → splitter → dry + (reverb send) → mix → out.
  // Plus a sustain pedal feeding the piano in parallel.
  const keyboard = makeNode("source.keyboard", { x: 60, y: 200 })
  keyboard.name = "Main keyboard"
  const sustain = makeNode("source.sustain-pedal", { x: 60, y: 400 })
  sustain.name = "Sustain"

  const midiMix = makeNode("midi.mix", { x: 320, y: 280 })

  const piano = makeNode("instrument.plugin", { x: 580, y: 280 })
  piano.name = "Piano"
  piano.config = { pluginUri: "Surge XT", preset: "Felt Piano" }

  const eq = makeNode("audio.eq", { x: 860, y: 200 })
  eq.name = "EQ"
  const reverb = makeNode("audio.eq", { x: 860, y: 420 })
  reverb.name = "Reverb"
  reverb.config = { low: 0, mid: 0, high: 0 } // placeholder until reverb node lands

  const mix = makeNode("audio.mix", { x: 1140, y: 280 })
  const out = makeNode("sink.main-out", { x: 1440, y: 280 })

  return {
    nodes: [keyboard, sustain, midiMix, piano, eq, reverb, mix, out],
    wires: [
      // Both MIDI sources into the mix node feeding the piano
      { id: "w1", fromNode: keyboard.id, fromPort: "out", toNode: midiMix.id, toPort: "in-1" },
      { id: "w2", fromNode: sustain.id, fromPort: "out", toNode: midiMix.id, toPort: "in-2" },
      { id: "w3", fromNode: midiMix.id, fromPort: "out", toNode: piano.id, toPort: "midi-in" },
      // Piano stereo into both EQ (dry) and reverb (send)
      { id: "w4", fromNode: piano.id, fromPort: "audio-l", toNode: eq.id, toPort: "in-l" },
      { id: "w5", fromNode: piano.id, fromPort: "audio-r", toNode: eq.id, toPort: "in-r" },
      { id: "w6", fromNode: piano.id, fromPort: "audio-l", toNode: reverb.id, toPort: "in-l" },
      { id: "w7", fromNode: piano.id, fromPort: "audio-r", toNode: reverb.id, toPort: "in-r" },
      // EQ + reverb → mix
      { id: "w8", fromNode: eq.id, fromPort: "out-l", toNode: mix.id, toPort: "in-1-l" },
      { id: "w9", fromNode: eq.id, fromPort: "out-r", toNode: mix.id, toPort: "in-1-r" },
      { id: "w10", fromNode: reverb.id, fromPort: "out-l", toNode: mix.id, toPort: "in-2-l" },
      { id: "w11", fromNode: reverb.id, fromPort: "out-r", toNode: mix.id, toPort: "in-2-r" },
      // Mix → out
      { id: "w12", fromNode: mix.id, fromPort: "out-l", toNode: out.id, toPort: "in-l" },
      { id: "w13", fromNode: mix.id, fromPort: "out-r", toNode: out.id, toPort: "in-r" },
    ],
    composites: [],
  }
}

// =============================================================================
// Stories
// =============================================================================

export const CasualPatch: Story = {
  name: "Casual patch (Keyboard → Sine → Output)",
  render: () => <PatchEditorShell graph={casualPatchGraph()} showName="Untitled show" />,
}

export const SplitWithTranspose: Story = {
  name: "Split keyboard + transpose + parallel synths",
  render: () => (
    <PatchEditorShell
      graph={transposedSplitPatchGraph()}
      showName="Little Shop of Horrors"
    />
  ),
}

export const PianoWithSends: Story = {
  name: "Piano with EQ + reverb send + sustain mixing",
  render: () => (
    <PatchEditorShell graph={pianoWithSendsPatchGraph()} showName="Little Shop of Horrors" />
  ),
}

// =============================================================================
// Shell — placeholders for the panels we'll fill in later iterations
// =============================================================================

function PatchEditorShell({
  graph,
  showName,
}: {
  graph: PatchGraph
  showName: string
}) {
  const [mode, setMode] = React.useState<AppMode>("program")
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | undefined>()

  return (
    <AppShellFrame
      mode={mode}
      onModeChange={setMode}
      showName={showName}
      contextPanel={
        <Placeholder
          title="Songs · Patches"
          body="Left panel: existing show outline (songs + patches). Lands in the wiring pass."
        />
      }
      inspector={
        <InspectorFrame>
          <Placeholder
            title="Node library"
            body="Right panel: catalog of base nodes + 'My Blocks' tab for saved composites. Drag onto canvas. Wired in the next iteration."
          />
        </InspectorFrame>
      }
      canvas={
        <PatchCanvas
          graph={graph}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      }
    />
  )
}
