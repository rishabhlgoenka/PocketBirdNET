import type { SpeciesData } from '../types'

/**
 * The 10 Pacific Northwest species detected by PocketBirdNET.
 * Order is fixed and must match the SPECIES array in pocketbirdnet.ino
 * and notebooks/01_data.ipynb exactly.
 *
 * classIndex 10 (background) is handled as null species in the UI.
 *
 * Images live in public/birds/ — run scripts/download-bird-images.sh
 * to fetch them from Wikimedia Commons (CC-licensed; see ATTRIBUTION.md).
 *
 * All About Birds URLs verified against https://www.allaboutbirds.org/guide/
 * Facts are original — do not copy Cornell Lab or Wikipedia text.
 */
export const SPECIES: SpeciesData[] = [
  {
    classIndex: 0,
    commonName: 'American Robin',
    imagePath: '/birds/american-robin.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/American_Robin',
    facts: [
      'Robins often begin singing before sunrise, sometimes more than an hour before dawn — earning them a place in folklore as heralds of spring.',
      'Their signature orange-red breast comes entirely from carotenoid pigments absorbed through a berry-heavy diet, not from any genetic colour gene.',
      'A foraging robin tilts its head not to listen for worms, but to improve its field of view — its eyes are positioned on the sides of its skull.',
    ],
  },
  {
    classIndex: 1,
    commonName: 'Black-capped Chickadee',
    imagePath: '/birds/black-capped-chickadee.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Black-capped_Chickadee',
    facts: [
      'Chickadees cache thousands of individual food items each autumn, and their hippocampus measurably enlarges each fall to support this spatial memory feat.',
      'The number of "dee" notes at the end of a chick-a-dee call encodes threat level — a small, agile predator like a pygmy owl triggers far more dees than a large hawk.',
      'On cold nights, chickadees lower their body temperature by up to 12 °C through controlled hypothermia, cutting their energy needs nearly in half.',
    ],
  },
  {
    classIndex: 2,
    commonName: "Steller's Jay",
    imagePath: '/birds/stellers-jay.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Stellers_Jay',
    facts: [
      "The only crested jay found west of the Rocky Mountains, Steller's Jays were formally described by Georg Wilhelm Steller during Vitus Bering's 1741 Alaska expedition.",
      'They are convincing vocal mimics and will reproduce the screech of a Red-tailed Hawk with enough accuracy to scatter smaller birds from a feeder.',
      'Like other corvids, Steller\'s Jays form long-term pair bonds and work cooperatively with neighbouring family groups to mob predators.',
    ],
  },
  {
    classIndex: 3,
    commonName: 'Northern Flicker',
    imagePath: '/birds/northern-flicker.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Northern_Flicker',
    facts: [
      'Unlike most woodpeckers, flickers forage primarily on the ground, using a long, sticky, barbed tongue to extract ants and beetle larvae from soil.',
      'Their tongue is anchored inside the skull, wrapping around the eye socket — it can extend nearly 5 cm beyond the tip of the bill.',
      'Flickers hammer on metal gutters, chimneys, and downspouts not to find food but purely as a loud territorial advertisement in spring.',
    ],
  },
  {
    classIndex: 4,
    commonName: 'Song Sparrow',
    imagePath: '/birds/song-sparrow.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Song_Sparrow',
    facts: [
      'Male Song Sparrows typically memorise 8–12 distinct song types and switch between them strategically depending on which rival is nearby.',
      'Geographic populations show strong regional dialects — sparrows on the Aleutian Islands sound dramatically different from those in the Sonoran Desert.',
      'Song Sparrows are one of the most intensively studied birds in North America; data from some populations span over 70 consecutive years of research.',
    ],
  },
  {
    classIndex: 5,
    commonName: "Anna's Hummingbird",
    imagePath: '/birds/annas-hummingbird.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Annas_Hummingbird',
    facts: [
      "Anna's Hummingbirds are year-round Pacific Coast residents and will begin nesting in winter, sometimes while snow is still on the ground.",
      'During a courtship dive, a male reaches speeds above 80 km/h, then pulls out in a fraction of a second — generating gravitational forces that would briefly blur human vision.',
      'The iridescent magenta gorget is not a pigment but a structural colour: microscopic air bubbles in the feather barbules scatter light like a diffraction grating.',
    ],
  },
  {
    classIndex: 6,
    commonName: 'Dark-eyed Junco',
    imagePath: '/birds/dark-eyed-junco.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Dark-eyed_Junco',
    facts: [
      'Juncos were once classified as five separate species; DNA analysis in the 1970s revealed they interbreed freely and were collapsed into one highly variable species.',
      'Their arrival in lowland gardens each autumn tracks cold-front movement so reliably that rural communities historically used them as informal winter-weather indicators.',
      'Juncos use a foot-shuffling behaviour on leaf litter — rapidly alternating forward and backward steps — to expose seeds buried just below the surface.',
    ],
  },
  {
    classIndex: 7,
    commonName: 'American Crow',
    imagePath: '/birds/american-crow.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/American_Crow',
    facts: [
      'Urban crows in Japan have been documented dropping walnuts onto crosswalks, then waiting for traffic to crush the shells, and collecting the kernels on the pedestrian signal.',
      'Crows recognise individual human faces and will hold a grudge for years, recruiting family members to harass someone who has handled them roughly.',
      'Crow families are multigenerational: yearling offspring regularly delay their own breeding to help their parents raise the following year\'s brood.',
    ],
  },
  {
    classIndex: 8,
    commonName: 'Pacific Wren',
    imagePath: '/birds/pacific-wren.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/Pacific_Wren',
    facts: [
      'Despite weighing barely 10 grams, a Pacific Wren\'s song can exceed 100 dB at close range — louder, relative to body size, than almost any other bird.',
      'Males construct multiple complete domed nests before pairing; the female inspects them all and selects one, while the rest serve as decoys or roost sites.',
      'Pacific Wrens were only recognised as a species separate from Winter Wren in 2010, after decades of study revealed distinct genetics and song structure.',
    ],
  },
  {
    classIndex: 9,
    commonName: 'House Finch',
    imagePath: '/birds/house-finch.jpg',
    learnMoreUrl: 'https://www.allaboutbirds.org/guide/House_Finch',
    facts: [
      'Male House Finches derive their red entirely from dietary carotenoids — males with richer food supplies display deeper crimson, and females actively prefer brighter mates.',
      'Originally restricted to the American West, House Finches were illegally sold as "Hollywood Finches" in New York in the 1940s; released birds have since colonised the entire continent.',
      'House Finches are one of the few songbirds known to mate for life within a single breeding season, reforming pair bonds with the same individual year after year.',
    ],
  },
]

/** Look up a species by its classIndex (0–9). Returns undefined for index 10 (background). */
export function getSpecies(classIndex: number): SpeciesData | undefined {
  return SPECIES.find(s => s.classIndex === classIndex)
}
