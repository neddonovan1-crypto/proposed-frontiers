# Blind maps after imamate balance fix

Exact paired replay of all 200 original blind maps; no maps generated, improved or discarded.

Original results SHA-256: 0d277d9107fe9bc63651820d1f2f7890d6905300bb33e727f0afd39a9a06626b. Original file unchanged.

| Geometry | Runs | Old mean | New mean | Mean change | New median | New range | Decreased / unchanged / increased |
|---|---:|---:|---:|---:|---:|---:|---:|
| all | 200 | 21.84 | 17.44 | -4.40 | 15 | 0–57 | 105 / 89 / 6 |
| coherent | 100 | 34.81 | 27.16 | -7.65 | 27 | 0–57 | 78 / 17 / 5 |
| haphazard | 100 | 8.87 | 7.72 | -1.15 | 7 | 0–34 | 27 / 72 / 1 |

0 validation failures. These are score-engine simulations of the same saved completed maps, not additional browser clicks.

## Imamate-specific comparisons

- withImamate: 152 maps, 98 changed, mean score change -5.64.
- withoutImamate: 48 maps, 13 changed, mean score change -0.48.

## Largest changes

- blind-coherent-022: 47 → 0 (-47).
- blind-coherent-080: 47 → 0 (-47).
- blind-coherent-029: 46 → 0 (-46).
- blind-coherent-092: 45 → 0 (-45).
- blind-coherent-047: 40 → 0 (-40).
- blind-coherent-090: 52 → 17 (-35).
- blind-coherent-057: 33 → 0 (-33).
- blind-coherent-024: 59 → 30 (-29).

## Highest remaining score

- blind-coherent-094: 57/100 (previously 69); 6/6 states survive.
- blind-coherent-048: 54/100 (previously 58); 10/10 states survive.
- blind-coherent-054: 50/100 (previously 60); 6/7 states survive.

## Interpretation

This compares the complete rules update, including local government-arc seeding, financial exposure, imamate limits and final outcome reconciliation. It does not isolate a single rule's causal effect. Six maps improve by one to five points because their local government arc changes to a less severe branch; 105 decline and 89 are unchanged. The highest remaining blind score is coherent trial 094, reduced from 69 to 57. The final replay includes the corrected ordering of imamate collapse before autonomy reconciliation and event pruning.
