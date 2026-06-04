# Bird Photo Attribution

All photos are freely licensed and downloaded from Wikimedia Commons.  
Run `bash scripts/download-bird-images.sh` from the `web/` directory to fetch them.

---

| File | Species | Author | License | Source |
|------|---------|--------|---------|--------|
| `american-robin.jpg` | American Robin | Michael L. Baird | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Turdus_migratorius_-_Morro_Bay,_CA.jpg) |
| `black-capped-chickadee.jpg` | Black-capped Chickadee | Cephas | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Poecile_atricapillus_CT.jpg) |
| `stellers-jay.jpg` | Steller's Jay | Jerry Friedman | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cyanocitta-stelleri-001.jpg) |
| `northern-flicker.jpg` | Northern Flicker | Mdf | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Northern_Flicker_edit2.jpg) |
| `song-sparrow.jpg` | Song Sparrow | Rhododendrites | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Song_sparrow_in_CP.jpg) |
| `annas-hummingbird.jpg` | Anna's Hummingbird | Alan D. Wilson | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Calypte_anna_male.jpg) |
| `dark-eyed-junco.jpg` | Dark-eyed Junco | USFWS | Public Domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Dark-eyed_Junco_AK.jpg) |
| `american-crow.jpg` | American Crow | Ingrid Taylar | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AmericanCrow.jpg) |
| `pacific-wren.jpg` | Pacific Wren | Becky Matsubara | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pacific_Wren_-_Mt._Rainier_-_USA.jpg) |
| `house-finch.jpg` | House Finch | VJAnderson | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:House_Finch_(Haemorhous_mexicanus).jpg) |

---

## Notes

- No images are hotlinked — all are stored locally under `public/birds/`.
- If a download URL no longer resolves (Wikimedia occasionally renames files),
  search https://commons.wikimedia.org for the species name, pick a CC-licensed
  photo, update `scripts/download-bird-images.sh`, and update this table.
- The facts in `src/data/species.ts` are original writing and do not reproduce
  text from Cornell Lab, Wikipedia, or any other source.
