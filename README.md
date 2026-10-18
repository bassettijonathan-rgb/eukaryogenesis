# Eukaryogenesis

A browser simulation of the merger that made complex cells, roughly two
billion years ago. A small Asgard archaeon living in the mud takes a
bacterium inside itself. The guest's genes go missing or move into the
host's genome, the host learns to send proteins back in and to tap its
guests' ATP, and the extra energy lets the cell grow a nucleus, inner
membranes, a cytoskeleton, a big genome and a size thousands of times that
of a bacterium. The guests become mitochondria with a few dozen genes. A run
follows 500 cells for 300,000 generations, in steps of 100.

**Play:** https://claude.ai/artifact/Q6xcM428Y7eazgBQkCRPiJ

It is plain JavaScript with Canvas and a Web Worker, no server, and runs as a
single page at phone width.

## What you see

- **The picture** has three views. **Cells** is a sample of the population
  drawn like a fluorescence micrograph: amber archaea with their protrusions
  and partner microbes, guests that turn from green bacteria through gold to
  coral mitochondria, a blue nucleus, pink inner membranes, the cytoskeleton
  and bacteria being eaten whole. An inset shows the typical cell and a
  bacterium to scale. **Genes** shows the typical cell's guest genome as a
  grid of all 3,033 genes of the bacterial ancestor (kept, copied to the
  host, moved for good, or lost; tap one to name it), and its host genome as
  a bar, with gauges for the seven eukaryotic features. **Energy** is the
  typical cell's day in ATP: the food it takes in, the ATP made from it, where
  the host's share goes, and a ruler of power per gene against a bacterium.
- **The numbers** under the picture (guest genes, host genes, guests per
  cell, cell size, how often it divides, power per gene) can all be tapped.
  Each explains what it means, why it is where it is now, and what real cells
  say.
- **The narrator line** says what is happening as it happens.
- **Charts** follow the guest and host genomes, cell volume, power per gene
  and doubling time through the run, with real values shaded behind and
  strips showing when guests spread and when each feature was finished. On a
  phone the charts have their own tab.

### Tabs

- **Learn**: ten short chapters, from two partners in the mud to how sure we
  are. Each asks you to predict first, then a **Show me** button runs the
  default history to the right moment and stops. Words in the text open a
  glossary of 32 terms.
- **Lab**: start from another scenario (below), pick another seed, change
  the rules (how often guest DNA lands in the host, how easily proteins get
  in, oxygen, food, the cost of a gene), switch mergers, protein import, the
  ATP carrier, phagocytosis or local control off, or act now: put a bacterium
  inside an archaeon, burst some guests, hand out the ATP carrier, cure half
  the cells.
- **Validation**: the model set beside real cells, with pass or fail for
  each check (below) and a tag saying whether the number emerges, was tuned,
  or follows from a rule built in. It can be run again in the page, and a
  finished run of your own is scored on the checks that need only one run.

## How the default run goes

| Generation | What happens in the model |
|---|---|
| 5,900 | An archaeon closes its protrusions around a partner: a cell inside a cell |
| 7,200 | Cells with guests outnumber plain archaea |
| 41,300 | The host can send its own proteins into its guests (protein import) |
| 46,200 | The guests have lost most of the genes for living outside: 1,500 left |
| 57,300 | The ADP/ATP carrier: the host now gets most of its guests' ATP |
| 64,200 to 69,700 | Phagocytosis, inner membranes and a cytoskeleton; cells pass 1,000 µm³ |
| 78,800 | A nucleus around the host genome |
| 85,400 | Sex |
| 87,800 | The guest genome is down to 700 genes, as small as Buchnera's |
| 245,500 | Fewer than 100 guest genes, in the range of real mitochondria |
| 300,000 | 50 guest genes; 16,500 host genes; cells of 10,000 µm³ dividing every 6 hours |

## The model

**Cells and generations.** 500 host cells are followed. Each step stands
for 100 generations: cells leave descendants in proportion to how fast they
grow over that time (a Wright–Fisher population with selection), and the
descendants mutate. Mutation rates are per step, so they are huge per
generation; that is what lets the whole story fit in 300,000 generations.

**An energy budget for every cell** (`budget` in `src/sim/engine.js`),
after Lane & Martin (2010). Food comes in through the cell's surface, through
inner membranes, and, once the cell can eat other cells whole, in prey,
which a bigger eater catches more of. The host ferments it and gets a tenth
of its energy, faster when partners outside and guests inside mop up its
waste. The guests burn the rest, as far as their numbers and oxygen allow,
but the host gets only what its machinery lets it take: 3 % once it can
import proteins into them, 88 % with the ADP/ATP carrier. The costs are
keeping the cell, making the protein of every gene (more in a bigger cell),
and building a new cell and copying its genome at division. A prokaryote
that powers itself through its own membrane needs a copy of its genome for
every µm³ it controls, as giant bacteria do; once the guests make the ATP,
one copy is enough. A cell grows at the lower of two rates: what the host's
own share of the ATP allows, and what all the ATP allows the whole
partnership, guests included. Big cells also need a cytoskeleton and inner
membranes to move things across them, introns spoil proteins until a
nucleus keeps translation away from unspliced messages, and genomes above
6,000 genes pile up broken genes unless the cell has sex.

**The guests** (`src/sim/genes.js`). The bacterium starts with 3,033 genes,
tracked one by one in seven kinds: living outside, building blocks the host
can supply, metabolism, the genetic system, respiration, membranes and RNA
genes. The 100 named ones are the genes of the richest mitochondrial genomes
known, those of jakobids (Burger et al. 2013). Each step, runs of
neighbouring genes are deleted from the guests; a deletion is kept only if
the guests no longer need those genes or the host now makes them, and a
smaller genome copies faster. Pieces of guest DNA land in the host genome,
more often the more guests there are. A gene that lands there works only if
its protein can get back into the guests, which needs import machinery and
gets harder with every helix the protein has in a membrane; otherwise it
becomes a broken copy. RNA genes cannot be imported. The core subunits of the
respiratory chain must stay under the guests' own control (CoRR, Allen
2003): a guest that gives one up loses some of its respiration.

**The host.** The archaeon starts with 3,600 genes. Duplications add new
genes; seven eukaryotic features (protein import, the ATP carrier, the
nucleus, inner membranes, the cytoskeleton, phagocytosis and sex) each need
a set of new genes, gained one at a time, and each gene adds its share of the
feature's effect. Deletions remove new genes, feature genes, spare copies
and broken copies. Bacterial genes from the guests can take over some
archaeal jobs. Introns arrive with guest DNA and spread.

**Mergers and losses.** An archaeon with partners on its protrusions
sometimes closes around one (the E³ model of Imachi et al. 2020); the
partner divides once inside. At each division the guests are shared out,
and a daughter missed by all of them is a plain archaeon again; protein
import lets the host keep its guests in step with its own division. Guest
numbers are set by how many the host's leftovers can keep busy, times a
heritable setting, within the room the host has.

## Simplifications

- Mutation rates are sped up enormously, so the 300,000 generations of a run
  stand for the far longer real history.
- 500 cells stand for a whole population, so chance matters more than it
  would; different seeds take different paths.
- Guests are small (0.03 µm³), so a big cell holds about 100,000 of them,
  far more than the hundreds to thousands of mitochondria in real cells.
- Seven features stand for thousands of real genes and many separate
  inventions. Their order is not scripted, but how fast each can be gained
  is a set number.
- The host's genes are counted in groups; only the guest genome is followed
  gene by gene. Genes are not linked to positions on chromosomes except
  where deletions take neighbours together.
- Food, oxygen and partners are the same for every cell: there is no space,
  no ecology and no other species, except as constants.
- How well a bigger eater catches prey, how costly a gene is and many other
  constants are tuned so the default run lands near the evidence. The model
  shows how the pieces push on each other, not exactly what happened.
- In the picture, cell sizes are squeezed so that half-micrometre archaea
  and 30 µm cells both fit; only the inset is to scale.

## Validation

`npm run build` runs the default history and two what-ifs (no merger, no
protein import) and writes the results to `dist/validation.json`; the page
shows them in the Validation tab. The long test fails if any check stops
passing.

| Check | Model | Real | How | Result | Source |
|---|---|---|---|---|---|
| An archaeon on its own: its size and how fast it divides | 0.47 µm across, divides every 17 days | 0.3 to 0.75 µm across, divides every 14 to 25 days | tuned | pass | Imachi et al. 2020 |
| Without the merger, archaea stay small and simple | 3,624 genes, 0.056 µm³, no feature complete | no archaeon or bacterium has a nucleus, inner membranes and phagocytosis | emerges | pass | Imachi et al. 2020; Lane & Martin 2010 |
| One merger founds every cell at the end | 2 archaea took a partner inside; every cell at the end descends from one | all mitochondria descend from one alphaproteobacterium | emerges | pass | Roger, Muñoz-Gómez & Kamikawa 2017 |
| Genes left in the guest genome at the end | 50 genes, 29 for proteins (0.97 % of the protein genes it started with) | 37 in humans (13 for proteins) up to 100 in Andalucia (66 for proteins) | emerges | pass | Anderson et al. 1981; Burger et al. 2013 |
| The genes that stay are the oily core of the respiratory chain | cox1 and cob kept; kept proteins have 4.5 membrane helices on average, moved ones 0.58 | cox1 and cob stay in almost every mitochondrial genome; the kept proteins are the most membrane-bound | built in | pass | Björkholm et al. 2015; Johnston & Williams 2016 |
| Without protein import, the guest genome stops shrinking much sooner | 733 genes, 15 times as many | insect endosymbionts keep about 120 to 650 genes; mitochondria a handful to 100 | built in | pass | McCutcheon & Moran 2012 |
| Genes in the host genome at the end | 16,504 genes, 4.6 times the archaeon's | free-living protists have 6,000 to 40,000; Asgard archaea about 4,000 to 5,000 | tuned | pass | Goffeau et al. 1996; Fritz-Laylin et al. 2010; Spang et al. 2015 |
| How big the cells grow, compared with a bacterium | 10,000 µm³, 27 µm across: 10,000 times the bacterium | a protist averages about 15,000 times a bacterium's mass (accept 1,500 to 150,000) | tuned | pass | Lane & Martin 2010 |
| Power per gene, compared with a bacterium | 8,000 times | four to five orders of magnitude (accept 3,000 to 300,000) | emerges | pass | Lane & Martin 2010 |
| Share of the cell taken up by mitochondria | 33 % | about 8 % in white blood cells, 22 % in liver, nearly half in heart muscle (accept 5 to 50 %) | tuned | pass | Weibel et al. 1969; David 1977 |

"Emerges" means nothing in the model aims at the number. "Tuned" means
constants were chosen so it lands near the real value. "Built in" means a
rule of the model makes it happen, and the check shows that the rule plays
out as meant.

Other seeds land in much the same place: across 18 seeds tried, the guests
end with 42 to 114 genes (one seed a little above the real range) and always
keep cox1 and cob, and the host has 12,000 to 17,000 genes.

### What is uncertain

The order of events is the most debated part of the story. In this model
the merger comes first and the energy from the guests pays for the
eukaryotic features that follow, as Lane and Martin argue; others think the
host was already fairly complex, or that the features came first and made
engulfing possible. Lynch and Marinov (2017) argue that energy per gene does
not set eukaryotes apart. The host's partner outside is shown as a scavenger
of its waste, as Imachi's team saw; Martin and Müller's hydrogen hypothesis
(1998) is one of several ideas about what drew the two together. The
glossary and the last chapter say more.

## Scenarios

| Lab scenario | What happens |
|---|---|
| The merger | As above |
| No merger | Archaea stay at 0.06 µm³ with 3,600 genes, dividing every 17 days |
| No protein import | Guests keep 733 genes and hand over no ATP; the cells become small eaters of 3 µm³ powered by fermentation |
| No ATP export | Guests shrink to about 250 genes, but the host gets only 3 % of their ATP and stays at 3 µm³ |
| No local control | Much as the merger: 73 guest genes, still including the oily core |
| Import anything | The guest genome disappears entirely, as in hydrogenosomes and mitosomes |

## Same seed, same run

The engine draws every random number from a seeded generator and does its
maths with only + − × ÷ and square roots (`src/sim/dmath.js`), which every
JavaScript engine rounds the same way. So the same seed, scenario and
settings give the same history step for step, in the page's worker, on the
page's main thread or in Node, in any browser. The default seed is `eve`.

## Development

Node 20 or later.

```sh
npm ci
npm test              # unit tests (engine, page logic)
npm run test:long     # full runs: validation checks, lessons, scenarios, seeds
npm run build         # dist/index.html, the page that is published
npm run test:browser  # the built page in Chromium at desktop and phone width
```

`npm run build` bundles `src/app` and the simulation with esbuild into one
self-contained page fragment, `dist/index.html`, with the worker inlined and
the validation results embedded. CI checks that the committed `dist/` matches
a fresh build.

```
src/sim/      the simulation: genes, parameters, engine, random numbers, maths
src/app/      the page: worker, picture, charts, lessons, Lab, Validation
test/unit/    fast tests
test/long/    full runs
test/browser/ the built page in a real browser
tools/        the build
```

## Sources

- Allen, J. F. (2003). The function of genomes in bioenergetic organelles. *Phil. Trans. R. Soc. B* 358, 19–38.
- Anderson, S. et al. (1981). Sequence and organization of the human mitochondrial genome. *Nature* 290, 457–465.
- Björkholm, P. et al. (2015). Mitochondrial genomes are retained by selective constraints on protein targeting. *PNAS* 112, 10154–10161.
- Burger, G., Gray, M. W., Forget, L. & Lang, B. F. (2013). Strikingly bacteria-like and gene-rich mitochondrial genomes throughout jakobid protists. *Genome Biol. Evol.* 5, 418–438.
- David, H. (1977). *Quantitative Ultrastructural Data of Animal and Human Cells.* Gustav Fischer.
- Fritz-Laylin, L. K. et al. (2010). The genome of *Naegleria gruberi* illuminates early eukaryotic versatility. *Cell* 140, 631–642.
- Goffeau, A. et al. (1996). Life with 6000 genes. *Science* 274, 546, 563–567.
- Imachi, H. et al. (2020). Isolation of an archaeon at the prokaryote–eukaryote interface. *Nature* 577, 519–525.
- Johnston, I. G. & Williams, B. P. (2016). Evolutionary inference across eukaryotes identifies specific pressures favoring mitochondrial gene retention. *Cell Systems* 2, 101–111.
- Lane, N. & Martin, W. (2010). The energetics of genome complexity. *Nature* 467, 929–934.
- Lynch, M. & Marinov, G. K. (2017). Membranes, energetics, and evolution across the prokaryote-eukaryote divide. *eLife* 6, e20437.
- Martin, W. & Müller, M. (1998). The hydrogen hypothesis for the first eukaryote. *Nature* 392, 37–41.
- McCutcheon, J. P. & Moran, N. A. (2012). Extreme genome reduction in symbiotic bacteria. *Nat. Rev. Microbiol.* 10, 13–26.
- Roger, A. J., Muñoz-Gómez, S. A. & Kamikawa, R. (2017). The origin and diversification of mitochondria. *Curr. Biol.* 27, R1177–R1192.
- Spang, A. et al. (2015). Complex archaea that bridge the gap between prokaryotes and eukaryotes. *Nature* 521, 173–179.
- Thorsness, P. E. & Fox, T. D. (1990). Escape of DNA from mitochondria to the nucleus in *Saccharomyces cerevisiae*. *Nature* 346, 376–379.
- Weibel, E. R., Stäubli, W., Gnägi, H. R. & Hess, F. A. (1969). Correlated morphometric and biochemical studies on the liver cell. *J. Cell Biol.* 42, 68–91.
