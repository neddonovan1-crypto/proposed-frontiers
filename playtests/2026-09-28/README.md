# Playtest and mobile workflow report

Current rules: version 3. Tested on 28 September 2026.

## Current score comparison

| Approach | Complete maps | Average / 100 | Range |
|---|---:|---:|---:|
| Blind, coherent random regions | 100 | 27.16 | 0–57 |
| Blind, haphazard brush dabs | 100 | 7.72 | 0–34 |
| Blind combined | 200 | 17.44 | 0–57 |
| Deliberate, adapted to the current rules | 25 | 73.56 | 54–94 |

These are reproducible score-engine simulations of complete valid proposals, not hundreds of browser-click sessions. The adapted cohort was prepared before scoring; none of its 25 maps was discarded. It uses connected Shia imamates of 20–30 hexes with at least 82% of mapped Iraqi Shia land, so the size limit and coverage objective are compatible. Nine adapted proposals scored at least 80; no blind proposal did.

Two separate complete browser-click playthroughs under the previous rules scored 34 (blind) and 92 (deliberate). Those are useful interface checks, not current-version averages. See browser-report.md.

## Exploit and balance checks

The original all-imamate strategy averaged 97 across 25 maps; those exact maps now score zero. The previous optimized 100-point map also scores zero. Original conventional deliberate strategies averaged 71.97 before and 60.87 after; the new adapted strategies show that high scores remain possible.

The update includes several changes together: stable local government branches, financial exposure for British/French treaty partners, escalating imamate size penalties, and regional failure for four or more imamates. Paired score changes should not be attributed to a single one of these rules.

## Mobile checks

At a 390 × 844 browser viewport, verified initial Pan / inspect mode, painting a city hex, the persistent “Assign 1 hex” action, direct navigation to the assignment form, assigning Syria, and automatic return to the map. Editing uses “Review changes”; a Back to map action lets players continue painting. Desktop retains its visible side panel.

Gesture tests cover map pinch zoom, zoom bounds, rollback of accidental first-finger paint when a pinch begins, cancellation, and existing mouse behaviour. Physical-device pinch interaction was not tested.

All 61 automated checks pass. The deployed page matches the build. Test data and scripts in this directory are excluded from the website asset build; they add nothing to browser downloads.

## Evidence

- blind-after-report.md: paired replay of all 200 blind maps.
- deliberate-postfix-report.md: paired replay of 100 deliberate maps and 30 optimization attempts.
- deliberate-adapted-report.md: all 25 newly adapted proposals, without outcome filtering.
- JSON files: saved proposals, scores, events and outcomes for reproducibility.

No playtest scores were submitted to the public leaderboard.
