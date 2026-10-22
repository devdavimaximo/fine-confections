# Maison Doce · site demonstrativo

Cópia do projeto tartemezaria/ sem a marca do cliente, usada como demo para prospecção no nicho de ateliês de doces finos.
Nome, logo (monograma MD em scripts/monogram.mjs), WhatsApp, Instagram e localização são genéricos.
Para personalizar: `brand` em src/content.ts.

---

## Notas do projeto original

Site one-page da Tarte Mezeria, atelier de doces finos em Porto Alegre e na
Serra Gaúcha. Substitui o link na bio: cardápio, bem-casados,
degustação, planejamento da mesa e contato, num lugar só.

## Conceito: "por dentro"

O site é uma degustação, e o scroll corta o doce: o bolo do hero se abre em
camadas, e as fotos da casa mostram macarons mordidos.

| Seção | O que acontece |
| --- | --- |
| Preloader | Tampa de ganache com o monograma TM; o oval se desenha como traço de caneta enquanto o shader compila, depois a tampa se abre em duas |
| Hero (I–IV) | Entremet Framboesa & Pistache em raymarching (SDF procedural): vitrine → lâmina de ouro cruza o topo e desce pela face → as metades se abrem → câmera entra no corte e as seis camadas ganham legenda. Bolo ilustrativo (não está no cardápio): trocar pelo bolo-assinatura do cliente |
| I · A casa | "Sabores autorais, aperfeiçoados com o tempo." (texto do próprio Instagram) |
| II · A mesa | Galeria horizontal fixada com as fotos de eventos, em molduras de arco e oval (o oval vem do monograma) |
| III · Cardápio | Os 43 doces do PDF com preço por unidade; prato de porcelana mostra o doce sob o cursor |
| IV · Bem-casados | Produto-assinatura 3D configurável: papel crepom (8 cores), fita de cetim (6), recheio (6 sabores, a câmera vai até o corte), tag com nomes e data, quantidade por convidados. O pedido vai pronto para o WhatsApp. Produto, sabores e preço são da demonstração |
| V · Degustação | Caixa com 24 doces em casa · apresentação de 28 doces no espaço em Moinhos |
| VI · Planeje | Calculadora com os dados da página de perguntas: 6 a 8 doces por convidado, média de investimento, taxa de montagem, copeiro |
| VII · Perguntas | As perguntas frequentes do PDF |
| VIII · Contato | Rodapé com chamada para agendar degustação |

## Pendências antes de publicar

1. **WhatsApp** (feito): (51) 9357-2413, em `brand.whatsapp` de [src/content.ts](src/content.ts).
   Todos os pedidos e conversas abrem o WhatsApp com a mensagem escrita; o Instagram
   aparece só como link do perfil. Confirmar com a casa se o número é esse mesmo
   (celulares hoje têm 9 dígitos: (51) 9 9357-2413).
2. **Texto do manifesto**: a frase do post ("Sabores autorais, aperfeiçoados com o
   tempo") é literal; o parágrafo abaixo dela é uma paráfrase do post, confirmar
   com a casa.
3. **og:image** em `index.html` usa caminho relativo; trocar pela URL absoluta
   quando houver domínio.
4. **Fotos do cardápio**: 19 de 43 já têm foto própria (`fotos/cardapio/`). Os outros
   24 ainda usam o recorte do PDF (~100 px), desfocado na lupa e na ficha:
   Tradicional, Beijinho de Coco, Paçoca, Prestígio, Churros, Brûlée Tradicional Branquinho, Ferrero Rocher, Chocolate Belga, Meio Amargo, Chocolate Branco, Coco Queimado, Praliné de Nozes Preto, Bombom de Maracujá, Bombom ao Rum com Pistache, Bombom de Cappuccino, Bombom de Uva com Amêndoas Laminadas, Morango ao Leite, Bombom de Morango Trufado, Mini Brownie Branco com Doce de Leite, Mini Brownie ao Leite com Nutella, Mini Quindim, Tartelette Banoffee, Tartelette Limão Siciliano, Mini Mil Folhas.
5. **Hero em celulares fracos** (decidido: fazer depois): se nem na resolução
   mínima o aparelho mantiver ~30 fps, trocar o 3D por três fotos reais de um
   doce da casa (fechado, aberto, close) com a mesma coreografia de scroll e legendas.
   Estimativa atual: iPhone 13+ e Android topo de linha em nitidez máxima;
   intermediários ficam fluidos, mas com o close um pouco borrado.
6. **Teste em celular real**: `npx vite --host` e abrir
   o endereço da rede local no aparelho.

Tudo o que é dado (preços, cores, sabores, prazos, regiões, locadoras) está em
`src/content.ts`, transcrito do cardápio e das páginas de degustação e FAQ.

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # dist/ (caminhos relativos, sobe em qualquer hospedagem estática)
npm run images    # regenera public/media a partir de fotos/
```

## Stack

React 19 · Vite · TypeScript · three.js + React Three Fiber · GSAP
(ScrollTrigger, SplitText) · Lenis. Fontes: Cormorant Garamond + Jost.

- `src/gl/cakeShader.ts`: o bolo inteiro em SDF num quad de tela. Para o
  compilador D3D do Windows (ANGLE), todos os laços usam limite dinâmico,
  ruído vem de textura e sombra/AO usam um `mapLite` sem relevo: compila em
  poucos segundos. O canvas é transparente fora do bolo, então o nome
  "Maison Doce" fica atrás dele e a sombra cai sobre o papel do DOM.
  Materiais: cobertura veludo rosé (pontilhado do spray, brilho rasante na
  silhueta), framboesas com drupelas, folha de ouro em flocos amassados,
  lascas de pistache; no corte, mousse de chocolate branco envolvendo os
  recheios, pão de ló de pistache com alvéolos, geleia de framboesa brilhante
  com sementes e base crocante. A luz do corte é rasante: relevo largo na
  face vira sombra, por isso a mousse é quase plana.
- **Laboratório do bolo**: com `npm run dev`, abra `/lab.html?v=vitrine`,
  `?v=lamina`, `?v=aberto`, `?v=macro` ou `?p=0.5` (qualquer ponto do corte)
  para ver o render parado com a câmera do site. Só existe no dev; não entra no build.
- `src/gl/timeline.ts`: câmera, metades e luz-chave em função do scroll, espelhado no
  shader; as legendas das camadas são projetadas com a mesma matemática.
- **Produto-assinatura: bem-casado** (`BemCasado.tsx`, `bemCasadoModel.ts`,
  `productMaterials.ts`, seção `Produto.tsx`): um produto só, com variações de
  aparência. Embrulho de papel crepom gerado como superfície de revolução que ganha
  pregas onde o papel franze até o pescoço, coroa com as quatro pontas da folha e a
  borda ondulada; rugas do crepe no shader. Fita de cetim com laço, tag com os nomes
  em folha de ouro (canvas) e um bem-casado aberto ao meio: pão de ló com alvéolos,
  recheio na cor do sabor e casquinha de açúcar, pintados no shader do corte.
  **Para adaptar a outro ateliê não há 3D a fazer**: as cores do papel e da fita, os
  sabores (cor do recheio e pedacinhos), os textos e o preço estão em `produto*` no
  `content.ts`. Para trocar de produto, basta um novo modelo com as mesmas props.
- Lições de desempenho do 3D (medidas com Intel Iris Xe):
  - com `scene.environment`, o three.js ignora `material.envMapIntensity` e usa
    `scene.environmentIntensity`; ambiente forte achata e lava as cores;
  - leitura de textura com derivada implícita dentro de `if` faz o compilador D3D
    do Windows rodar todos os ramos: use `textureLod`;
  - canvas opaco na cor do papel; grão sem `mix-blend-mode`; desenho sob demanda
    (parada, a caixa não gasta GPU).
- Desenho sob demanda: o hero só redesenha quando scroll, mouse ou o giro da
  vitrine mudam algo; parado no corte, 0 quadros/s. No celular a vitrine gira a 30 fps.
- Medido numa Intel Iris Xe a 1440×900: 58–60 fps em todas as cenas (a
  resolução adaptativa desce de 1,5 para 1,375 no corte, em telas retina).

## Fotos do cardápio

Coloque cada foto em `fotos/cardapio/` com o nome da tabela abaixo (`.jpg`, `.png`
ou `.webp`) e rode `npm run images`. O script recorta um círculo no centro do doce
(1000 px) e substitui o recorte do PDF; doces sem foto continuam com o recorte. Não
precisa mexer no código.

Para ficar perfeito: foto quadrada, de cima ou levemente de lado, o doce centralizado
ocupando uns 60% do quadro, fundo claro e liso (o site mistura a foto com o prato).

**Brigadeiros**

| Doce | Nome do arquivo |
| --- | --- |
| Tradicional | `tradicional.jpg` |
| Beijinho de Coco | `beijinho.jpg` |
| Paçoca | `pacoca.jpg` |
| Prestígio | `prestigio.jpg` |
| Ninho com Nutella | `ninho-nutella.jpg` |
| Churros | `churros.jpg` |
| Brûlée de Maracujá | `brulee-maracuja.jpg` |
| Brûlée Tradicional Branquinho | `brulee-branquinho.jpg` |
| Ferrero Rocher | `ferrero.jpg` |
| Amêndoas Tostadas Laminadas | `amendoas.jpg` |
| Limão Siciliano Crocante | `limao-crocante.jpg` |
| Chocolate Belga | `belga.jpg` |
| Meio Amargo | `meio-amargo.jpg` |
| Chocolate Branco | `chocolate-branco.jpg` |
| Coco Queimado | `coco-queimado.jpg` |
| Pistache | `pistache.jpg` |

**Bombons & pralinés**

| Doce | Nome do arquivo |
| --- | --- |
| Praliné de Nozes Preto | `pralines-nozes.jpg` |
| Praliné de Nuts Branco | `praline-nuts.jpg` |
| Bombom de Maracujá | `bombom-maracuja.jpg` |
| Bombom Caramelo Flor de Sal | `caramelo-flor-de-sal.jpg` |
| Bombom de Paçoca | `bombom-pacoca.jpg` |
| Bombom ao Rum com Pistache | `rum-pistache.jpg` |
| Bombom Doce de Leite Amanteigado | `doce-de-leite.jpg` |
| Bombom Veludo de Framboesa | `veludo-framboesa.jpg` |
| Bombom Cheesecake de Limão Siciliano | `cheesecake-limao.jpg` |
| Camafeu de Nozes | `camafeu.jpg` |
| Bombom Alpino com Physalis | `alpino-physalis.jpg` |
| Bombom de Cappuccino | `cappuccino.jpg` |
| Bombom de Uva com Amêndoas Laminadas | `uva-amendoas.jpg` |
| Morango ao Leite | `morango-ao-leite.jpg` |
| Bombom de Morango Trufado | `morango-trufado.jpg` |

**Minis & tartelettes**

| Doce | Nome do arquivo |
| --- | --- |
| Mini Cocadinha ao Chocolate Branco | `cocadinha.jpg` |
| Mini Brownie Branco com Doce de Leite | `brownie-branco.jpg` |
| Mini Brownie ao Leite com Nutella | `brownie-nutella.jpg` |
| Mini Quindim | `quindim.jpg` |
| Mini Pavlova | `pavlova.jpg` |
| Tartelette Banoffee | `tartelette-banoffee.jpg` |
| Tartelette Frutas Vermelhas | `tartelette-frutas.jpg` |
| Tartelette Limão Siciliano | `tartelette-limao.jpg` |
| Mini Mil Folhas | `mil-folhas.jpg` |

**Lançamentos**

| Doce | Nome do arquivo |
| --- | --- |
| Flakes de Nutella Crocante | `flakes-nutella.jpg` |
| Bombom de Ovomaltine | `ovomaltine.jpg` |
| Caixinha de Pistache | `caixinha-pistache.jpg` |
