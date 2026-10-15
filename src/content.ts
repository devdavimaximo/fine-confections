/* ==========================================================================
   Todo o texto e todos os dados do site. Fonte: cardápio em PDF, página de
   perguntas frequentes, página de degustação e perfil de um ateliê real (versão demonstrativa, sem marca).
   Nada aqui foi inventado; o que falta confirmar está marcado com TODO.
   ========================================================================== */

export const brand = {
  name: 'Maison Doce',
  descriptor: 'Atelier de doces finos',
  signature: 'Doceria artesanal',
  region: 'Doces finos para eventos',
  space: 'Espaço de degustação próprio',
  instagram: '@seuatelie',
  instagramUrl: 'https://www.instagram.com/',
  /** DEMO: sem número; troque pelo WhatsApp do cliente (DDI + DDD + número) */
  whatsapp: '',
  whatsappDisplay: 'Fale pelo WhatsApp',
};

export const nav = [
  { id: 'casa', label: 'A casa' },
  { id: 'mesa', label: 'A mesa' },
  { id: 'cardapio', label: 'Cardápio' },
  { id: 'torre', label: 'Macarons' },
  { id: 'degustacao', label: 'Degustação' },
  { id: 'planeje', label: 'Planeje' },
];

export const hero = {
  kicker: 'Atelier de doces finos',
  lede: 'Especialistas em doces finos para casamentos, formaturas e celebrações que pedem o melhor da confeitaria.',
  hint: 'Role para ver por dentro',
  /** o bombom do hero é 3D: avisar e levar até a foto de verdade */
  note: 'Animação ilustrativa',
  noteCta: 'ver fotos reais',
  realBadge: 'Foto real',
};

/** o corte do bombom, em quatro tempos (ver gl/timeline.ts) */
export const cut = {
  line: 'Todo doce fino guarda o melhor por dentro.',
  tag: 'Lançamento',
  name: 'Bombom de Queijo Brie com Goiabada',
  price: 6.9,
  text: 'O Romeu e Julieta, reescrito em chocolate branco: creme de queijo brie, goiabada no coração e ouro no topo.',
  layers: {
    gold: 'Folha de ouro',
    shell: 'Casca de chocolate branco',
    guava: 'Goiabada',
    cream: 'Creme de queijo brie',
  },
};

export const manifesto = {
  label: 'A casa',
  title: ['Sabores autorais,', 'aperfeiçoados', 'com o tempo.'],
  body: 'Na Maison Doce, cada doce nasce de uma receita própria, desenvolvida e refinada até chegar à mesa do seu evento. Chocolate, fruta, castanha e técnica: o que importa é o que você sente na primeira mordida.',
  pillars: [
    { k: 'Receitas', v: 'autorais' },
    { k: 'Casamentos, formaturas', v: 'e eventos' },
    { k: 'Degustação', v: 'antes da escolha' },
  ],
};

export const mesa = {
  label: 'A mesa',
  title: 'Eleve o nível do seu evento.',
  body: 'Doces finos para casamentos, formaturas e celebrações com montagem no local e serviço de copeiro durante o evento.',
  photos: [
    { src: 'mesatarte2', alt: 'Mesa de doces finos da Maison Doce em salão de festas, com bolo branco e arranjos de hortênsias', caption: 'A mesa, posta' },
    { src: 'mesatarte', alt: 'Bandeja de prata em três andares com bombons de amêndoas, caramelo flor de sal e brigadeiros de pistache', caption: 'Amêndoas, flor de sal, pistache' },
    { src: 'mesatarte4', alt: 'Mini pavlovas com morango e mirtilo em bandeja de prata', caption: 'Mini pavlova' },
    { src: 'mesatarte3', alt: 'Bandejas com brigadeiros de ninho com nutella, amêndoas e morangos ao leite', caption: 'Ninho com Nutella, morango ao leite' },
    { src: 'mesatarte5', alt: 'Bandeja retangular de bombons de caramelo com flor de sal', caption: 'Caramelo flor de sal' },
    { src: 'mesatarte6', alt: 'Brigadeiros de pistache em taça de cristal', caption: 'Brigadeiro de pistache' },
  ],
  facts: [
    { n: '6 a 8', l: 'doces por convidado' },
    { n: '7 a 9', l: 'meses de antecedência ideal' },
    { n: '3', l: 'locadoras parceiras para suportes' },
  ],
};

/* ---------- cardápio (valores por unidade) ---------- */

export type MenuItem = { slug: string; name: string; price: number; note?: string; isNew?: boolean };
export type MenuGroup = { id: string; title: string; subtitle: string; items: MenuItem[] };

export const menu: MenuGroup[] = [
  {
    id: 'brigadeiros',
    title: 'Brigadeiros',
    subtitle: 'Clássicos, brûlées e castanhas',
    items: [
      { slug: 'tradicional', name: 'Tradicional', price: 3.5 },
      { slug: 'beijinho', name: 'Beijinho de Coco', price: 3.5 },
      { slug: 'pacoca', name: 'Paçoca', price: 3.5 },
      { slug: 'prestigio', name: 'Prestígio', price: 3.5 },
      { slug: 'ninho-nutella', name: 'Ninho com Nutella', price: 3.5 },
      { slug: 'churros', name: 'Churros', price: 3.5 },
      { slug: 'brulee-maracuja', name: 'Brûlée de Maracujá', price: 3.9 },
      { slug: 'brulee-branquinho', name: 'Brûlée Tradicional Branquinho', price: 3.9 },
      { slug: 'ferrero', name: 'Ferrero Rocher', price: 3.9 },
      { slug: 'amendoas', name: 'Amêndoas Tostadas Laminadas', price: 3.9 },
      { slug: 'limao-crocante', name: 'Limão Siciliano Crocante', price: 3.9 },
      { slug: 'belga', name: 'Chocolate Belga', price: 3.9 },
      { slug: 'meio-amargo', name: 'Meio Amargo', price: 3.9 },
      { slug: 'chocolate-branco', name: 'Chocolate Branco', price: 3.9 },
      { slug: 'coco-queimado', name: 'Coco Queimado', price: 3.9 },
      { slug: 'pistache', name: 'Pistache', price: 5.0 },
    ],
  },
  {
    id: 'bombons',
    title: 'Bombons & pralinés',
    subtitle: 'Casca fina, recheio que escorre',
    items: [
      { slug: 'pralines-nozes', name: 'Praliné de Nozes Preto', price: 4.9 },
      { slug: 'praline-nuts', name: 'Praliné de Nuts Branco', price: 4.9 },
      { slug: 'bombom-maracuja', name: 'Bombom de Maracujá', price: 4.9 },
      { slug: 'caramelo-flor-de-sal', name: 'Bombom Caramelo Flor de Sal', price: 4.9 },
      { slug: 'bombom-pacoca', name: 'Bombom de Paçoca', price: 4.9 },
      { slug: 'rum-pistache', name: 'Bombom ao Rum com Pistache', price: 4.9, note: 'levemente alcoólico' },
      { slug: 'doce-de-leite', name: 'Bombom Doce de Leite Amanteigado', price: 4.9 },
      { slug: 'veludo-framboesa', name: 'Bombom Veludo de Framboesa', price: 4.9 },
      { slug: 'cheesecake-limao', name: 'Bombom Cheesecake de Limão Siciliano', price: 4.9 },
      { slug: 'camafeu', name: 'Camafeu de Nozes', price: 4.9 },
      { slug: 'alpino-physalis', name: 'Bombom Alpino com Physalis', price: 5.9 },
      { slug: 'cappuccino', name: 'Bombom de Cappuccino', price: 5.9 },
      { slug: 'uva-amendoas', name: 'Bombom de Uva com Amêndoas Laminadas', price: 6.5 },
      { slug: 'morango-ao-leite', name: 'Morango ao Leite', price: 6.9 },
      { slug: 'morango-trufado', name: 'Bombom de Morango Trufado', price: 8.0 },
    ],
  },
  {
    id: 'minis',
    title: 'Minis & tartelettes',
    subtitle: 'A confeitaria clássica, em uma mordida',
    items: [
      { slug: 'cocadinha', name: 'Mini Cocadinha ao Chocolate Branco', price: 4.9 },
      { slug: 'brownie-branco', name: 'Mini Brownie Branco com Doce de Leite', price: 5.9 },
      { slug: 'brownie-nutella', name: 'Mini Brownie ao Leite com Nutella', price: 5.9 },
      { slug: 'quindim', name: 'Mini Quindim', price: 5.9 },
      { slug: 'pavlova', name: 'Mini Pavlova', price: 5.9 },
      { slug: 'tartelette-banoffee', name: 'Tartelette Banoffee', price: 5.9 },
      { slug: 'tartelette-frutas', name: 'Tartelette Frutas Vermelhas', price: 5.9 },
      { slug: 'tartelette-limao', name: 'Tartelette Limão Siciliano', price: 5.9 },
      { slug: 'mil-folhas', name: 'Mini Mil Folhas', price: 6.9 },
    ],
  },
  {
    id: 'lancamentos',
    title: 'Lançamentos',
    subtitle: 'O que acabou de sair do atelier',
    items: [
      { slug: 'flakes-nutella', name: 'Flakes de Nutella Crocante', price: 5.5, isNew: true },
      { slug: 'ovomaltine', name: 'Bombom de Ovomaltine', price: 6.5, isNew: true },
      { slug: 'caixinha-pistache', name: 'Caixinha de Pistache', price: 6.9, isNew: true },
      { slug: 'brie-goiabada', name: 'Bombom de Queijo Brie com Goiabada', price: 6.9, isNew: true },
    ],
  },
];

export const menuCount = menu.reduce((n, g) => n + g.items.length, 0);

/* ---------- torre de macarons ---------- */

/** andares → macarons e valor; todos os pedidos incluem a torre */
export const towerSizes = [
  { floors: 5, units: 65, price: 850 },
  { floors: 6, units: 85, price: 1000 },
  { floors: 7, units: 115, price: 1300 },
  { floors: 8, units: 145, price: 1500 },
  { floors: 9, units: 170, price: 1750 },
  { floors: 10, units: 210, price: 1950 },
];

/** as 32 cores da cartela, na ordem numerada do cardápio (amostradas do PDF) */
export const macaronColors = [
  '#e99f74', '#ad7791', '#e3c3ce', '#f9d977', '#e8834d', '#606ba3', '#bd9d90', '#85c390',
  '#67473a', '#8f5e3e', '#912f62', '#a72d30', '#9b7663', '#63c0c8', '#ecacad', '#c1c998',
  '#fdf9ed', '#98d1c2', '#65aaba', '#e05f8d', '#ac5582', '#efdccb', '#a186af', '#dddb90',
  '#faf07d', '#f0d2ba', '#735070', '#e98d9a', '#f9e6a2', '#26b5bd', '#cb6b4b', '#8eac7a',
];

/** sabores do cardápio; `fill` é só a cor do recheio na torre 3D */
export const macaronFlavors = [
  { name: 'Chocolate branco', fill: '#f1e6cf' },
  { name: 'Amoras silvestres', fill: '#6d2a4a' },
  { name: 'Banoffee', fill: '#c9935a' },
  { name: 'Bergamota', fill: '#f0c66b' },
  { name: 'Blueberry', fill: '#4b3f73' },
  { name: 'Brigadeiro de avelã', fill: '#6b4228' },
  { name: 'Brigadeiro sem lactose', fill: '#5a3423', tag: 'sem lactose' },
  { name: 'Chocolate branco com nozes', fill: '#e6d3b0' },
  { name: 'Caramelo com flor de sal', fill: '#c07a3a' },
  { name: 'Cheesecake', fill: '#f3e3bf' },
  { name: 'Chiclete', fill: '#f2a6c8' },
  { name: 'Chocolate ao leite', fill: '#7a4a2c' },
  { name: 'Maracujá', fill: '#f2b630' },
  { name: 'Nutelinho', fill: '#6e3f24' },
  { name: 'Doce de leite', fill: '#c8894a' },
  { name: 'Nutella', fill: '#5f3620' },
  { name: 'Doce de leite sem lactose', fill: '#c08447', tag: 'sem lactose' },
  { name: 'Dark com chocolate', fill: '#3a2018' },
  { name: 'Framboesa', fill: '#c23552' },
  { name: 'Pistache', fill: '#a6bf5a' },
  { name: 'Frutas do bosque', fill: '#8a2846' },
  { name: 'Red velvet', fill: '#9e2b33' },
  { name: 'Iogurte com amarena', fill: '#e7c6cf' },
  { name: 'Tiramisù', fill: '#b48a64' },
  { name: 'Limão siciliano', fill: '#e9e27a' },
  { name: 'Creme brûlée', fill: '#e8c27f' },
] as { name: string; fill: string; tag?: string }[];

export const torre = {
  label: 'Macarons',
  /** abertura da seção: as fotos reais da casa */
  intro: {
    kicker: 'Fotos reais',
    title: ['Macarons', 'na cor da sua festa.'],
    body: '26 sabores e 32 cores na cartela, para combinar com a decoração do seu evento. Servidos em torre, de 5 a 10 andares, e todos os pedidos incluem a torre.',
    facts: [
      { n: '26', l: 'sabores' },
      { n: '32', l: 'cores na cartela' },
      { n: '65–210', l: 'macarons por torre' },
    ],
    hero: { src: 'macarons6', alt: 'Torre de macarons de pistache em mesa de evento, com pavlovas e brigadeiros ao lado', caption: 'Torre de pistache, servida em evento' },
    photos: [
      { src: 'macarons5', alt: 'Macarons brancos com recheio de pistache', caption: 'Pistache' },
      { src: 'macarons2', alt: 'Três macarons mordidos empilhados, mostrando os recheios', caption: 'Por dentro' },
      { src: 'macarons4', alt: 'Três macarons em tons de rosa', caption: 'Cores da cartela' },
    ],
  },
  demo: 'Simulação 3D · monte a sua',
  title: ['Monte a', 'sua torre.'],
  body: 'Escolha o tamanho, as cores da cartela e os sabores. Todos os pedidos incluem a torre.',
  hintDrag: 'arraste para girar',
};

/* ---------- degustação ---------- */

export const degustacao = {
  label: 'Degustação',
  title: ['Prove antes', 'de escolher.'],
  options: [
    {
      id: 'casa',
      kicker: 'Em sua casa',
      n: 24,
      unit: 'doces na caixa degustação',
      price: 102.9,
      body: 'Transforme a escolha dos seus doces em um momento íntimo e inesquecível. Com a caixa degustação, você leva a experiência Maison Doce para o conforto da sua casa.',
      terms: 'Entregas mediante agendamento',
      cta: 'Pedir a caixa',
      message: 'Olá, Maison Doce! Gostaria de agendar a entrega de uma caixa degustação com 24 unidades.',
    },
    {
      id: 'espaco',
      kicker: 'Em nosso espaço',
      n: 28,
      unit: 'doces apresentados à mesa',
      price: 189.9,
      body: 'Uma degustação personalizada, pensada para noivos, formandos e quem deseja celebrar conosco. Apresentamos nossa seleção de doces finos com a atenção e o carinho que cada história merece.',
      terms: 'Visitas mediante agendamento · para 2 pessoas',
      cta: 'Agendar visita',
      message: 'Olá, Maison Doce! Gostaria de agendar uma degustação no espaço do ateliê (para 2 pessoas).',
    },
  ],
};

/* ---------- planejador (dados da página de perguntas frequentes) ---------- */

export const planner = {
  label: 'Planeje',
  title: ['Quantos doces', 'para a sua festa?'],
  body: 'De forma geral, a recomendação é calcular entre 6 e 8 unidades por pessoa, variando conforme o estilo da festa, a duração do evento e a presença de outras sobremesas no menu.',
  perGuest: { min: 6, max: 8, initial: 7 },
  guests: { min: 50, max: 400, step: 10, initial: 150 },
  /** média de investimento em mesa de doces finos */
  references: [
    { guests: 100, units: 800, price: 3500 },
    { guests: 150, units: 1000, price: 5500 },
    { guests: 200, units: 1400, price: 6500 },
    { guests: 250, units: 1750, price: 8500 },
  ],
  /** taxa de montagem por faixa de unidades */
  assembly: [
    { from: 500, to: 1000, price: 500 },
    { from: 1000, to: 1500, price: 700 },
    { from: 1500, to: 2000, price: 800 },
    { from: 2000, to: 2500, price: 1000 },
    { from: 3000, to: Infinity, price: 1300 },
  ],
  waiter: 990,
  caveat: 'O valor pode variar conforme os sabores escolhidos, a personalização do orçamento e os diferenciais do evento. Taxa de entrega consultada pelo endereço.',
};

/* ---------- perguntas frequentes ---------- */

export const faq = [
  {
    q: 'Com quanto tempo de antecedência devo escolher os doces?',
    a: 'Para garantir a melhor experiência, recomendamos que os pedidos para eventos sejam feitos com 7 a 9 meses de antecedência. Também recebemos encomendas menores, mediante aprovação, com até 3 dias úteis de antecedência.',
  },
  {
    q: 'Quantos doces devo calcular por convidado?',
    a: 'De forma geral, entre 6 e 8 unidades por pessoa, variando conforme o estilo da festa, a duração do evento e a presença de sobremesas adicionais no menu.',
  },
  {
    q: 'A Maison Doce fornece suportes de mesa, acervos ou materiais decorativos?',
    a: 'No momento não fornecemos suportes e acervos. Indicamos uma das três locadoras parceiras: Locare, Ambientalize e Recanto.',
  },
  {
    q: 'Onde vocês entregam?',
    a: 'Entregamos na cidade e na região. A taxa de entrega é consultada a partir do endereço do evento.',
  },
  {
    q: 'Como funciona a montagem e o serviço durante a festa?',
    a: 'A taxa de montagem varia com a quantidade de doces: de R$ 500 (500 a 1.000 unidades) a R$ 1.300 (acima de 3.000 unidades). O serviço de copeiro durante o evento é de R$ 990.',
  },
  {
    q: 'Posso provar antes de fechar o pedido?',
    a: 'Sim. Você pode receber a caixa degustação com 24 unidades em casa (R$ 102,90) ou agendar uma apresentação de 28 doces no nosso espaço, para 2 pessoas (R$ 189,90).',
  },
];

export const contato = {
  label: 'Contato',
  title: ['Agende sua', 'degustação.'],
  body: 'Conte a data, o local e o número de convidados. A gente cuida do resto, doce por doce.',
  message: 'Olá, Maison Doce! Gostaria de conversar sobre doces finos para o meu evento.',
};
