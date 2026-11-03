# Blind playtests — frozen engine c2ca839

Score-blind simulated completed maps, not browser clicks. All 200 proposals are generated and written before any engine result is examined.

All 200 maps were completed before scoring. There were 0 rejected engine proposals. 25 inland Free Port name choices were redrawn without consulting a score. No outcomes were discarded.

| Map geometry | Runs | Mean | Median | Range | P10 | P90 | Zero scores | 80+ |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| all | 200 | 21.84 | 19 | 0–69 | 0 | 46 | 22 | 0 |
| coherent | 100 | 34.81 | 33.5 | 7–69 | 19.9 | 48.10000000000001 | 0 | 0 |
| haphazard | 100 | 8.87 | 8 | 0–38 | 0 | 18.10000000000001 | 22 | 0 |

## Highest blind scores

- blind-coherent-094: 69/100; 6/6 states survive; 0 wars; The Settlement Under Strain.
- blind-coherent-079: 61/100; 5/6 states survive; 0 wars; The Settlement Loses Ground.
- blind-coherent-054: 60/100; 6/7 states survive; 0 wars; Revolutions in the New States.
- blind-coherent-024: 59/100; 4/4 states survive; 1 wars; War on the New Frontiers.
- blind-coherent-048: 58/100; 10/10 states survive; 1 wars; War on the New Frontiers.

## Lowest blind scores

- blind-haphazard-003: 0/100; 0/5 states survive; 1 wars; The Settlement Breaks Apart.
- blind-haphazard-012: 0/100; 0/4 states survive; 2 wars; The Settlement Breaks Apart.
- blind-haphazard-026: 0/100; 0/2 states survive; 0 wars; The Settlement Breaks Apart.
- blind-haphazard-031: 0/100; 0/5 states survive; 1 wars; The Settlement Breaks Apart.
- blind-haphazard-037: 0/100; 0/3 states survive; 1 wars; The Settlement Breaks Apart.

## Method

4–12 unique presets; names uniform without replacement subject only to marked-port legality; status uniform among legal statuses; all four imamate sects equally likely; independent/imamate relationships 50% None, 25% Treaty association, 25% Sphere of influence; colonial power uniform; autonomy partner uniform among colonial powers and previously created eligible states.

Coherent: Random distinct seed hexes, Euclidean Voronoi ownership using longitude scaled by cos(30 degrees).

Haphazard: 600–1,000 random dabs: randomly selected polity and center, brush radii 0–3 adjacency steps, overwriting prior paint. Unpainted gaps completed by nearest painted cell. Any extinct polity is restored on its original seed hex.

These tests estimate the stated random-input protocols, not a population average of real novice players. Both cohorts use the same political probabilities, but the port constraint can change the available names according to geography. They use actual server validation and enriched canonical map data, including all 763 selectable hexes, railway and ethnicity metrics, and Oman-border flags.

## Interpretation and remaining gaps

The chaotic cohort has no peace points in any of its 100 runs. Its surviving fragments still average 6.72 durability points and 2.15 cooperation points. Coherent blind maps preserve more territory and average 25.27 durability, 7.60 cooperation and 1.94 peace points. The overall mean weights these two artificial styles equally; it is not an estimate of how frequently real players choose either style.

The highest accidental outcome, coherent trial 094 (69), consists of six contiguous or nearly contiguous grants: five under Britain and one under France. The Jewish National Home holds Baghdad and Najaf as a British protectorate; the pilgrimage cities are a direct British colony. The run receives the Shia uprising, pilgrimage boycott, Jerusalem dispute and both Depression branches, but no state is eliminated, while generic decolonization, treaty and railway events supply substantial cooperation. Its mean is not a free high-score loophole, but the model can still be generous toward coherent colonial settlements after crises.

Name-placement oddities were deliberately not treated as validation failures: the game explicitly allows period names without imposing their historical boundaries.

One narrative consistency issue appeared in coherent trial 054: the oversized Free Port is dissolved in 1919 but is still named as a party to a negative pilgrimage-permit event in 1924. The engine was left unchanged so all cohorts remained comparable.
