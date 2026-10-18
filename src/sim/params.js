// Constants of the model, the settings the Lab can change, and the
// scenarios it can start from.
//
// Energy is counted in ATP. Power is ATP per day; the cost of building a
// new cell is ATP per division; growth rate is per day. Volumes are in µm³.
// The pond is poor in dissolved food, so an archaeon that only ferments
// doubles in about 17 days, like the Asgard archaeon Imachi et al. (2020)
// grew; a respiring bacterium of 1 µm³ in the same pond doubles in about a
// day; a cell that can eat bacteria whole and burn them in mitochondria
// doubles in hours.

export const K = {
  // population and time
  N: 500, // host cells followed
  G: 100, // generations per step
  steps: 3000, // length of a run
  // cells
  archV: 0.087, // an Asgard archaeon 0.55 µm across (Imachi et al. 2020)
  symV: 0.03, // one guest: a small alphaproteobacterium
  bactV: 1.0, // the free-living alphaproteobacterium used for comparison
  maxV: 100000,
  minV: 0.02,
  roomMax: 1, // guests can fill at most as much room as the host's own cytoplasm
  // building a new cell (per division)
  b: 1.6e10, // ATP per µm³ of new cell
  crep: 1.8e5, // ATP to copy one gene (about 1,000 base pairs)
  junk: 0.1, // a broken gene copy costs this share of a working one
  // upkeep (per day)
  m: 2.5e8, // ATP per µm³
  mg: 1.0e5, // ATP per gene for keeping its protein made, in a 1 µm³ cell
  gExp: 0.7, // ... rising as volume^0.7: bigger cells need more of each protein
  vctrl: 1.0, // µm³ of membrane-powered cell one genome copy can control
  // food (ATP a day, if fully burnt)
  jS: 3.8e9, // dissolved food taken in, per µm² of the host's surface
  jE: 1.0e10, // taken in by inner membranes (endocytosis), per µm³
  jP: 4e10, // eaten whole by phagocytosis, per µm³ ...
  vPrey: 2, // ... once the cell is well above the size of its prey
  preyRange: 0.1, // ... and a bit more the bigger it is: × (1 + preyRange ln(1 + V/vPrey))
  extraB: 0.2, // other new genes: food × (1 + extraB ln(1 + n/extraN))
  extraN: 3000,
  vHalf: 0.5, // µm³: inner membranes and a cytoskeleton give half their benefit at this size
  cytoB: 0.15, // food × (1 + cytoB): a cell that can move and change shape finds more
  // the host's own metabolism: fermentation
  ef: 0.1, // share of the food's energy fermentation gets
  syn0: 0.12, // fermentation speed with nothing to remove its waste
  qOut: 1, // partners outside the cell (hydrogen and oxygen scavengers)
  qIn: 0.05, // extra help from guests inside
  nq: 8, // guests needed for that full help
  // the guests' respiration
  ps: 5.4e9, // ATP a day one guest can make at most
  corrLoss: 0.85, // respiration kept per redox-core gene the guest no longer encodes itself
  // ATP the host gets from its guests
  x0: 0, // with no machinery
  xImport: 0.03, // once the host can send proteins (carriers, controls) into its guests
  xAAC: 0.85, // with the ADP/ATP carrier
  xMax: 0.95,
  // moving things across a big cell
  vd: 30, // µm³: above this, a cell without a cytoskeleton slows down
  cytoD: 50, // the cytoskeleton raises that limit (× 1 + cytoD)
  endoD: 50, // and so do inner membranes
  // introns and broken genes
  intronCost: 2e-4, // growth lost per intron in a cell without a nucleus
  intronSpread: 0.01, // copies per intron per step
  intronLoss: 0.002, // share of introns lost per step
  intronMax: 3, // introns per gene at most
  intronsPerEvent: 0.5, // introns arriving with each piece of guest DNA
  load: 0.12, // growth lost per 10,000 genes above loadFree without sex
  loadFree: 6000,
  // chance events, per cell per step
  pCapture: 4e-5, // an archaeon takes a partner inside, per attached partner
  capturedGuests: 2, // the partner divides once inside
  loss: 0.25, // chance a guest is not passed on, per guest (all must be missed)
  uSymDel: 2, // deletions in the guest genome
  symDelLen: 8, // genes in a deletion, on average
  lambdaT: 0.5, // pieces of guest DNA landing in the host genome (with many guests)
  transferLen: 6,
  importBase: 0.02, // chance a guest protein made by the host gets in without import machinery
  uDup: 0.6, // duplications adding host genes
  dupLen: 6,
  uHostDel: 0.2, // deletions of host genes
  hostDelLen: 6,
  startExtra: 0, // recent duplicates each archaeon starts with
  uSize: 0.25,
  sizeStep: 0.15,
  uShare: 0.25,
  shareStep: 0.15,
};

export const DEFAULTS = {
  transfer: 1, // × the rate guest DNA lands in the host genome
  importEase: 1, // × how easily host-made proteins get into the guest
  oxygen: 0.8, // how much of the food's leftover energy respiration can get
  food: 1, // × food supply
  geneCost: 1, // × the cost of a gene
  capture: true, // archaea can take a partner inside
  corr: true, // respiration needs its core genes encoded locally (CoRR)
  importable: true, // the host can evolve protein import
  aac: true, // the host can evolve the ADP/ATP carrier
  phago: true, // the host can evolve phagocytosis
  anyImport: false, // every guest protein and RNA can be imported, however oily
};

export const RANGES = {
  transfer: { min: 0, max: 5, step: 0.25 },
  importEase: { min: 0.25, max: 4, step: 0.25 },
  oxygen: { min: 0.1, max: 1, step: 0.05 },
  food: { min: 0.25, max: 4, step: 0.25 },
  geneCost: { min: 0.25, max: 4, step: 0.25 },
};

export const SCENARIOS = {
  real: { label: 'The merger', blurb: 'An archaeon takes in a bacterium, and the partnership becomes a eukaryote.', params: {} },
  alone: { label: 'No merger', blurb: 'The archaea never take a partner inside. Do they become complex on their own?', params: { capture: false } },
  noImport: { label: 'No protein import', blurb: 'The host never finds a way to send its proteins into its guests.', params: { importable: false } },
  noAAC: { label: 'No ATP export', blurb: 'The host never invents the ADP/ATP carrier, so it never taps its guests’ ATP directly.', params: { aac: false } },
  noCoRR: { label: 'No local control', blurb: 'Respiration works just as well with all its genes in the host.', params: { corr: false } },
  anything: { label: 'Import anything', blurb: 'Every guest protein and RNA can be imported, however oily, and no local control is needed.', params: { corr: false, anyImport: true } },
};
