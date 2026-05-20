//! Tauri command surface exposed to the React UI.
//!
//! The bridge to `stardust-core`. Commands here translate UI requests
//! into calls on the engine library and shape the responses into
//! JSON-friendly types the frontend can render directly.
//!
//! Design rules for this module:
//!
//! - **Read-only commands first.** Discovery (list plugins / MIDI / audio
//!   devices) is safe to call from anywhere — no engine state to manage.
//!   Engine-state commands (start/stop/route) land in a dedicated engine
//!   thread module so we don't try to share `!Send` plugin handles.
//! - **JSON-friendly response types live here.** We don't leak the
//!   `stardust-core` types straight through — the UI gets a stable
//!   contract that survives engine refactors.
//! - **Errors are stringly-typed at the Tauri boundary** because Tauri
//!   wants `Serialize` on error variants and we don't want to enumerate
//!   every engine failure mode in the public surface. Logs on the Rust
//!   side carry the structured details for debugging.

use serde::{Deserialize, Serialize};
use stardust_core::audio;
use stardust_core::midi;
use stardust_core::plugin::clap;
use tauri::State;

use crate::engine::{EngineCommand, EngineHandle, EngineStatus, StartConfig};

// =============================================================================
// Plugin discovery
// =============================================================================

/// One CLAP plugin advertised by a discovered bundle.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClapPluginInfo {
    /// Path to the `.clap` bundle on disk.
    pub bundle_path: String,
    /// Unique identifier (e.g. `org.surge-synth-team.surge-xt`).
    pub id: String,
    pub name: String,
    pub vendor: String,
    pub version: String,
    pub description: String,
    /// CLAP feature tags (`instrument`, `audio-effect`, `stereo`, …).
    pub features: Vec<String>,
}

/// A bundle the scanner attempted but couldn't load.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClapScanError {
    pub path: String,
    pub message: String,
}

/// Combined response: every plugin found, every scan failure, and the
/// list of directories that were walked. Letting the UI render the
/// search paths helps users see why a plugin they think they have isn't
/// turning up.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClapScanResult {
    pub plugins: Vec<ClapPluginInfo>,
    pub errors: Vec<ClapScanError>,
    pub paths_scanned: Vec<String>,
}

#[tauri::command]
pub async fn list_clap_plugins() -> Result<ClapScanResult, String> {
    let paths = clap::default_clap_search_paths();
    let paths_scanned: Vec<String> = paths.iter().map(|p| p.display().to_string()).collect();
    let scan = clap::scan_paths(&paths);

    let mut plugins: Vec<ClapPluginInfo> = Vec::with_capacity(scan.bundles.len());
    for bundle in &scan.bundles {
        let bundle_path = bundle.path.display().to_string();
        for d in &bundle.descriptors {
            plugins.push(ClapPluginInfo {
                bundle_path: bundle_path.clone(),
                id: d.id.clone(),
                name: d.name.clone(),
                vendor: d.vendor.clone(),
                version: d.version.clone(),
                description: d.description.clone(),
                features: d.features.clone(),
            });
        }
    }
    let errors = scan
        .errors
        .iter()
        .map(|(p, m)| ClapScanError {
            path: p.display().to_string(),
            message: m.clone(),
        })
        .collect();

    Ok(ClapScanResult {
        plugins,
        errors,
        paths_scanned,
    })
}

// =============================================================================
// MIDI input devices
// =============================================================================

/// A MIDI input port the OS reported.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MidiInputInfo {
    pub name: String,
}

#[tauri::command]
pub async fn list_midi_inputs() -> Result<Vec<MidiInputInfo>, String> {
    midi::list_inputs()
        .map(|inputs| {
            inputs
                .into_iter()
                .map(|i| MidiInputInfo { name: i.name })
                .collect()
        })
        .map_err(|e| e.to_string())
}

// =============================================================================
// Audio output devices
// =============================================================================

/// An audio output device cpal reported.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioOutputInfo {
    pub name: String,
    pub is_default: bool,
}

#[tauri::command]
pub async fn list_audio_outputs() -> Result<Vec<AudioOutputInfo>, String> {
    audio::list_outputs()
        .map(|outs| {
            outs.into_iter()
                .map(|o| AudioOutputInfo {
                    name: o.name,
                    is_default: o.is_default,
                })
                .collect()
        })
        .map_err(|e| e.to_string())
}

// =============================================================================
// Engine state
//
// The host runs on a dedicated OS thread (see `engine` module) because
// `PluginInstance<H>` is `!Send`. These commands forward intent to that
// thread; the UI hears about state changes via the `engine://status`
// Tauri event, and can pull the current snapshot via `engine_status`.
// =============================================================================

/// What the UI sends with `engine_start`. Names come from
/// `list_clap_plugins` / `list_midi_inputs` / `list_audio_outputs`.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStartArgs {
    pub bundle_path: String,
    pub plugin_id: String,
    pub midi_input: String,
    /// `null` → host default output device.
    pub audio_output: Option<String>,
}

#[tauri::command]
pub fn engine_start(
    args: EngineStartArgs,
    engine: State<'_, EngineHandle>,
) -> Result<(), String> {
    engine.send(EngineCommand::Start(StartConfig {
        bundle_path: args.bundle_path.into(),
        plugin_id: args.plugin_id,
        midi_input: args.midi_input,
        audio_output: args.audio_output,
    }))
}

#[tauri::command]
pub fn engine_stop(engine: State<'_, EngineHandle>) -> Result<(), String> {
    engine.send(EngineCommand::Stop)
}

#[tauri::command]
pub fn engine_status(engine: State<'_, EngineHandle>) -> EngineStatus {
    engine.snapshot()
}
