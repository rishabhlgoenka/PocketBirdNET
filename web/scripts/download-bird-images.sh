#!/usr/bin/env bash
# download-bird-images.sh
#
# Downloads freely-licensed bird photos from Wikimedia Commons into
# web/public/birds/.  Run from the web/ directory:
#
#   cd web
#   bash scripts/download-bird-images.sh
#
# Each image is CC-licensed — see ATTRIBUTION.md for full credits.
# Uses the Special:FilePath redirect (stable even when files are renamed).

set -euo pipefail

DEST="public/birds"
mkdir -p "$DEST"

download() {
    local filename="$1"
    local wikimedia_filename="$2"
    local dest_path="$DEST/$filename"

    if [[ -f "$dest_path" ]] && [[ "$(wc -c < "$dest_path")" -gt 5000 ]]; then
        echo "  ✓  $filename  (already exists)"
        return
    fi

    echo "  ↓  $filename"
    local url="https://commons.wikimedia.org/wiki/Special:FilePath/${wikimedia_filename}?width=600"
    if curl -L -s -S --max-time 30 -o "$dest_path" "$url"; then
        local size
        size=$(wc -c < "$dest_path")
        if [[ "$size" -lt 5000 ]]; then
            echo "     ⚠  Got $size bytes — Wikimedia may have renamed this file."
            echo "        Search https://commons.wikimedia.org and update this script."
        fi
    else
        echo "     ✗  curl failed for $filename"
    fi
}

echo ""
echo "PocketBirdNET — downloading bird photos from Wikimedia Commons"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# classIndex 0 — American Robin
# Source: "Turdus migratorius - Morro Bay, CA"  Michael L. Baird  CC BY 2.0
download "american-robin.jpg" "Turdus_migratorius_-_Morro_Bay,_CA.jpg"

# classIndex 1 — Black-capped Chickadee
# Source: "Black-capped Chickadee (Poecile atricapillus)(1)"  CC BY-SA 3.0
download "black-capped-chickadee.jpg" "Black-capped_Chickadee_(Poecile_atricapillus)(1).jpg"

# classIndex 2 — Steller's Jay
# Source: "Cyanocitta stelleri - Point Reyes NS"  CC BY-SA 3.0
download "stellers-jay.jpg" "Cyanocitta_stelleri_-_Point_Reyes_NS.jpg"

# classIndex 3 — Northern Flicker
# Source: "Northern Flicker edit2"  Mdf  CC BY-SA 3.0
download "northern-flicker.jpg" "Northern_Flicker_edit2.jpg"

# classIndex 4 — Song Sparrow
# Source: "Song sparrow in CP"  Rhododendrites  CC BY-SA 4.0
download "song-sparrow.jpg" "Song_sparrow_in_CP.jpg"

# classIndex 5 — Anna's Hummingbird
# Source: "Calypte anna male"  Alan D. Wilson  CC BY-SA 3.0
download "annas-hummingbird.jpg" "Calypte_anna_male.jpg"

# classIndex 6 — Dark-eyed Junco
# Source: "Dark-eyed Junco Oregon subspecies"  CC BY-SA 3.0
download "dark-eyed-junco.jpg" "Dark-eyed_Junco_Oregon_subspecies.jpg"

# classIndex 7 — American Crow
# Source: "American Crow Corvus brachyrhynchos"  CC BY 2.0
download "american-crow.jpg" "American_Crow_Corvus_brachyrhynchos.jpg"

# classIndex 8 — Pacific Wren
# Source: "Pacific Wren (Troglodytes pacificus)"  CC BY 2.0
download "pacific-wren.jpg" "Pacific_Wren_%28Troglodytes_pacificus%29.jpg"

# classIndex 9 — House Finch
# Source: "House Finch (Haemorhous mexicanus)"  CC BY-SA 4.0
download "house-finch.jpg" "House_Finch_%28Haemorhous_mexicanus%29.jpg"

echo ""
echo "Done.  Check public/birds/ — each file should be ~30–150 KB."
echo ""
