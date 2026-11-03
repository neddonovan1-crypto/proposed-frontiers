# Ruleset 4: harder peace and strategy trials

The exact saved 200 blind maps and 25 adapted deliberate maps were rescored without changing or selecting proposals. These are automated complete-map engine trials, not mouse-click sessions. The prior ruleset-3 deliberate cohort averaged 73.56 and all 25 retained their states without regional war.

|Cohort|Maps|Mean /100|Range|Maps with war|Maps losing states|
|---|---:|---:|---:|---:|---:|
|blind|200|15.60|0–53|148|191|
|adapted|25|61.04|44–83|14|13|

Under ruleset 4 the deliberate cohort averages one war and 14.32 of 15 surviving states. Four proposals still score at least 80. Eleven of 25 avoid interstate war, and 12 keep all their governments.

## New pressures

Stable local and border seeds govern 1933/1937 customs disputes. Real adjacency, railway crossings, weak finances and competing foreign patrons matter; common associations reduce escalation risk. Autonomous frontier disputes are uprisings rather than interstate wars. International city and port charters retain their distinct benefits.

Fiscal distress can bring a 1938 dissolution or negotiated union. Small grants, separated districts, earlier weakened finances and military debt increase pressure. Ports and established autonomy reduce it. A union requires a living associated neighbour or parent. If an annexing government later disappears, the former province no longer claims it as a living ruler. Surviving autonomies replace failed parent relationships. All 225 maps pass checks for living final rulers and no event participation after dissolution.

Identical proposals reproduce their history. Reopening Results does not reroll the timeline; new borders and arrangements change relevant pressures and outcomes. No guaranteed failure is imposed on an otherwise viable map.

## Best score found: 94/100

A separate bounded greedy search scored 295 legal policy changes on five promising geographical maps. This is optimisation, not a representative average or proof of the global optimum. Best edition **4-MQX9Q**: peace37/40, durability37/40, cooperation20/20; all15 states survive. Its sole scored negative is the British credit shock.

The strongest plan found uses independent Turkey, with Armenia and Kurdistan as its autonomies; international Jerusalem; a one-hex Free Port at Jeddah; and a connected25-hex Shia Zaydistan including Najaf and more than half the mapped Iraqi Shia area. Syria, Hejaz, Nejd and Zaydistan have British treaty associations; Transjordan is autonomous with Britain, Palestine autonomous with Syria. Mesopotamia, Jebel Shammar and Hadhramaut are British protectorates totalling151hexes; Asir is independent. All fifteen territorial assignments and the exact map are saved in the search evidence.

The94-point score depends on its exact borders and these arrangements. A generally strong strategy keeps grants connected, secures transit between cities and ports, associates vulnerable small states with viable neighbours, and preserves Jerusalem/Jeddah/Shia cooperation. Do not use blanket colonial administration, huge central states or multiply tiny governments for bonuses. Treaties still carry credit and frontier risk. Internal scoring remains peace40, area-weighted durability40 and capped cooperation20. Four distinct cooperation successes fill that last allowance.

## Evidence

`rules4-results.json.gz` contains all225 unchanged maps and their outcomes. `rules4-search-results.json.gz` contains all295 scored candidates and the best proposal. Compression is lossless; none of these files is shipped to players. The accompanying scripts reproduce both experiments against the current engine. This report is internal analysis and is not shown before play.
