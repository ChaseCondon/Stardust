import { PatchEditor } from "@/screens/patch-editor"
import { DEFAULT_RIG, LSOH_SONGS, casualPatchGraph } from "@/screens/_seed-data"

/**
 * The real Stardust shell. Renders the patch editor with a default
 * seed (LSOH demo show, casual cold-open patch) until the Tauri
 * commands grow to load real persisted shows. Switching to other
 * fixtures or persisted state is a one-line change here.
 */
export default function App() {
  return (
    <PatchEditor
      showName="Little Shop of Horrors"
      songs={LSOH_SONGS}
      graph={casualPatchGraph()}
      selectedPatchId="p1.1"
      patchName="Cold open"
      songName="Prologue"
      rigSources={DEFAULT_RIG}
    />
  )
}
