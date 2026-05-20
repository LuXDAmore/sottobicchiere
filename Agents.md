# Agents

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.


## 0. SpecDD Rule

Before working on this project, read `.specdd/bootstrap.md`, then `.specdd/bootstrap.project.md`, then `.specdd/bootstrap.local.md` when present. Assume the role, rules, workflow, and implementation constraints described in SpecDD. Treat `.sdd` files as source-adjacent development contracts, not optional documentation. Resolve the relevant SpecDD chain before creating, editing, deleting, or moving code, and adhere to SpecDD unless the Operator explicitly instructs otherwise.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Documentation Rule

**Always update documentation as part of every coding session.**

After implementing a feature, fix or refactor:

1. **`TODO.md`**: mark completed items `[x]`, update `Parziale` entries, add new items if discovered, update the header date. Remove items that are fully superseded or no longer valid.
2. **`docs/agents-changelog.md`**: add an entry for the session with a dated heading, listing every significant new file or behaviour change. Do NOT modify `CHANGELOG.md` — it is managed by npm scripts.
3. **`docs/`**: if the change affects architecture, database schema, API surface, DevOps pipeline or operational guide, update the relevant file under `docs/`.
4. **`README.md`**: update only if the public-facing setup instructions, stack list or key workflows have changed.

Do not leave `TODO.md` with stale `[ ]` items that were actually implemented in the same session. Documentation updates must be committed in the same PR as the code changes they describe.
