# Deliberate playtests

Revision: c2ca839. Full proposals and seeds: deliberate-results.json.

Automated complete-map playthroughs through the current UI rules and canonical map metadata, then the same validation and results engine as the live game. Not physical mouse-click sessions. Rules-aware designs; exactly 25 pre-generated variants per strategy; no cohort selection by score.

|Strategy|n|Mean|Median|Min–max|P10–P90|Peace /40|Durability /40|Cooperation /20|
|---|---:|---:|---:|---:|---:|---:|---:|---:|
|Regional independence|25|59.1|58.0|53–74|54.0–65.6|2.9|36.2|20.0|
|Linked autonomy and transit treaties|25|82.2|84.0|63–97|71.4–94.2|24.0|38.2|20.0|
|Limited British and French protection|25|74.6|77.0|64–84|64.0–84.0|19.4|35.2|20.0|
|Rules-aware religious and treaty settlement|25|97.0|97.0|97–97|97.0–97.0|37.0|40.0|20.0|

Overall mean: **78.23/100**; median 78, range 53–97; p10 56, p90 97. All 100 proposals are included.

## Strategies

- **Regional independence:** Independent regional states, a Shia imamate in lower Iraq, internationally administered Jerusalem and Jeddah, no common foreign guarantor. Broad geographic regions with modest boundary variations.
- **Linked autonomy and transit treaties:** Armenia and Kurdistan autonomous with Turkey; Palestine and Transjordan autonomous with Syria. Syria, Hejaz, Nejd, Jebel Shammar and the Iraqi administrations use British treaty associations to keep divided routes open; lower Iraq is a Shia imamate.
- **Limited British and French protection:** A French-protected Syria and British-protected Hejaz and Nejd, with nearby Palestinian and Transjordanian autonomy linked to Syria. Turkey retains Armenian and Kurdish autonomies; lower Iraq is a Shia imamate.
- **Rules-aware religious and treaty settlement:** A secular Turkey with Armenian and Kurdish autonomies, Sunni imamates for the Arab regional governments, Shia lower Iraq and an Ibadi imamate toward Oman. British treaty associations coordinate routes without protectorate subsidies. This deliberately tests the favourable generic imamate branch.

## Reproducible examples

- Regional independence: median example regional_independence-51024, score 58, edition 2-1O4PIP0; best regional_independence-51005, score 74, edition 2-3JWKKK.
- Linked autonomy and transit treaties: median example linked_autonomy-52023, score 84, edition 2-14J7Q1Q; best linked_autonomy-52002, score 97, edition 2-1B7Q9UC.
- Limited British and French protection: median example limited_protection-53007, score 77, edition 2-QA0M0H; best limited_protection-53010, score 84, edition 2-78ENEB.
- Rules-aware religious and treaty settlement: median example rules_aware_imamates-54012, score 97, edition 2-X3RYZG; best rules_aware_imamates-54000, score 97, edition 2-A0VAIQ.

## Separate learning sequence

Separate 30-attempt score-seeking sequence. Each change is applied to the best-so-far valid proposal; non-improving proposals remain in the record but are not retained. Attempt25 tests the previously discovered imamate strategy. Not included in the 100-run cohort mean.

All attempted scores: 59, 68, 54, 62, 59, 56, 54, 61, 55, 62, 67, 61, 62, 61, 60, 56, 54, 75, 60, 57, 58, 79, 57, 55, 97, 100, 97, 100, 100, 97. Best after 30 attempts: **100/100**.

|Attempt|Action|Score|Retained|Best so far|
|---:|---|---:|---|---:|
|1|Initial regional proposal|59|Yes|59|
|2|Link Syria to British transit treaties|68|Yes|68|
|3|Link Transjordan to British transit treaties|54|No|68|
|4|Link Hejaz to British transit treaties|62|No|68|
|5|Link Nejd to British transit treaties|59|No|68|
|6|Link Jebel Shammar to British transit treaties|56|No|68|
|7|Link Mesopotamia to British transit treaties|54|No|68|
|8|Link the Shia imamate to the same transit treaty|61|No|68|
|9|Armenian autonomy with Turkey|55|No|68|
|10|Kurdish autonomy with Turkey|62|No|68|
|11|Palestinian autonomy with Syria|67|No|68|
|12|Asir as Sunni imamate|61|No|68|
|13|Hadhramaut as Ibadi imamate|62|No|68|
|14|Syria as Sunni imamate|61|No|68|
|15|Mesopotamia as Sunni imamate|60|No|68|
|16|Hejaz as Sunni imamate|56|No|68|
|17|Nejd as Sunni imamate|54|No|68|
|18|Jebel Shammar as Sunni imamate|75|Yes|75|
|19|Transjordan as Sunni imamate|60|No|75|
|20|Palestinian autonomy directly associated with Britain|57|No|75|
|21|Turkey in British treaty association|58|No|75|
|22|Compare French protectorate in Syria|79|Yes|79|
|23|Compare Armenian independent Russian treaty|57|No|79|
|24|Compare Kurdish independent British treaty|55|No|79|
|25|Try fully coordinated religious and treaty arrangement|97|Yes|97|
|26|Remove the railway treaty mismatch through Transjordan|100|Yes|100|
|27|Compare protectorate in Hejaz|97|No|100|
|28|Compare Sufi imamate in Hejaz|100|Yes|100|
|29|Compare independent Hadhramaut|100|Yes|100|
|30|Retain a reduced Ottoman capital|97|No|100|

## Interpretation and remaining balance issues

- The three conventional deliberate strategies average **71.97**, compared with **97.00** for the rules-aware imamate strategy. The combined 100-run mean of 78.23 should not be confused with the mean of an ordinary first-time informed player.
- Every attempt passes the same server-side validation. All 763 canonical hexes are assigned; at least 96.8% of mapped Shia area belongs to a Shia imamate. All named cities are deliberately assigned to regional governments or city charters; no inland Free Port or custom name is used. Regions are broad contiguous blocks, with up to 3 components in Syria or Transjordan because the simple coastline/latitude assignment leaves small fringe pieces.
- The rules-aware imamate strategy has no random adverse succession branch, whereas independent secular governments can receive a coup. Matching external treaty partners coordinates Arabian and railway disputes while avoiding the explicit protectorate Depression penalty. That is a dominant menu-choice combination, not convincing evidence of a better historical settlement.
- All 100 runs hit the cooperation cap of 20. Four strong achievements are enough; additional successes or partial failures provide little differentiation.
- The remaining 3-point crisis in the 97-point strategy is the Hejaz railway: Transjordan is autonomous to Syria, but Syria and Hejaz have Britain as partner. Compatibility is not transitive, so the child and its parent's treaty partner are treated as incompatible. Directly associating Transjordan with Britain produces 100 in learning attempt 26 (edition 2-P2VNP8).
- Learning attempts change the global seed, so even an apparently helpful individual policy edit can also reroll independent states' unrelated coups. This makes the score surface noisy and can frustrate intuitive incremental improvement.
- No game files or live leaderboard records were changed by these tests. The separate learning sequence reached 100/100; its best score is not included in the fixed cohort mean.

The pre-generated cohort contains 98 distinct scored maps: two of the 100 modest boundary perturbations land on the same hex borders as another run. These repeats remain included rather than being discarded after seeing their scores.
