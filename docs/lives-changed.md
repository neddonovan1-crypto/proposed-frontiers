# Lives Changed: rotating historical profiles

Updated 2 October 2026. The newspaper still displays **at most four** profiles. The candidate pool contains **22 real people**, selected only when their city, community or relevant political connection appears on the player's map. A sparse map may therefore produce fewer than four cards.

The first paragraph is documented biography. Every second paragraph begins **“In your settlement,”** and is invented: it describes how the player's frontiers could affect that person's work. The articles do not assert that these altered permits, appointments, journeys, subscriptions or negotiations happened historically. The existing biographies' research remains in `historical-branches.md` and `persia-scenarios.md`.

## Selection and chronology

- `build(input, {peopleSeed})` accepts an optional string or number used only to select profiles. Without it, builds remain deterministic.
- The browser supplies a fresh page/session seed and renews it for a reset. Reopening results in the same session retains the same selection for the same proposal.
- This seed never enters the proposal signature, event generation, state outcomes, newspaper headlines, score or saved proposal.
- Small bonuses favour different regions, occupations and periods. No fixed priority excludes the less famous people from selection: all 22 appear in the 128-session regression fixture.
- Cards are unique and sorted by date. They must fall within the chronicle and before the person's death year.
- Civilian cards can move forward to the actual year of a government's collapse to describe its aftermath; all those candidates lived beyond 1939. Early profiles of Bell, Mehmed VI and Faisal retain their earlier dates and check whether the named government still existed then.
- A dissolved or annexed state cannot negotiate or run public institutions after its end. The profile then refers to the surviving successor or district authorities. Persian cultural profiles separately distinguish a surviving state from a surviving Persian relationship. Bahar’s card moves forward to the recorded withdrawal year when that occurs after 1926, so a 1927–29 exit is not reported prematurely; Parvin’s 1936 card already follows all such nonterminal exits.
- A revived magazine after its historical closure is described as a proposed resumption, not as uninterrupted historical publication.

## Candidate pool and grounding

| Person | Map requirement | Documented basis and source |
| --- | --- | --- |
| Reza Shah Pahlavi | A genuine Persian relationship, including one that later fails | The 1921 coup and 1925 replacement of the Qajar monarchy are distinct; see the Iranica sources in `persia-scenarios.md`. |
| Mehmed VI | Ottoman Sultanate actually owns Constantinople | Last Ottoman sultan and exile after abolition; the contemporary constitutional and Allied records are in `historical-branches.md`. |
| Mustafa Kemal | Actual Angora ownership, or Turkey with Anatolian cells | The nationalist assembly and 1923 presidency; existing historical research retained. The Anatolian fallback does not claim that Angora was assigned. |
| Faisal ibn Hussein | Damascus or Baghdad | Arab delegation and postwar crown proposals; [Paris peace conference record](https://history.state.gov/historicaldocuments/frus1919Parisv05/d1). |
| Gertrude Bell | Baghdad | Political and antiquities work; [Newcastle's Gertrude Bell archive](https://gertrudebell.ncl.ac.uk/l/gb-1-1-2-1-17-19), also retained in the existing provenance. Card stays in 1925, before her 1926 death. |
| Chaim Weizmann | Jewish National Home, including a failed charter | Negotiations at the peace conference and scientific institutions; [conference appearance](https://history.state.gov/historicaldocuments/frus1919Parisv04/d9), with the existing profile's Daniel Sieff Institute context retained. |
| Sulayman al-Baruni | Ibadi government adjoining Oman | Omani advisory work after anti-colonial activity in Libya; [British Library/Qatar Digital Library biography](https://qdl.qa/sulayman-al-baruni-life-ibadhi-scholar-and-statesman-north-africa-and-oman-1872-1940). |
| Khalil al-Sakakini | Jerusalem | Constitutional School, educational reform and schoolbooks; [PalQuest biography](https://palquest.org/en/node/14235) and [Khalil Sakakini Cultural Center](https://sakakini.org/about/who-is-khalil-sakakini/?lang=en). |
| Wasif Jawhariyyeh | Jerusalem | Oud playing, land-tax office employment, memoirs and photographs; [PalQuest biography](https://palquest.org/en/biography/6569/wasif-jawhariyyeh), including its citation to his published memoirs. |
| Tawfiq Canaan | Jerusalem | Medicine and research into shrines, folklore and remedies; [PalQuest biography and bibliography](https://palquest.org/en/biography/14283/tawfiq-canaan). |
| Karimeh Abbud | Haifa | Portraits, studio work, travel and hand-coloured prints; [PalQuest biography](https://palquest.org/en/biography/29763/karimeh-abbud). Haifa was one of her documented studio locations. |
| Mary Ajami | Damascus | Al-Arus, women's literary organisations, financial closure in 1926; [American University of Beirut Libraries exhibition](https://online-exhibit.aub.edu.lb/exhibits/show/women-pioneers-in-arab-press/ajami-biography). |
| Celadet Bedirkhan | Damascus | Hawar launched in 1932, with early Kurmanji pages in both scripts; [New York Kurdish Cultural Center's archive](https://nykcc.org/langauge/hawar-archive/) and [Kurdish Institute of Paris bulletin](https://www.institutkurde.org/en/publications/bulletins/410.html). A state called Kurdistan elsewhere does not by itself relocate the editor. |
| Julia Tu’mah Dimashqiyya | Beirut | Girls' education, women's associations and al-Marah al-Jadidah, published 1921–27; [AUB Libraries exhibition](https://online-exhibit.aub.edu.lb/exhibits/show/women-pioneers-in-arab-press/dimashqiyah-biography). |
| Anbara Salam Khalidi | Beirut | Women's organisations, wartime relief, 1927 public address and 1929 move to Jerusalem; [PalQuest biography](https://www.palquest.org/en/node/9714). The card concerns her Beirut civic work. |
| Halide Edib | Constantinople or Angora | 1919 public meetings, participation in the Anatolian movement from 1920, writing and education; [TDV Encyclopaedia of Islam](https://islamansiklopedisi.org.tr/adivar-halide-edip). |
| Sabiha Gökçen | Angora | Entry into the flying school in 1935, gliding at Ankara and further training in the Soviet Union; [Turkish Aeronautical Association biography](https://thk.org.tr/sabiha_gokcen). The card focuses on training, not an invented combat exploit. |
| Zabel Yesayan | Actual mapped Armenian communities in a constituted territory | Survivor testimony, refugee work, the Adana orphanage and evacuation of children; [Armenian Genocide Museum-Institute](https://genocide-museum.am/eng/ZapelEssayan.php). Contact with the player's Armenian districts is a counterfactual relief effort, not a claim that she historically held office there. |
| Mohammad-Taqi Bahar | Genuine Persian political relationship | Poetry, constitutional politics, journalism and suppression of publications; [Encyclopaedia Iranica](https://www.iranicaonline.org/articles/bahar-mohammad-taqi/bahar-mo%E1%B8%A5ammad-taqi-i-life-and-work/). His story stays in Tehran; it does not relocate him into the player's state. |
| Parvin Etesami | Genuine Persian political relationship | Teaching, the 1935 first collection, fables, social justice and knowledge; [Encyclopaedia Iranica](https://www.iranicaonline.org/articles/etesami-parvin/). The invented cross-border story concerns readers and booksellers, not a fictional diplomatic appointment. |
| Ameen Rihani | Jeddah, Riyadh, Mecca or Medina | 1922 Arabian travels, rulers, writing and passport; [Ameen Rihani Organization biography](https://ameenrihani.org/pages/ameen-rihani-biography), [museum passport description](https://ameenrihani.org/pages/ameen-rihani-museum), and [Library of Congress collection announcement](https://www.loc.gov/item/prn-99-029/). |
| Sati al-Husri | Baghdad | Education in interwar Iraq, common language/history and nationalist curricula; Reeva S. Simon's chapter, [“The Imposition of Nationalism on a Non-Nation State”](https://ciaotest.cc.columbia.edu/book/jankowski/jank05.html). The card treats educational policy as contested, not as an automatic benefit. |

The fifteen newly added profiles use the institutional and scholarly sources linked above, checked on 2 October 2026. Their biographical paragraphs are original summaries; no historical quotations are invented. Historical presence or cultural connection does not grant the player control of a person or guarantee an appointment.
