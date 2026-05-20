import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  type AudioOutputInfo,
  type ClapPluginInfo,
  type EngineStatus,
  type MidiInputInfo,
  engineStart,
  engineStatus,
  engineStop,
  isTauri,
  listAudioOutputs,
  listClapPlugins,
  listMidiInputs,
  onEngineStatus,
} from "@/lib/tauri"

/**
 * Diagnostic engine controls — pick a CLAP plugin, MIDI input, audio
 * output, hit Start, hear the plugin play live. The patch editor below
 * still drives nothing real; this panel exists to prove the engine
 * thread + Tauri command surface works end-to-end before we wire the
 * patch graph to it.
 *
 * Hidden when not running inside Tauri (Storybook / web dev) — the
 * commands would fail anyway and the device lists would be empty.
 */
export function EnginePanel() {
  const inTauri = useMemo(() => isTauri(), [])
  if (!inTauri) return null
  return <EnginePanelInner />
}

function EnginePanelInner() {
  const [plugins, setPlugins] = useState<ClapPluginInfo[]>([])
  const [midiInputs, setMidiInputs] = useState<MidiInputInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<AudioOutputInfo[]>([])
  const [pluginKey, setPluginKey] = useState<string>("")
  const [midiInput, setMidiInput] = useState<string>("")
  const [audioOutput, setAudioOutput] = useState<string>("__default__")
  const [status, setStatus] = useState<EngineStatus>({ kind: "idle" })
  const [pending, setPending] = useState(false)
  // One-shot device refresh on mount. Live device swaps (USB controller
  // added after launch) need a Refresh button — added below.
  useEffect(() => {
    void refreshDevices(setPlugins, setMidiInputs, setAudioOutputs)
  }, [])

  // Initial status pull + subscribe to changes. The pull catches the
  // case where the engine is already running when the panel mounts
  // (e.g. HMR remount); the listener gets every subsequent change.
  const unlistenRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    let alive = true
    void engineStatus().then((s) => alive && setStatus(s))
    void onEngineStatus((s) => alive && setStatus(s)).then((u) => {
      if (!alive) {
        u()
        return
      }
      unlistenRef.current = u
    })
    return () => {
      alive = false
      unlistenRef.current?.()
      unlistenRef.current = null
    }
  }, [])

  // Default selections once the device lists arrive — pick the first
  // plugin, first MIDI input, default audio output. Keeps Start usable
  // with one click instead of three.
  useEffect(() => {
    if (!pluginKey && plugins.length > 0) {
      setPluginKey(pluginKeyOf(plugins[0]))
    }
  }, [plugins, pluginKey])
  useEffect(() => {
    if (!midiInput && midiInputs.length > 0) {
      setMidiInput(midiInputs[0].name)
    }
  }, [midiInputs, midiInput])

  const selectedPlugin = plugins.find((p) => pluginKeyOf(p) === pluginKey)
  const canStart =
    !pending &&
    selectedPlugin != null &&
    midiInput !== "" &&
    status.kind !== "running"
  const canStop = !pending && status.kind === "running"

  async function start() {
    if (!selectedPlugin) return
    setPending(true)
    try {
      await engineStart({
        bundlePath: selectedPlugin.bundlePath,
        pluginId: selectedPlugin.id,
        midiInput,
        audioOutput: audioOutput === "__default__" ? null : audioOutput,
      })
    } finally {
      setPending(false)
    }
  }

  async function stop() {
    setPending(true)
    try {
      await engineStop()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Engine
        </span>

        <select
          className="rounded border bg-background px-2 py-1 text-xs"
          value={pluginKey}
          onChange={(e) => setPluginKey(e.target.value)}
          disabled={status.kind === "running"}
        >
          {plugins.length === 0 && <option value="">No CLAP plugins found</option>}
          {plugins.map((p) => (
            <option key={pluginKeyOf(p)} value={pluginKeyOf(p)}>
              {p.name} — {p.vendor}
            </option>
          ))}
        </select>

        <select
          className="rounded border bg-background px-2 py-1 text-xs"
          value={midiInput}
          onChange={(e) => setMidiInput(e.target.value)}
          disabled={status.kind === "running"}
        >
          {midiInputs.length === 0 && <option value="">No MIDI inputs</option>}
          {midiInputs.map((m) => (
            <option key={m.name} value={m.name}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          className="rounded border bg-background px-2 py-1 text-xs"
          value={audioOutput}
          onChange={(e) => setAudioOutput(e.target.value)}
          disabled={status.kind === "running"}
        >
          <option value="__default__">Default output</option>
          {audioOutputs.map((o) => (
            <option key={o.name} value={o.name}>
              {o.name}
              {o.isDefault ? " (default)" : ""}
            </option>
          ))}
        </select>

        <Button size="sm" onClick={start} disabled={!canStart}>
          Start
        </Button>
        <Button size="sm" variant="outline" onClick={stop} disabled={!canStop}>
          Stop
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refreshDevices(setPlugins, setMidiInputs, setAudioOutputs)}
          disabled={status.kind === "running"}
          title="Re-scan plugins + devices"
        >
          Refresh
        </Button>

        <div className="ml-auto">
          <StatusLine status={status} />
        </div>
      </div>
    </div>
  )
}

function StatusLine({ status }: { status: EngineStatus }) {
  if (status.kind === "idle") {
    return <span className="text-xs text-muted-foreground">Idle</span>
  }
  if (status.kind === "error") {
    return (
      <span className="text-xs text-destructive" title={status.message}>
        Error: {status.message}
      </span>
    )
  }
  return (
    <span className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Running</span> · {status.pluginName} ·{" "}
      {status.audioOutput} @ {status.sampleRate / 1000} kHz / {status.channels}ch
      {status.droppedEvents > 0 && (
        <span className="ml-2 text-amber-600">⚠ {status.droppedEvents} dropped</span>
      )}
      {status.sampleRateMismatch && (
        <span className="ml-2 text-amber-600">⚠ sample-rate mismatch</span>
      )}
    </span>
  )
}

function pluginKeyOf(p: ClapPluginInfo): string {
  // bundle path + plugin id uniquely identifies a plugin (a bundle can
  // expose multiple descriptors).
  return `${p.bundlePath}::${p.id}`
}

async function refreshDevices(
  setPlugins: (p: ClapPluginInfo[]) => void,
  setMidi: (m: MidiInputInfo[]) => void,
  setAudio: (a: AudioOutputInfo[]) => void,
) {
  const [scan, midi, audio] = await Promise.all([
    listClapPlugins(),
    listMidiInputs(),
    listAudioOutputs(),
  ])
  setPlugins(scan.plugins)
  setMidi(midi)
  setAudio(audio)
}
