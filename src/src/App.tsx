import { EnginePanel } from "@/components/shell/engine-panel"
import { PatchEditor } from "@/screens/patch-editor"
import { DEFAULT_RIG, LSOH_SONGS, casualPatchGraph } from "@/screens/_seed-data"

/**
 * The real Stardust shell. The engine panel above the patch editor is
 * a diagnostic surface — pick a CLAP plugin + MIDI in + audio out, hit
 * Start, hear it play. The patch editor below still drives nothing
 * real; it'll wire to the engine once stardust-core grows the patch
 * graph types and the engine accepts serialised patches.
 */
export default function App() {
  return (
    <div className="flex h-screen flex-col">
      <EnginePanel />
      <div className="min-h-0 flex-1">
        <PatchEditor
          showName="Little Shop of Horrors"
          songs={LSOH_SONGS}
          graph={casualPatchGraph()}
          selectedPatchId="p1.1"
          patchName="Cold open"
          songName="Prologue"
          rigSources={DEFAULT_RIG}
        />
      </div>
    </div>
  )
}
