# Actual browser playtests — 28 September 2026

These are two completed browser playthroughs, separate from the larger generated-map experiment. Both began from a blank map and reached the league preview through ordinary UI actions. No completed save was injected; no production leaderboard entry was submitted. The local server disabled leaderboard writes and returned an empty board.

The local preview served the compiled game imported at the start of the test, using rules edition 2 (the engine frozen for the parent experiment, c2ca839). The parent subsequently changed frontend controls and may change the engine; these results must not be presented as scores from a later rules edition.

| Run | Score | Peace | Durability | Cooperation | Wars | Revolutions/risings | Surviving states | Edition |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Blind arbitrary painting | 34 | 1/40 | 33/40 | 0/20 | 1 | 3 | 4 of 5 | 2-1XK1XFS |
| Considered regional painting | 92 | 34/40 | 38/40 | 20/20 | 0 | 2 | 10 of 10 | 2-1YDOAWN |

One run per style is not a population average. The observed difference was 58 points. These two UI runs are useful interaction checks and illustrative examples; use the separately reported randomized samples for averages.

## Method

- Isolated background browser tab at `http://127.0.0.1:8771/`, with fresh in-memory widget state and local-only score preview.
- Real pointer clicks and drags selected land; ordinary dropdowns selected names, statuses, religious affiliation and treaty partners; Assign/Save committed territories.
- Broad brush widths of 7–10 were used for regional strokes; width 1 was used for final city and coastal corrections.
- No JavaScript changed assignments or application state. DOM inspection was used only to read visible unassigned path labels and screen coordinates when tiny city/port cells proved hard to target. Pointer actions still did the painting.
- Each run covered all 763 hexes and triggered the normal completion dialog. The normal Save & See Results button saved the last pending paint.
- Scores were read from the rendered league preview after opening it from Results, without entering a name or pressing Join.

## Blind run

Used broad arbitrary strokes and accepted geographically nonsensical assignments. A large initial region became Italian-protected Hadhramaut. Later patches and missed cells became Russian colonial Turkey, Ibadi Palestine, a scattered Ottoman Sultanate consisting mainly of city cells, and independent Syria. There was no attempt to satisfy regional interests, coherent administration or resource access.

The result was War on the New Frontiers: one war, three risings/revolutions, four of five states surviving, and three lasting gains. The Turkish republic defeated and annexed the scattered Sultanate. The Shia representation condition failed. Russian and Italian connections created additional crises. This produced 34/100, with almost no peace credit and no cooperation credit.

## Considered run

Created a Turkish republic; Armenian and Kurdish autonomous territories associated with Turkey; independent Syria; a Shia imamate in lower Iraq called Zaydistan; independent Hejaz and Nejd; an Ibadi Hadhramaut near Oman; an international Jerusalem; and a one-cell Jeddah Free Port. Most independent governments and imamates had a British treaty association; Syria had a French treaty association. These were ordinary political choices, not an optimization search through random seeds.

The result was The Settlement Under Strain: no interstate wars, two constitutional revolutions, all ten states surviving and seventeen lasting gains. The Shia rule, Jerusalem, Jeddah, Armenian/Kurdish autonomy and Oman-neighbor conditions succeeded. Different partners for Syria and Hejaz caused a pilgrimage railway crisis. Some accidental Nejd fragments left by the coarse brush also caused a divided-administration penalty. Despite those mistakes, the score reached 92/100.

This suggests that a player who knows the intended regional arrangements can reach the nineties under this engine. It does not prove that the game is balanced, nor that a first-time player would know these arrangements.

## Interaction findings

1. The initial screen correctly entered Pan / inspect after Begin. Paint had to be explicitly selected.
2. Broad brush strokes did not reliably include isolated city cells. The last remaining cells were often marked cities, so a player could believe the surrounding area was complete while the city remained blank.
3. Constantinople, Haifa and Jeddah were particularly fiddly: the displayed city-cell bounding-box centre could fall over water. A click there reported protected/outside land; clicking the landward edge succeeded. This is reproducible UI friction even though all cells were eventually assignable.
4. Find unassigned land successfully located omissions, but its zoom/recentering animation needed to finish before using the new visual position. Immediate pointer actions using the prior frame could paint the wrong place.
5. The sidebar retained its scrolled position after territory saves. Important name/status/Assign controls could be above the visible portion of the panel, creating extra navigation. This is relevant to the user's mobile complaint about not seeing how to assign painted land.
6. The final completion dialog, pending-selection save, territory editing, results transition and local scoring all worked in both runs.

## Mobile recommendation

Show a persistent bottom action while there is pending paint: **Assign N hexes →**. Tapping it should reveal the territory form as a bottom sheet. Do not open the form during a stroke. After saving, collapse the sheet and show a brief “Territory saved — paint another” confirmation. With no selection, show a concise “Drag to paint land” hint instead. Keep the current territory's colour beside the action while editing, and use “Save territory changes” for that case.

This report contains observations only. No production source or deployment was changed by this browser-testing agent.
