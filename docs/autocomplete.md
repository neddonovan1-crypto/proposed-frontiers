# Auto-complete settlement

The button is **Auto-Complete: Let Sykes & Picot Finish**. One click completes unassigned playable cells directly, without a preview or confirmation screen. It is a **1916-inspired settlement**, not a reconstruction of later mandate borders or a claim to reproduce the signed map at survey precision.

## Historical foundation

The agreement text distinguishes areas A and B, in which Arab governments would have French and British preferential influence respectively, from the blue and red areas, where France and Britain could establish direct or indirect control. The brown area would have international administration. Britain was separately allocated Haifa and Acre.

For the game's political choices, areas A and B are represented as **protectorates**, named **Syria** under France and **Transjordan** under Britain. This follows the requested gameplay interpretation of externally protected Arab governments. The agreement itself spoke of recognising and protecting independent Arab states or a confederation, with exclusive French or British advisers and economic preferences; it did not define these two modern national states or require one uniform constitutional arrangement. The names are suggestive regional labels and do not redraw the template along present-day borders.

- Primary agreement text, 16 May 1916: https://avalon.law.yale.edu/20th_century/sykes.asp
- Original annotated map, signed 8 May 1916, UK National Archives MPK 1/426; public-domain reproduction: https://commons.wikimedia.org/wiki/File:MPK1-426_Sykes_Picot_Agreement_Map_signed_8_May_1916.jpg
- National Archives catalogue reference: https://discovery.nationalarchives.gov.uk/results/r?_q=MPK1%2F426

`autocomplete.js` uses broad longitude/latitude polygons and city anchors suitable for the existing hex map. These polygons are approximations authored for the game, **not georeferenced archival boundary data**. Enlarged city cells use their named anchor because their grid centre can differ from the city's actual position. The inland A/B boundary is approximated between Acre and Kirkuk. Southern Mesopotamia, the Levant coast and Cilician/eastern Anatolian areas, and international Palestine have separate approximate outlines. Mosul stays in the French sphere; Baghdad and Basra are in British control; Haifa is a separate British port grant. Direct administration for blue/red is a game choice from the agreement's permitted alternatives, not the sole government form the text required.

| Generated territory | Government and relationship |
| --- | --- |
| Levant Coast and Cilicia | French direct administration |
| Lower Mesopotamia | British direct administration |
| Haifa and Acre | British direct administration; only mapped cells are assigned |
| Syria (former area A) | French protectorate |
| Transjordan (former area B) | British protectorate |
| Palestine | International administration |

The game covers more territory than these allocations settle. Its remaining Anatolian lands use an independent Ottoman Sultanate baseline. Arabia uses independent Hejaz, Jebel Shammar, Nejd, Asir and Hadhramaut territories, plus an Ibadi imamate at the Omani frontier. Those boundaries, titles and statuses are **explicit game extrapolations**, not additional clauses of Sykes–Picot. No later Russian, Italian or Greek grant is inferred. Modern national boundaries and a Jewish National Home are not substituted for the 1916 categories. Mecca and Medina default to Hejaz when unowned. Existing player ownership always takes precedence.

## Planner contract and safeguards

`FrontiersAutocomplete.propose(cells, territories)` in the browser, or `require('./autocomplete.js').propose` in Node, returns:

```js
{
  territories: [/* new territories only */],
  extensions: [{id: 42, cells: [123, 124]}], // new cells for existing states
  count: 123, // all newly assigned canonical cells, including extensions
  territoryCount: 4, // newly created territories only
  mode: '1916-inspired',
  note: 'A 1916-inspired settlement with French and British protectorates inland, direct administration on the coast and lower rivers, and international Palestine. Other lands use regional defaults.'
}
```

Each addition contains `id`, `name`, `status`, `sect`, `power`, `relationship`, and a numeric `cells` array. Sect is null except for the Ibadi imamate, matching manual assignments. The caller chooses its colour. Inputs are not changed. Existing territories retain their names, government, religion, relationships, colour and originally owned cells. The caller validates any active draft as a candidate assignment before calling the planner, then commits the draft and completion together. The same inputs produce the same output, independent of cell traversal order.

An existing player-created **Syria** or **Transjordan** can absorb adjacent completion land from its matching template region. The planner splits that region's unowned cells into connected components and extends the existing country only with components touching one of its originally owned cells. It cannot cross another country's land, take assigned cells, or annex land from a different template region. Extensions contain the existing territory ID and new cells only; they do not replace its metadata with the template's protectorate arrangement. Other existing country names never receive extensions. With no matching existing country, the original template grouping remains one Syria and one Transjordan.

Browser callers provide each canonical land cell with the same explicit `neighbours` graph used by the chronicle engine. Database fixtures already supply those neighbours. The planner recognises absorbed and merged fragment IDs and treats recorded connections symmetrically. Missing connections are conservatively treated as absent; spatial proximity alone does not authorise an extension.

Live map cells use `land`; database fixtures can omit it. Explicit non-land, non-playable, fixed, locked and merged-away cells are excluded. An existing assignment to an absorbed fragment counts as ownership of its canonical cell. Malformed cells or overlapping ownership produce a readable error. All remaining canonical playable cells receive exactly one assignment.

New names are compared without case or repeated-whitespace differences. When a player-created Syria or Transjordan already exists, components that do not touch it receive distinct regional names, such as Syrian Interior, Upper Mesopotamia, East Bank or Northern Arabian Territory, chosen from their geography. Further collisions use another regional name or a numeric suffix; these pieces are never called a duplicate Syria/Transjordan or a conference remainder. Other template names retain the existing ` — conference remainder` collision policy. All names remain within the server's 70-character limit. IDs are the lowest unused positive integers. A call that would exceed 255 total territories fails before any state is changed; only newly created states count against that limit, so an extension-only completion remains possible at 255. A completed map returns empty additions and extensions.

The interface applies the entire completion, including a valid pending draft and adjoining extensions, as one undoable operation and leaves generated territories editable. Undo restores the pre-click map, selection and draft. A validation or planning failure makes no partial assignment or save. Successful auto-completion stays on the map with Results ready; the ordinary manual completion prompt is unchanged. Existing saved maps keep their names, originally assigned ownership and arrangements, including any earlier auto-completions. New protectorate settings apply only to newly created territories; extensions retain the player's chosen government and relationships. All ordinary server validation and scoring still apply; auto-completion does not promise a peaceful outcome or modify scoring.
