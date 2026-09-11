# Grove UX rules

**Draft, review in chat.** Compiled from the runbook's "Product rules worth
not breaking" and the roadmap's Tutor/Confirm/Phone header/Setup/Layout
hygiene sections, as of the Stage 1 push (Sept 2026). Canonical source of
truth is still the runbook; treat this as a working checklist to run a UI
change against, not a substitute for reading the runbook itself. Rules 13-17
mirror the runbook's "Product rules worth not breaking" verbatim; that
section is their canonical source, not this file.

## Layout

1. Every text input is 16px or larger. Below 16px, iOS Safari zooms the page
   on focus and the layout clips.
2. `overflow-x: hidden` on `html, body`: the page body never scrolls
   sideways; a wide element gets its own `overflow-x: auto` container instead.
3. Fixed or sticky bottom bars pad for `env(safe-area-inset-bottom)`.
4. Under 480px wide: header icon-only where a label would crowd the row
   (e.g. Progress/Help). The grove tree-icon square always stays visible; the
   grove name shrinks font size first, then truncates with an ellipsis at a
   ~12-character floor. If the row still doesn't fit at very narrow widths,
   a trailing decorative chevron is what gives way, never the icon or the name.
5. A tutor reply is shown from its first line: the chat pane scrolls so a new
   tutor message's top sits just under the header, not the message's bottom.
6. Answer choices and the always-available Hint / "I don't know" live in the
   scroll area with the message they answer, not the fixed footer. Only the
   header and the text-input row stay fixed.
7. Long words wrap (`overflow-wrap: anywhere`) rather than overflowing a
   bubble or button.

## Motion

8. Motion confirms, it doesn't decorate: under 350ms, one thing at a time,
   nothing loops except the busy-typing dots.
9. The reduced-motion switch follows the OS `prefers-reduced-motion` setting;
   there is no separate in-app control for it.
10. A planting/growth animation runs once, under 400ms, no loop; reduced-motion
    shows the end state directly instead of the animation.

## Sound

11. No sound is ever a verdict: a miss and a solid answer share the same
    family and volume, only the contour differs. No buzzer.
12. Sounds are short and quiet, on by default; the student can turn them off
    from the account menu.

## Process (the ones that have already cost us something)

13. Ask, never tell: the tutor always asks a question before handing over an
    answer.
14. A miss never raises mastery. A hint or an honest "I don't know" is
    neutral, never counted as wrong.
15. No streaks, no daily quota: height on the grove tracks completed
    sessions, not calendar days.
16. Tone follows grade: high school and up gets a plain peer register, no
    baby talk.
17. The software owns the state; the model only generates intelligence.
    Concepts, mastery, and the answer key are durable app data, never
    re-derived from the model mid-conversation.
18. Every non-final tutor turn ends in something the student can act on (a
    question, or options): a flat statement with nothing to respond to
    wastes an exchange and an API call; code re-prompts once if the model
    drops this, then guarantees the shape as a last resort.

## Rendering guarantees

19. The question is bolded and in its own paragraph, every turn: a prompt
    rule guaranteed by the renderer (`autoboldQuestion` in `Tutor.js`).
20. If the model's output shape can vary, code guarantees the shape. Never
    loosen a prompt to work around a parse failure; extend the parser
    instead (`parseJSON` in `ai.js`).
