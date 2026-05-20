/**
 * Typed wrappers around the Tauri command surface defined in
 * `src-tauri/src/commands.rs`. UI code should import these helpers
 * instead of calling `invoke()` directly — keeps the command names
 * and response shapes in one place so renaming a command is a
 * single-file change.
 *
 * Response types here mirror the `Serialize` impls in
 * `src-tauri/src/commands.rs` (with `serde(rename_all = "camelCase")`),
 * so anywhere the Rust side renames a field you need to update the
 * TypeScript shape too. There's no auto-generated bridge yet —
 * keeping things hand-typed for v0.2.
 */

import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

// =============================================================================
// Plugin discovery
// =============================================================================

export interface ClapPluginInfo {
  bundlePath: string
  id: string
  name: string
  vendor: string
  version: string
  description: string
  features: string[]
}

export interface ClapScanError {
  path: string
  message: string
}

export interface ClapScanResult {
  plugins: ClapPluginInfo[]
  errors: ClapScanError[]
  pathsScanned: string[]
}

export function listClapPlugins(): Promise<ClapScanResult> {
  return invoke<ClapScanResult>("list_clap_plugins")
}

// =============================================================================
// MIDI input devices
// =============================================================================

export interface MidiInputInfo {
  name: string
}

export function listMidiInputs(): Promise<MidiInputInfo[]> {
  return invoke<MidiInputInfo[]>("list_midi_inputs")
}

// =============================================================================
// Audio output devices
// =============================================================================

export interface AudioOutputInfo {
  name: string
  isDefault: boolean
}

export function listAudioOutputs(): Promise<AudioOutputInfo[]> {
  return invoke<AudioOutputInfo[]>("list_audio_outputs")
}

// =============================================================================
// Engine (plugin host)
// =============================================================================

export interface EngineStartArgs {
  bundlePath: string
  pluginId: string
  midiInput: string
  /** `null` → use the host's default audio output. */
  audioOutput: string | null
}

/**
 * Mirror of `engine::EngineStatus`. Tagged on `kind`; everything else
 * is only present in `running` / `error`.
 */
export type EngineStatus =
  | { kind: "idle" }
  | {
      kind: "running"
      pluginName: string
      pluginId: string
      midiInput: string
      audioOutput: string
      sampleRate: number
      channels: number
      droppedEvents: number
      sampleRateMismatch: boolean
    }
  | { kind: "error"; message: string }

export function engineStart(args: EngineStartArgs): Promise<void> {
  return invoke<void>("engine_start", { args })
}

export function engineStop(): Promise<void> {
  return invoke<void>("engine_stop")
}

export function engineStatus(): Promise<EngineStatus> {
  return invoke<EngineStatus>("engine_status")
}

/**
 * Subscribe to engine status changes. The engine thread emits one
 * event per state transition (Idle → Running, Stop, errors) plus
 * periodic updates while running if the dropped-event counter ticks.
 */
export function onEngineStatus(
  cb: (s: EngineStatus) => void,
): Promise<UnlistenFn> {
  return listen<EngineStatus>("engine://status", (e) => cb(e.payload))
}

// =============================================================================
// Tauri detection
// =============================================================================

/**
 * True if we're running inside the Tauri webview (so `invoke` calls
 * will reach the Rust side). False in plain web dev / Storybook —
 * caller can decide to render stub data instead of hitting the bridge
 * and getting an error.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}
