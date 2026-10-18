// Everything the page says to the reader: the Learn chapters, the glossary,
// what each number means, the narrator line and the picture's legends.
//
// In chapter text, [word] links to the glossary entry `word` and
// [shown text|key] to entry `key`.

import * as fmt from './format.js';

export const CHAPTERS = [
  {
    id: 'partners',
    title: 'Two partners in the mud',
    body: [
      'Roughly two billion years ago, every living thing was made of small cells without a nucleus: bacteria and archaea. Somewhere in the mud of the sea floor, an archaeon took a bacterium inside itself. Its descendants became the first [eukaryotes|eukaryote], the kind of cell every animal, plant and fungus is made of.',
      'The host was an [Asgard archaeon|asgard]. In 2020, after twelve years of patient work, a team in Japan led by Hiroyuki Imachi grew one in the lab for the first time. It is tiny, about half a [micrometre|um] across. It divides only once every two to three weeks, living on amino acids together with partner microbes that eat its waste ([syntrophy]).',
      'It also grows long, branching [protrusions]. Imachi’s team suggested that arms like these could wrap around a partner and one day close around it: their [E3 model|e3].',
    ],
    predict: {
      q: 'Imachi’s archaeon divides once every two to three weeks. Why so slowly?',
      options: [
        { text: 'It lives on a trickle of energy: fermenting amino acids in the mud yields very little ATP', right: true },
        { text: 'Its genome is too big to copy any faster' },
        { text: 'It needs oxygen, and there is none in the mud' },
      ],
      explain:
        '[Fermentation] gets only a small part of the energy in food, and the mud offers little food to begin with. In the model the archaea ferment, helped by partners outside that mop up their hydrogen. A bacterium that can [respire|respiration] the same food divides about fifteen times faster in the same pond.',
    },
    show: { steps: [{ step: 20, speed: 1 }], view: 'cells', highlight: 'doubling' },
    look: 'The small amber cells are archaea, drawn on a dark field like a fluorescence micrograph. The thin arms are their protrusions, and the dots stuck to them are partner microbes. Tap any number under the picture to see what it means.',
  },
  {
    id: 'inside',
    title: 'A cell inside a cell',
    body: [
      'Now and then, in the model, an archaeon’s arms close around a partner: an [alphaproteobacterium], a bacterium that can [respire|respiration], burning food with oxygen. The bacterium divides once inside, and the archaeon carries on with guests in its cytoplasm. Biologists call such guests [endosymbionts|endosymbiont].',
      'At first this is a fragile arrangement. The guests divide on their own schedule, and when the host divides, a daughter that gets none of them is a plain archaeon again. Most early mergers die out this way.',
    ],
    predict: {
      q: 'The archaeon now holds bacteria that burn food far better than it can. Does it get their energy?',
      options: [
        { text: 'Yes, at once: their ATP spills into the host' },
        { text: 'Hardly: it gets help with its waste, but the bacteria keep their ATP', right: true },
        { text: 'No: the bacteria make the host sick' },
      ],
      explain:
        '[ATP] made inside the guests stays there, because nothing carries it across their membranes. What the host gains at first is help with its waste: in the model the guests use up the hydrogen and oxygen that slow its fermentation, so it grows a little faster, and its descendants slowly win. This matches the picture Imachi’s team drew, with the bacterium first useful as a scavenger.',
    },
    show: { steps: [{ step: 90, speed: 1 }], view: 'cells', highlight: 'guests', after: 'sweep' },
    look: 'Cells with green rods inside are archaea with guests. The narrator and the list under the charts say when the first merger happened and when cells with guests took over.',
  },
  {
    id: 'transfer',
    title: 'Genes on the move',
    body: [
      'Guests die, and when one bursts, its DNA can land in the host’s genome. This still happens today: in yeast, a piece of mitochondrial DNA reaches the nucleus about once in every 50,000 cells each generation ([gene transfer|egt]).',
      'Most of these copies are broken fragments, like the [NUMTs|numt] scattered through our own genome. But now and then a whole gene lands. If the host reads it and its protein reaches the guests, the guests no longer need their own copy.',
      'That last part is the hard one. A protein made in the host’s cytoplasm has to get through two membranes into the guest. Only [protein import|import] machinery makes that routine: gates called TOM and TIM, built mostly from new host proteins.',
    ],
    predict: {
      q: 'A guest gene lands in the host genome and is read there. What else does it need to replace the guest’s own copy?',
      options: [
        { text: 'Nothing: a working gene is a working gene' },
        { text: 'A way for its protein to get back into the guest', right: true },
        { text: 'A copy of the guest’s ribosome' },
      ],
      explain:
        'The protein is made outside the guest, so it has to be carried in. Without import machinery almost every moved gene is useless, and the guest keeps its own copy. In the model the host’s import machinery grows one gene at a time, and each new part lets a little more through.',
    },
    show: { steps: [{ step: 430, speed: 3 }], view: 'genes', highlight: 'hostGenes', after: 'import' },
    look: 'This picture shows the genes of a typical cell. Each square is one of the guest’s 3,033 genes, coloured by what it does, and a white dot marks a gene that also works from the host’s genome. The bar at the bottom is the host genome.',
  },
  {
    id: 'shrink',
    title: 'Shedding baggage',
    body: [
      'Inside a host, a guest no longer needs to swim, to sense the water around it, to defend itself, or to make building blocks the host can hand over. Those genes are lost first.',
      'Losing genes pays: a guest with a smaller genome copies itself faster and outgrows the other guests in the same cell. Genes it still needs can go too, but only once the host makes them instead. So the guest genome shrinks in two stages: first what is useless, then what has moved to the host.',
      'In the model a deletion removes a run of neighbouring genes, as in real chromosomes. A needed gene stuck between useless ones slows the shrinking down.',
    ],
    predict: {
      q: 'Which genes does the guest lose first?',
      options: [
        { text: 'Genes for swimming, sensing and living outside', right: true },
        { text: 'Genes for its ribosomes' },
        { text: 'Genes for respiration' },
      ],
      explain:
        'Genes that do nothing inside a host go first, often in big chunks. Ribosome and respiration genes are still needed, and can go only once the host makes their proteins and imports them. Bacteria living inside insect cells, like [Buchnera], went through the same first stage and stopped there, with a few hundred genes.',
    },
    show: { steps: [{ step: 480, speed: 3 }], view: 'genes', highlight: 'guestGenes', after: 'outside' },
    look: 'The big grey block of genes for living outside is mostly gone. The coloured blocks of genes the guest still needs are nearly full.',
  },
  {
    id: 'atp',
    title: 'Tapping the power',
    body: [
      'ATP made inside the guests is of no use to the host unless something carries it out. Mitochondria today hand their ATP over through the [ADP/ATP carrier|aac], a protein in their inner membrane that swaps the cell’s spent ADP for fresh ATP.',
      'The carrier is not a bacterial protein. It belongs to a family found only in eukaryotes, so the host must have invented it, and it can only work where the host already imports proteins into its guests.',
      'Once the carrier spreads, the guests have become [mitochondria|mitochondrion]. They burn the food the host takes in, and the host gets most of the ATP.',
    ],
    predict: {
      q: 'Once the host taps its guests’ ATP, what happens to the cells?',
      options: [
        { text: 'They stay the same size but divide faster' },
        { text: 'They grow far bigger, with mitochondria powering every part of the cell', right: true },
        { text: 'They shrink to save energy' },
      ],
      explain:
        'With mitochondria spread through the cytoplasm, every part of a big cell has a power supply close by. In the default run the cells grow from a fraction of a cubic micrometre to thousands of times a bacterium’s volume in about twelve thousand generations. To get that big they also need a [cytoskeleton] and inner membranes, which evolve alongside.',
    },
    show: { steps: [{ step: 700, speed: 2 }], view: 'energy', highlight: 'size', after: 'aac' },
    look: 'This picture is the energy budget of a typical cell. Watch how much of the guests’ ATP reaches the host, and how big the cell is next to a bacterium.',
  },
  {
    id: 'perGene',
    title: 'Energy per gene',
    body: [
      'Why did this one merger lead to complex cells, when bacteria and archaea stayed simple for billions of years? Nick Lane and Bill Martin argued in 2010 that it comes down to [energy per gene|power].',
      'A bacterium makes its ATP with its outer membrane. To grow bigger it needs more membrane, and each patch of membrane needs genes nearby to make and repair its proteins, so a big bacterium carries many [copies of its whole genome|polyploid]. The giant bacterium [Epulopiscium] holds up to hundreds of thousands. Copying and running them all eats up the extra energy.',
      'A eukaryote keeps its power plants inside, each with a tiny genome of its own, and needs only one copy of its big genome. Lane and Martin estimated that this gives eukaryotes four to five orders of magnitude more energy per gene.',
      'Not everyone agrees. Michael Lynch and Georgi Marinov argued in 2017 that bigger cells simply have more of everything, and that per unit of volume, eukaryotes are not special. The model follows Lane and Martin.',
    ],
    predict: {
      q: 'A bacterium grows to a thousand times its normal volume. How many copies of its genome does it need?',
      options: [
        { text: 'Just one, like us' },
        { text: 'Hundreds or more: one for each patch of membrane it powers', right: true },
        { text: 'None at all' },
      ],
      explain:
        'Each patch of energy-making membrane needs genes close at hand, so giant bacteria carry very many genomes. In the model a cell that powers itself with its own membrane needs one genome copy per cubic micrometre, and every copy has to be kept up and copied at each division. Mitochondria free the host from this.',
    },
    show: { steps: [{ step: 760, speed: 2 }], view: 'energy', highlight: 'perGene', after: 'big' },
    look: 'The ruler at the bottom of the picture shows power per gene, with each mark ten times the last. The free-living bacterium sits at ×1.',
  },
  {
    id: 'nucleus',
    title: 'Building a eukaryote',
    body: [
      'With energy to spare, the host can afford thousands of new genes. In the model they build the eukaryotic toolkit part by part: inner membranes (the [endoplasmic reticulum|er] and Golgi), a [cytoskeleton] that holds a big cell in shape and moves things across it, [phagocytosis] for eating other cells whole, a [nucleus], and [sex].',
      'Why a nucleus? One idea comes from Bill Martin and Eugene Koonin (2006). The guests’ DNA brought [introns|intron] with it: stretches that must be cut out of a gene’s message before the protein is made. In a cell without a nucleus, ribosomes start reading a message while it is still being made, before the introns are out. A nuclear envelope keeps the ribosomes away until the cutting is done.',
      'In the model, introns spread through the host genome and spoil proteins until the nucleus is complete.',
    ],
    predict: {
      q: 'Introns arrive with the guests’ DNA and spread through the host genome. What does a cell need to live with them?',
      options: [
        { text: 'Nothing: introns are harmless' },
        { text: 'A way to keep ribosomes off a message until its introns are cut out', right: true },
        { text: 'More ribosomes' },
      ],
      explain:
        'Each intron left in a message spoils the protein made from it. Cutting introns out takes time, and a nuclear envelope keeps the ribosomes away until it is done. Whether this is really why the nucleus evolved is still debated, but the last common ancestor of all living eukaryotes already had both a nucleus and a [spliceosome].',
    },
    show: { steps: [{ step: 900, speed: 2 }], view: 'cells', highlight: 'hostGenes', after: 'nucleus' },
    look: 'The cells are big now, with a blue nucleus, folds of inner membrane and orange mitochondria. The coloured strips at the bottom of the charts show when each part was finished.',
  },
  {
    id: 'last',
    title: 'Down to a few dozen genes',
    body: [
      'Genes keep moving for hundreds of thousands of generations. Our own mitochondria keep just 37: 13 for proteins of the respiratory chain and ATP synthase, 2 for ribosomal RNA and 22 for transfer RNA. The richest mitochondrial genome known, in the protist Andalucia godoyi, has 100.',
      'Why keep any? Two reasons, both built into the model. Some proteins are so oily, with so many [helices|helix] buried in the membrane, that they are very hard to import: these are the core of the respiratory chain. And by John Allen’s [CoRR|corr] idea, a mitochondrion has to make those core proteins itself, on the spot, to keep its own respiration in balance.',
    ],
    predict: {
      q: 'Which genes are the last to stay in the mitochondria?',
      options: [
        { text: 'Genes for oily membrane proteins at the heart of respiration', right: true },
        { text: 'Genes for the ribosome’s proteins' },
        { text: 'Whichever genes chance happened to leave' },
      ],
      explain:
        'Across eukaryotes, cox1 and cob, subunits of complexes IV and III, are almost always kept, along with other membrane-bound subunits. Many lineages moved their ribosomal protein genes. Chance plays a part too: different lineages kept different sets, and so do different runs of the model.',
    },
    show: { steps: [{ step: 3000, speed: 3 }], view: 'genes', highlight: 'guestGenes', after: 'g100' },
    look: 'Only a few dozen squares are still lit, mostly red respiration genes and yellow RNA genes. Tap a square to see which gene it is.',
  },
  {
    id: 'whatif',
    title: 'What if?',
    body: [
      'The Lab lets you run history again with one piece changed.',
      'No merger: the archaea never take a partner inside. Do they ever become complex on their own?',
      'No protein import: the guests lose what they do not need, then stop shrinking, like the bacteria living in insect cells. The host still builds its other features, but its power per gene stays close to a bacterium’s.',
      'Import anything: every guest protein and RNA can be imported, however oily. Some eukaryotes really have organelles like that: [hydrogenosomes|hydrogenosome] and mitosomes, mitochondria that lost their genome along with respiration.',
    ],
    predict: {
      q: 'If every guest protein could be imported, what would happen to the guest genome?',
      options: [
        { text: 'It would keep a few dozen genes anyway' },
        { text: 'It would disappear completely', right: true },
        { text: 'It would grow again' },
      ],
      explain:
        'With nothing left that must be made on the spot, every gene can move, and the guest genome goes. In the model this takes about a hundred thousand generations. Real organelles that lost their genome, like hydrogenosomes, also lost the respiratory chain that needs local control.',
    },
    show: { tab: 'lab' },
  },
  {
    id: 'unsure',
    title: 'How sure are we?',
    body: [
      'The broad story is well supported: eukaryotes descend from a merger of an Asgard archaeon and an alphaproteobacterium, and most of the mitochondrion’s genes moved, bit by bit, to the host.',
      'Much else is debated. Did the merger come first and the nucleus and inner membranes later, or did the host already have some of them? Did the partnership start with oxygen, with sulfur, or with hydrogen, as in Martin and Müller’s [hydrogen hypothesis|hydrogen]? Was energy per gene the key, or one factor among several?',
      'The model takes one side on each of these and simplifies the rest. Cells are tracked as numbers, not shapes. Seven features stand for thousands of real genes. And every rate is sped up so the story fits into 300,000 [generations|generation], when the real one may have taken hundreds of millions of years. The Validation tab sets the results beside real numbers and says which ones were tuned.',
    ],
    show: { tab: 'check' },
  },
];

export const GLOSSARY = {
  eukaryote: ['Eukaryote', 'A cell with a nucleus and, almost always, mitochondria. Every animal, plant, fungus and protist is made of eukaryotic cells.'],
  um: ['Micrometre (µm)', 'A thousandth of a millimetre. A typical bacterium is about 1 µm across, and a µm³ is a cube that size.'],
  asgard: ['Asgard archaea', 'A group of archaea, first found as DNA in sea-floor mud in 2015, that carry genes once thought to belong only to eukaryotes. Eukaryotes seem to have branched off from among them. Imachi and colleagues grew the first one in the lab in 2020.'],
  syntrophy: ['Syntrophy', '“Feeding together”: microbes that live off each other’s waste. Imachi’s archaeon grows only with partners that use up the hydrogen and formate it gives off.'],
  protrusions: ['Protrusions', 'Long, sometimes branching arms that Imachi’s archaeon grows from its surface. Partner microbes stick to them.'],
  e3: ['E3 model', 'Entangle, engulf, endogenize: Imachi and colleagues’ idea that an archaeon’s arms entangled a partner, then engulfed it, and finally made it part of the cell.'],
  fermentation: ['Fermentation', 'Getting energy from food without oxygen, by rearranging it into waste such as hydrogen or acetate. It yields only a small part of the food’s energy: in the model, a tenth.'],
  respiration: ['Respiration', 'Burning food completely, with oxygen, through a chain of proteins in a membrane. It yields many times more ATP than fermentation.'],
  alphaproteobacterium: ['Alphaproteobacterium', 'A member of the group of bacteria that mitochondria come from. Its free-living relatives today have a few thousand genes; the model’s has 3,033.'],
  endosymbiont: ['Endosymbiont', 'An organism living inside another’s cells, usually to the benefit of both. The page calls them guests.'],
  atp: ['ATP', 'Adenosine triphosphate, the energy currency of every cell. Spending it turns it into ADP, which has to be recharged.'],
  egt: ['Gene transfer', 'Endosymbiotic gene transfer: DNA escaping from an endosymbiont and landing in its host’s genome. In yeast it happens about once in every 50,000 cells each generation (Thorsness and Fox, 1990).'],
  numt: ['NUMT', 'Nuclear mitochondrial DNA: a broken copy of mitochondrial DNA in the nuclear genome. The human genome holds hundreds of them.'],
  import: ['Protein import', 'The machinery, called TOM and TIM, that threads proteins made in the cell’s cytoplasm through the two membranes of a mitochondrion. About 99 % of the proteins in human mitochondria come in this way.'],
  buchnera: ['Buchnera', 'A bacterium living inside the cells of aphids, passed from mother to young for about 200 million years. Its genome has shrunk to about 600 genes, but it has never become an organelle.'],
  aac: ['ADP/ATP carrier', 'A protein in the inner membrane of mitochondria that swaps ADP from the cell for ATP from the mitochondrion. It belongs to a protein family found only in eukaryotes.'],
  mitochondrion: ['Mitochondrion', 'The power plant of a eukaryotic cell: a former bacterium with a small genome of its own, which burns food with oxygen and hands most of the ATP to the cell. Plural: mitochondria.'],
  cytoskeleton: ['Cytoskeleton', 'Fibres of actin and tubulin, with motor proteins running along them, that give a eukaryotic cell its shape, let it move and carry cargo across it. Asgard archaea have simple versions of some of these proteins.'],
  power: ['Power per gene', 'The ATP a cell makes in a day, divided by the number of genes in its genome. Lane and Martin used it to compare cells of very different sizes.'],
  polyploid: ['Genome copies', 'Many prokaryotes carry several copies of their genome, and giant ones tens of thousands or more. Each copy has to be kept up and copied.'],
  epulopiscium: ['Epulopiscium', 'A giant bacterium from the gut of surgeonfish, up to about 0.6 mm long, with tens to hundreds of thousands of copies of its genome.'],
  er: ['Endoplasmic reticulum', 'A network of membranes inside eukaryotic cells where many proteins and lipids are made. With the Golgi and small vesicles it forms the inner membrane system.'],
  phagocytosis: ['Phagocytosis', 'Eating other cells whole by wrapping the cell membrane around them. Amoebae and our white blood cells do it; of all prokaryotes, only one bacterium, found in 2019, is known to do anything like it.'],
  nucleus: ['Nucleus', 'A double membrane with pores around a cell’s DNA. Genes are read and their messages trimmed inside; proteins are made outside.'],
  sex: ['Sex', 'Here: meiosis and cell fusion, which shuffle genomes and help purge broken genes. Nearly all eukaryotes have it, or descend from ancestors that did.'],
  intron: ['Intron', 'A stretch inside a gene that is cut out of its message before the protein is made. Eukaryotic introns probably descend from self-splicing introns brought in by the mitochondrion’s ancestors.'],
  spliceosome: ['Spliceosome', 'The machine that cuts introns out of messages in the nucleus. The last common ancestor of all living eukaryotes already had one.'],
  helix: ['Membrane helix', 'A coil of protein that crosses a membrane. Proteins with many of them are oily and hard to carry into a mitochondrion.'],
  corr: ['CoRR', 'Co-location for redox regulation, John Allen’s idea: a mitochondrion keeps the genes for the core of its respiratory chain so it can make those proteins on the spot, matching its own needs.'],
  hydrogenosome: ['Hydrogenosome', 'An organelle of some protists living without oxygen. It makes ATP and gives off hydrogen, descends from a mitochondrion, and in almost every case has lost its genome. Mitosomes are even further reduced.'],
  hydrogen: ['Hydrogen hypothesis', 'Martin and Müller’s 1998 idea that the host lived on hydrogen its bacterial partner gave off, which drew the two together.'],
  generation: ['Generation', 'One round of cell division. The model counts time in generations; each step is 100 of them.'],
};

// Glossary links: [label] or [label|key]. An opening bracket before a link
// and punctuation after it stay on its line.
export function markup(text) {
  return fmt.esc(text).replace(/(\(?)\[([^\]|]+)(?:\|([^\]]+))?\]([)’.,;:!?]*)/g, (m, before, label, key, after) => {
    const k = key ?? label.toLowerCase();
    const link = `<button type="button" class="term" data-term="${k}">${label}</button>`;
    return before || after ? `<span class="nw">${before}${link}${after}</span>` : link;
  });
}

export function termKeys(text) {
  const keys = [];
  text.replace(/\[([^\]|]+)(?:\|([^\]]+))?\]/g, (m, label, key) => keys.push(key ?? label.toLowerCase()));
  return keys;
}

// ---- The readouts under the picture and what each one means. Values are
// HTML (powers of ten use <sup>).

export const READOUTS = [
  { key: 'guestGenes', label: 'Guest genes', unit: (h) => (h.ns > 0 ? 'of 3,033 at first' : 'no guests yet'), value: (h) => (h.ns > 0 ? fmt.int(h.gs) : '–') },
  { key: 'hostGenes', label: 'Host genes', unit: 'archaeon: 3,600', value: (h) => fmt.int(h.gh) },
  { key: 'guests', label: 'Guests', unit: 'per cell', value: (h) => fmt.num(h.ns, 2, true) },
  { key: 'size', label: 'Cell size', unit: (h) => `${fmt.width(h.V)} across`, value: (h) => fmt.vol(h.V, true) },
  { key: 'doubling', label: 'Divides every', short: 'Divides every', unit: 'Asgard: 14–25 days', value: (h) => fmt.dur(h.doubling) },
  { key: 'perGene', label: 'Power per gene', unit: 'bacterium: ×1', value: (h) => fmt.times(h.perGeneRel, true) },
];

const term = (key, text) => `<button type="button" class="term" data-term="${key}">${text}</button>`;

export function explain(key, h) {
  const across = fmt.width(h.V);
  switch (key) {
    case 'guestGenes': {
      if (h.ns === 0) {
        return {
          title: 'The guest genome',
          value: 'No guests yet',
          html: [
            'The typical cell has no guests yet. When an archaeon takes one in, it is an alphaproteobacterium with 3,033 genes in the model: 3,000 for proteins and 33 for RNA.',
            'Free-living relatives of mitochondria have a few thousand genes. Our own mitochondria have 37.',
          ],
          chart: 'gs',
        };
      }
      const stage =
        h.gs > 1500
          ? 'Most of what is left would still be useful to a free-living bacterium. Genes for swimming, sensing and defence are being lost in big chunks.'
          : h.gs > 200
            ? `What is left is mostly genes the guests still need: for their ribosomes, their respiratory chain and their metabolism. Each can go only once the host makes the protein and ${term('import', 'imports')} it.`
            : `Real mitochondria keep from a handful of genes to 100, and ours keep 37. What stays is mostly the oily core of the respiratory chain and the RNAs the guests’ own ribosomes need (${term('corr', 'CoRR')}).`;
      return {
        title: 'The guest genome',
        value: `${fmt.int(h.gs)} genes`,
        html: [
          `The guests in a typical cell share one genome of ${fmt.int(h.gs)} genes, ${fmt.int(h.gsProt)} of them for proteins. Their ancestor had 3,033.`,
          stage,
          h.bact > 0 ? `${fmt.int(h.bact)} genes that came from the guests now work from the host genome.` : 'None of the guests’ genes works from the host genome yet.',
        ],
        chart: 'gs',
      };
    }
    case 'hostGenes':
      return {
        title: 'The host genome',
        value: `${fmt.int(h.gh)} genes`,
        html: [
          `The host started as an ${term('asgard', 'Asgard archaeon')} with about 3,600 genes. Now it has ${fmt.int(h.gh)}: ${fmt.int(h.arch)} archaeal, ${fmt.int(h.bact)} taken over from its guests, ${fmt.int(h.modGenes)} that build eukaryotic features, and ${fmt.int(h.extra)} other new genes made by copying old ones.`,
          h.junk > 0 || h.introns > 0
            ? `It also carries ${fmt.int(h.junk)} broken copies of guest DNA, like the ${term('numt', 'NUMTs')} in our own genome, and ${fmt.int(h.introns)} ${term('intron', 'introns')}.`
            : '',
          'Every gene costs energy. It has to be copied at each division, and its protein has to be made and replaced. A bigger genome pays only if the cell has power to spare.',
        ],
        chart: 'gh',
      };
    case 'guests': {
      const share = h.V > 0 ? (h.ns * 0.03) / h.V : 0;
      return {
        title: 'Guests per cell',
        value: `${fmt.num(h.ns, 2, true)}`,
        html: [
          h.ns === 0
            ? 'The typical cell has no guests. Archaea take a partner inside only rarely, and most of these first mergers die out when a daughter cell is left without any.'
            : `A typical cell holds ${fmt.num(h.ns, 2, true)} guests, taking up ${fmt.pct(share)} of its volume.`,
          h.ns > 0 && h.ns < 40
            ? 'With so few, a daughter cell can easily miss out at division and lose them all. Hosts that can send proteins into their guests keep them in step with their own division.'
            : '',
          h.ns >= 40
            ? 'Real cells hold from a few to thousands of mitochondria, often fused into networks. The model’s guests are small, so a big cell holds very many of them. They take up a fifth to a half of the cell, about as in real cells.'
            : '',
          'In the model a cell keeps about as many guests as the leftovers of its food can feed. How many exactly is itself inherited, and evolves.',
        ],
        chart: 'V',
      };
    }
    case 'size':
      return {
        title: 'Cell size',
        value: `${fmt.vol(h.V, true)}, ${across} across`,
        html: [
          `The typical cell has a volume of ${fmt.vol(h.V, true)} and is ${across} across: ${fmt.num(h.V, 2, true)} times the volume of the free-living bacterium (1 µm³).`,
          h.V < 1
            ? 'Archaea like Imachi’s are tiny, about 0.55 µm across, a tenth of a bacterium’s volume. A small cell has plenty of surface for taking in food, for its volume.'
            : h.V < 100
              ? 'A bigger cell can take in more food, but must move things further inside it and, without mitochondria, power more membrane and keep more genome copies.'
              : `A cell this big needs power all through its volume, which its mitochondria give it, and a ${term('cytoskeleton', 'cytoskeleton')} and inner membranes to move things across it. An average protist is about 15,000 times the mass of an average bacterium.`,
          'In the model, size is inherited and drifts a little each step. Selection keeps the size that grows fastest.',
        ],
        chart: 'V',
      };
    case 'doubling':
      return {
        title: 'Doubling time',
        value: fmt.dur(h.doubling),
        html: [
          `A typical cell divides every ${fmt.dur(h.doubling)}. The free-living bacterium in the same pond divides about once a day; Imachi’s archaeon took 14 to 25 days in culture.`,
          'Cells that divide faster leave more descendants. Each step of the model, 100 generations pass and the 500 cells are drawn again, in proportion to how fast each one grows.',
          h.ns > 0
            ? h.limit === 'all'
              ? 'Right now the whole cell is the limit: its ATP has to keep up the guests and build new ones as well as the host.'
              : `Right now the host’s own ATP is the limit: it grows on what it ferments plus the share of its guests’ ATP it can get, ${fmt.pct(h.atpShare)}.`
            : '',
        ],
        chart: 'dbl',
      };
    case 'perGene': {
      const low = h.perGeneRel < 1;
      return {
        title: 'Power per gene',
        value: fmt.times(h.perGeneRel, true),
        html: [
          `The whole cell makes ${fmt.sci(h.power, 1, true)} ATP a day. Spread over its ${fmt.int(h.gh)} genes, that is ${fmt.num(h.perGeneRel, 2, true)} times the ${term('power', 'power per gene')} of the free-living bacterium.`,
          low
            ? 'Archaea living by fermentation have far less power per gene than a respiring bacterium.'
            : h.perGeneRel >= 1000
              ? 'Lane and Martin (2010) estimated that eukaryotes have four to five orders of magnitude more energy per gene than bacteria. That is what lets them afford genomes of 10,000 genes or more.'
              : 'More than a bacterium, but still far from the four to five orders of magnitude Lane and Martin estimated for eukaryotes.',
          `A bacterium cannot catch up by growing: in the model a cell that powers itself with its own membrane needs ${term('polyploid', 'a genome copy')} for every µm³, and pays for all of them.`,
        ],
        chart: 'ppg',
      };
    }
    default:
      return null;
  }
}

// ---- The narrator: one or two sentences about what is happening now.

export function narrate(h) {
  const n = (key, text) => `<button type="button" class="num" data-explain="${key}">${text}</button>`;
  const gs = n('guestGenes', fmt.int(h.gs));
  if (h.share < 0.02)
    return `Archaea ferment amino acids in the mud, helped by partners stuck to their arms. Each divides only every ${n('doubling', fmt.dur(h.doubling))}.`;
  if (h.share < 0.5)
    return `${n('guests', fmt.pct(h.share))} of cells carry guests inside. The guests help their hosts ferment a little faster, but are often lost at division.`;
  if (h.mods[0] < 0.999 && h.atpShare < 0.5) {
    if (h.mods[0] === 0 && h.gs < 1100) return `Guests live in every cell, but without protein import the host cannot take over their genes. Having shed what it did not need, the guest genome stays at ${gs} genes.`;
    return `Guests now live in ${fmt.pct(h.share)} of cells. Bits of their DNA land in the host genome, but until the host can send proteins back in, almost none of it works. The guest genome has ${gs} genes.`;
  }
  if (h.atpShare < 0.5)
    return `The host can send proteins into its guests, and ${n('hostGenes', fmt.int(h.bact))} guest genes now work from the host genome. The guests still keep most of their ATP.`;
  if (h.V < 1000)
    return `The guests hand over their ATP: they have become mitochondria. With power all through the cell, the cells grow: ${n('size', fmt.vol(h.V, true))} now.`;
  if (h.gs >= 100)
    return `Each cell holds ${n('guests', fmt.num(h.ns, 2, true))} mitochondria and ${n('hostGenes', fmt.int(h.gh))} genes of its own, with ${n('perGene', `${fmt.num(h.perGeneRel, 2, true)} times`)} a bacterium’s power per gene. The mitochondrial genome is still shrinking: ${gs} genes.`;
  if (h.gs === 0)
    return `The guests have lost their genome completely: the host makes and imports everything they need, like the hydrogenosomes of some protists. The host genome has ${n('hostGenes', fmt.int(h.gh))} genes.`;
  return `The mitochondrial genome is down to ${gs} genes, like real ones (ours has 37). The host genome has ${n('hostGenes', fmt.int(h.gh))}.`;
}

// ---- The picture: three views, each with its legend.

export const VIEWS = [
  {
    key: 'cells',
    label: 'Cells',
    legend: [
      ['arch', 'archaeal host'],
      ['guest', 'guest, still a bacterium'],
      ['mito', 'guest that is now a mitochondrion'],
      ['dna', 'nucleus'],
    ],
  },
  {
    key: 'genes',
    label: 'Genes',
    legend: [
      ['outside', 'living outside'],
      ['supply', 'made by the host'],
      ['metab', 'metabolism'],
      ['genetic', 'genetic system'],
      ['resp', 'respiration'],
      ['membrane', 'membranes'],
      ['rna', 'RNA genes'],
    ],
  },
  {
    key: 'energy',
    label: 'Energy',
    legend: [
      ['arch', 'the host'],
      ['mito', 'the guests'],
      ['food', 'food not burnt'],
    ],
  },
];

export const PICTURE_HELP = {
  cells: [
    'A sample of the 500 cells the model follows, drawn on a dark field like a fluorescence micrograph. Each cell keeps its place while its line of descent goes on.',
    'Amber cells are archaea; the thin arms are their protrusions, with partner microbes stuck to them. Rods inside a cell are its guests: green while they are still much like bacteria, then gold, then coral as they become mitochondria. A blue disc is a nucleus, pink folds are inner membranes, faint lines are the cytoskeleton, and rings with a green dot are bacteria being digested.',
    'Sizes are squeezed so that both the tiny archaea and the big cells fit. The circle in the corner shows the typical cell and a bacterium to the same scale.',
  ],
  genes: [
    'The genes of a typical cell. Each square in the grid is one of the 3,033 genes of the guests’ ancestor, grouped and coloured by what it does.',
    'A lit square is a gene the guests still have. A white dot means a working copy is also in the host genome; a hollow square means the gene has moved there for good. A dark square was lost. Tap a square to see what it is.',
    'The bar at the bottom is the host genome, drawn to the same scale throughout the run: archaeal genes, genes from the guests, genes for eukaryotic features, other new genes, and broken copies of guest DNA.',
  ],
  energy: [
    'The energy budget of a typical cell for one day, in ATP. The top bar is the food it takes in, split by how: through its surface, through its inner membranes, or by eating bacteria whole.',
    'The middle bar is the ATP made from that food: by the host’s fermentation, and by the guests’ respiration, of which the host gets only its share. The hatched part is what the guests keep for themselves.',
    'The bottom bar shows where the host’s ATP goes: upkeep of the cell, upkeep of its genes (every copy of them), what is lost to slow transport, introns and broken genes, and growth. A hatched part is ATP the host could spare but cannot grow with, because the cell as a whole, guests included, cannot grow any faster.',
    'The ruler at the bottom compares power per gene, with each mark ten times the last. The amber marker is the archaeon at the start, the green one the free-living bacterium and the white one this cell; the shaded band is what Lane and Martin estimated for eukaryotes.',
  ],
};

export const ABOUT_MODEL = [
  'The model follows 500 cells. Each step stands for 100 generations: cells leave descendants in proportion to how fast they grow, then the descendants mutate. A cell’s growth comes from an energy budget: food taken in through the surface, inner membranes or by eating bacteria, fermented by the host and burnt by its guests, minus the cost of keeping and copying the host, its genes and its guests.',
  'Each cell carries two genomes: the host’s, counted gene by gene in groups, and its guests’, in which all 3,033 genes are tracked one by one. Guest genes are lost in runs of neighbours, copied into the host by chance, and replaced only when the host can import their proteins. Seven eukaryotic features (protein import, the ATP carrier, the nucleus, inner membranes, the cytoskeleton, phagocytosis and sex) each need a set of new host genes, gained one at a time.',
  'It is a toy model. The cells are tracked as numbers, not shapes; seven features stand for thousands of real genes; and mutation rates are sped up hugely so that the whole story fits in 300,000 generations. It shows how the pieces push on each other, not exactly what happened.',
];
