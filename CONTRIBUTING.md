# Contributing to Stardust Pit

Thanks for your interest. This guide is the short version of how work happens here. The long version (durable conventions for both humans and Claude) is [`CLAUDE.md`](https://github.com/StardustMT/stardust-workspace/blob/main/CLAUDE.md) in the workspace repo.

## The three living documents

Stardust uses a three-tier source of truth. Don't conflate them, and don't let them drift from reality.

- **Roadmap** — [stardustmt.github.io/docs/pit/roadmap/](https://stardustmt.github.io/docs/pit/roadmap/) — what ships, in what order, with exit criteria.
- **Issues** — [Project board](https://github.com/orgs/StardustMT/projects/1) — individually-implementable specifics. Context, acceptance criteria, refinement notes, work log, closure.
- **Docs** — [stardustmt.github.io/docs/pit/](https://stardustmt.github.io/docs/pit/) — the user textbook. At v1.0 a musician should be able to learn Pit entirely from here.

Before starting any work, read the relevant roadmap entry + issue(s) + existing docs page. Don't re-derive what's already written down.

## Filing an issue

Use one of the templates (the "New issue" button shows them):

- **Feature** — new user-visible functionality
- **Task** — infra / CI / tech-debt / docs / refactor / chore
- **Bug** — something broken or unexpected

Set the **milestone** (target version) and add an **area label**. Leave **Estimate** and **Priority** blank — those get set during the version's pre-feature refinement session.

## Picking up an issue

1. **Self-assign** + flip Status to **🔨 In Progress** on the board
2. **Branch** off `main`: `git checkout -b <type>/<short-slug>` (e.g. `feature/engine-rebind-routing`)
3. **Read the acceptance criteria**. If anything's hand-wavy, comment on the issue and clarify before coding — don't guess
4. **Log meaningful decisions** as issue comments while you work
5. **If new work surfaces**, file a new issue + cross-link it (use native GitHub **sub-issues** when it's a child of an umbrella, not text-only `#42` refs for parent/child relationships)

## Commits

- Reference the issue in the commit message: `Add engine_rebind_routing (#1)`
- One logical change per commit; commits should compile + tests pass
- **No `Co-Authored-By: Claude`** in messages — workspace convention

## Pull requests

The PR template asks you to:

- Link the issue this closes (`Closes #N`)
- Paste the acceptance-criteria checklist with ticks
- Include screenshots/GIFs if any UI changed (until [#113](https://github.com/StardustMT/stardust-pit/issues/113) auto-screenshot pipeline ships)
- Note tests run + docs updated (if the feature ships)

PRs land small. A reviewer should read the whole diff in one sitting. CI must pass (once PR CI from [#10](https://github.com/StardustMT/stardust-pit/issues/10) lands).

## Storybook-first for UI

Any UI-related feature without an existing Storybook story must have one **created first**, before functional code. Storybook is where the UX is critiqued and locked in.

Applies to: new screens, widgets, modals, inspector panels. Doesn't apply to: pure engine work with no UI surface, bug fixes to existing UI, internal refactors with no user-visible change.

## Closing an issue

When the work ships:

- Close the issue with a comment: **what shipped** + commit/PR ref
- Flip Status to **✅ Done** on the board (or **🧊 Deferred** with a one-line reason)
- Update the docs page for the feature in the same change — a shipped feature with stale docs is an incomplete feature

## Refinement + review sessions

Each version has two bookend sessions in addition to implementation:

- **Pre-feature refinement** at the start of a version: walk through every issue in the milestone with the maintainer, lock in acceptance criteria, set Estimate + Priority. Status flips through **🔍 Under refinement** then back to **📋 Planned** (criteria locked).
- **Post-feature review** after the version ships: what landed vs what was spec'd; spawn follow-ups; bring each shipped feature's docs page current.

## Issue field reference

| Field | When set | Values |
|---|---|---|
| **Type** | At creation, via template | `Feature` · `Task` · `Bug` |
| **Milestone** | At creation | `v0.6.0` … `v1.0.0` (closed: `v0.1.0` … `v0.5.0`) |
| **Labels** | At creation + as work clarifies | see below |
| **Status** | Throughout | `📋 Planned` → `🔍 Under refinement` → `📋 Planned` (locked) → `🔨 In Progress` → `🧪 Testing` → `👀 Review` → `✅ Done` (or `🧊 Deferred`) |
| **Estimate** | During refinement | `XS — <0.5d` · `S — ~1d` · `M — 2–3d` · `L — ~1wk` · `XL — 2wk+` |
| **Priority** | During refinement | `P0 — show-blocker` · `P1 — important` · `P2 — normal` · `P3 — someday` |
| **Assignee** | On pickup | Self-assign |

### Labels

**Area** (use at most one):

- `screen:setup` — Setup-mode UI
- `screen:program` — Program-mode UI
- `screen:perform` — Perform-mode UI
- `screen:splash` — Splash, wizards, onboarding
- `screen:floating` — Floating windows (Settings, plugin GUI, conductor cam pop-out)
- `engine:audio` — Audio engine, cpal, audio I/O
- `engine:midi` — MIDI input, MIDI Learn, hardware bindings
- `engine:plugin` — Plugin hosting, CLAP, sandboxing
- `engine:transport` — Transport, click, tempo, MIDI clock
- `engine:graph` — Patch graph, Plan, native nodes

**Cross-cutting** (use as needed, can combine):

- `tech-debt` — Carried debt with a target cleanup version
- `infrastructure` — CI/CD, build, release, tooling
- `documentation` / `docs` — Docs site or in-repo docs
- `extension` — Extension API surface
- `needs-refinement` — Umbrella issue or anything whose acceptance criteria need a spec session before pickup

## Accessibility

Every shipping UI feature must pass an accessibility audit before its version is tagged: WCAG 2.2 AA contrast, full keyboard nav, screen-reader compatible, focus indicators, reduced-motion respected. Not a v0.15.0-only obligation — every version.

## Where things live

- **App code** — this repo (`stardust-pit`)
- **Shared Rust libraries** — [`stardust-core`](https://github.com/StardustMT/stardust-core)
- **Docs + roadmap** — [`stardustmt.github.io`](https://github.com/StardustMT/stardustmt.github.io)
- **ADRs + conventions** — [`stardust-workspace`](https://github.com/StardustMT/stardust-workspace)
