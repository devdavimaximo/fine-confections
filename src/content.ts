/* ==========================================================================
   Todo o texto e todos os dados do site. Fonte: cardápio em PDF, página de
   perguntas frequentes, página de degustação e perfil de um ateliê real (versão demonstrativa, sem marca).
   Nada aqui foi inventado; o que falta confirmar está marcado com TODO.
   ========================================================================== */

export const brand = {
  /** DEMO: nome genérico de propósito; troque pelo nome do cliente (o site inteiro lê daqui) */
  name: 'Seu Atelier',
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
  { id: 'bem-casado', label: 'Bem-casados' },
  { id: 'degustacao', label: 'Degustação' },
  { id: 'planeje', label: 'Planeje' },
];

export const hero = {
  kicker: 'Atelier de doces finos',
  lede: 'Especialistas em doces finos para casamentos, formaturas e celebrações que pedem o melhor da confeitaria.',
  hint: 'Role para ver por dentro',
  /** o bolo do hero é 3D: avisar e levar até a foto de verdade */
  note: 'Animação ilustrativa',
  noteCta: 'ver fotos reais',
  realBadge: 'Foto real',
};

/**
 * o corte do bolo, em quatro tempos (ver gl/timeline.ts)
 * DEMO: bolo ilustrativo, não está no cardápio; troque pelo bolo-assinatura do cliente
 */
export const cut = {
  line: 'Todo doce fino guarda o melhor por dentro.',
  tag: 'Assinatura da casa',
  name: 'Entremet Framboesa & Pistache',
  priceNote: 'Sob encomenda',
  text: 'Mousse de chocolate branco, pão de ló de pistache e geleia de framboesa, sob um veludo rosé com framboesas frescas e folha de ouro.',
  layers: {
    gold: 'Framboesas e folha de ouro',
    coat: 'Veludo de chocolate branco',
    cream: 'Mousse de chocolate branco',
    sponge: 'Pão de ló de pistache',
    jam: 'Geleia de framboesa',
    crunch: 'Crocante de pistache',
  },
};

export const manifesto = {
  label: 'A casa',
  title: ['Sabores autorais,', 'aperfeiçoados', 'com o tempo.'],
  body: 'Aqui, cada doce nasce de uma receita própria, desenvolvida e refinada até chegar à mesa do seu evento. Chocolate, fruta, castanha e técnica: o que importa é o que você sente na primeira mordida.',
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
    { src: 'mesatarte2', alt: 'Mesa de doces finos em salão de festas, com bolo branco e arranjos de hortênsias', caption: 'A mesa, posta' },
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
    ],
  },
];

export const menuCount = menu.reduce((n, g) => n + g.items.length, 0);

/* ---------- produto-assinatura: bem-casado ----------
   Um produto só, com variações de aparência. Para adaptar a outro ateliê basta
   editar as listas abaixo (cores, sabores, textos, preço): o 3D lê tudo daqui.
   DEMO: sabores e preço são ilustrativos; troque pelos do cliente. */

export const produto = {
  label: 'Bem-casados',
  eyebrow: 'Para o seu sim',
  demo: 'Simulação 3D · monte o seu',
  title: ['Bem-casado', 'com o seu nome.'],
  body: 'O doce que deseja felicidade aos noivos: pão de ló macio, recheio cremoso e casquinha de açúcar, embrulhado à mão. Escolha o papel, a fita, o sabor e a tag com os nomes.',
  hintDrag: 'arraste para girar',
  /** DEMO: valor por unidade; deixe `null` para mostrar "sob consulta" */
  price: 6.9 as number | null,
  /** a tag pendurada no laço */
  tag: { namesPlaceholder: 'Ana & Pedro', datePlaceholder: '12.09.2027', max: 22 },
  guests: { min: 50, max: 400, step: 10, initial: 150 },
  /** combinação que aparece primeiro (índices nas listas abaixo) */
  initial: { paper: 2, ribbon: 0, flavor: 0 },
};

/** papel crepom do embrulho */
export const produtoPapers = [
  { name: 'Branco', hex: '#f4f1ea' },
  { name: 'Marfim', hex: '#ece0c9' },
  { name: 'Rosé', hex: '#e5b9b1' },
  { name: 'Lavanda', hex: '#bfb2d2' },
  { name: 'Sálvia', hex: '#aab79c' },
  { name: 'Serenity', hex: '#aebfd3' },
  { name: 'Champanhe', hex: '#dcc49a' },
  { name: 'Marsala', hex: '#7b3036' },
];

/** fita de cetim do laço (a primeira de cada lista é o ponto de partida) */
export const produtoRibbons = [
  { name: 'Ouro', hex: '#c6a052', metallic: true },
  { name: 'Marfim', hex: '#f1e8d8' },
  { name: 'Rosé', hex: '#d49b93' },
  { name: 'Oliva', hex: '#6c7350' },
  { name: 'Azul', hex: '#5d7290' },
  { name: 'Vinho', hex: '#5a1d24' },
];

/** recheio: a cor que aparece no corte; `speck` = pedacinhos (nozes, raspas, sementes) */
export const produtoFlavors = [
  { name: 'Doce de leite', fill: '#b9773a' },
  { name: 'Brigadeiro', fill: '#4a2a1c' },
  { name: 'Doce de leite com nozes', fill: '#b06f36', speck: '#5e3a1e' },
  { name: 'Limão siciliano', fill: '#ece08a', speck: '#c9c25a' },
  { name: 'Frutas vermelhas', fill: '#a3263c', speck: '#4d0c18' },
  { name: 'Pistache', fill: '#a7b45c', speck: '#6f7d35' },
] as { name: string; fill: string; speck?: string }[];

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
      body: 'Transforme a escolha dos seus doces em um momento íntimo e inesquecível. Com a caixa degustação, você leva a experiência do ateliê para o conforto da sua casa.',
      terms: 'Entregas mediante agendamento',
      cta: 'Pedir a caixa',
      message: `Olá, ${brand.name}! Gostaria de agendar a entrega de uma caixa degustação com 24 unidades.`,
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
      message: `Olá, ${brand.name}! Gostaria de agendar uma degustação no espaço do ateliê (para 2 pessoas).`,
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
    q: 'O ateliê fornece suportes de mesa, acervos ou materiais decorativos?',
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
  message: `Olá, ${brand.name}! Gostaria de conversar sobre doces finos para o meu evento.`,
};
