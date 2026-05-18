// Seed data - Araçá Grill cardápio realista (sem pizzas, sem costela)

const CATEGORIAS = [
  "Entradas",
  "Churrasqueira",
  "À la Carte",
  "Massas",
  "Saladas",
  "Lanches",
  "Sobremesas",
  "Kids",
  "Sucos",
  "Refrigerantes",
  "Cervejas",
  "Caipirinhas",
  "Drinks",
  "Whiskies",
  "Vinhos",
];

const TAGS_DISPONIVEIS = [
  "vegetariano", "vegano", "sem glúten", "sem lactose",
  "picante", "novidade", "sazonal", "low carb", "mais pedido"
];

const ALERGENOS = ["glúten", "lactose", "ovo", "frutos do mar", "amendoim", "soja"];

const DESTAQUES = ["", "Mais Pedido", "Destaque da Casa", "Recomendado"];

const TONS_DE_VOZ = ["descontraído", "sofisticado", "familiar", "jovem", "gourmet"];

// Helper para criar uma ficha
const f = (data) => ({
  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
  foto_url: "",
  variacoes: [],
  ingredientes: [],
  modo_preparo: "",
  tempo_preparo_min: 0,
  rendimento_porcoes: 1,
  acompanhamentos: "",
  diferenciais: "",
  adicionais: "",
  tags: [],
  destaque: "",
  alergenos: [],
  descricao_interna: "",
  disponivel_delivery: true,
  disponivel_salao: true,
  ativo: true,
  bloqueado: false,
  motivo_bloqueio: [],
  criado_em: Date.now() - 1000 * 60 * 60 * 24 * 30,
  atualizado_em: Date.now() - 1000 * 60 * 60 * 24 * 2,
  ...data,
});

const SEED_DISHES = [
  // ===== ENTRADAS =====
  f({
    nome: "Bolinho de Costela",
    categoria: "Entradas",
    variacoes: [{ nome: "Porção (10un)", preco: 48, serve: "2/3 pessoas" }],
    ingredientes: [
      { nome: "carne de costela desfiada", quantidade: 400, unidade: "g", essencial: true },
      { nome: "mandioca", quantidade: 300, unidade: "g", essencial: true },
      { nome: "queijo muçarela", quantidade: 150, unidade: "g", essencial: false },
      { nome: "cebolinha", quantidade: 20, unidade: "g", essencial: false },
    ],
    acompanhamentos: "molho da casa",
    diferenciais: "costela bovina cozida por 8h, recheio cremoso",
    destaque: "Mais Pedido",
    tags: ["mais pedido"],
    alergenos: ["glúten", "lactose"],
  }),
  f({
    nome: "Polenta Frita com Parmesão",
    categoria: "Entradas",
    variacoes: [{ nome: "Porção", preco: 36, serve: "2 pessoas" }],
    ingredientes: [
      { nome: "polenta", quantidade: 500, unidade: "g", essencial: true },
      { nome: "queijo parmesão", quantidade: 80, unidade: "g", essencial: true },
      { nome: "alecrim", quantidade: 5, unidade: "g", essencial: false },
    ],
    diferenciais: "crocante por fora, cremosa por dentro",
    tags: ["vegetariano"],
    alergenos: ["lactose"],
  }),
  f({
    nome: "Pastéis Sortidos",
    categoria: "Entradas",
    variacoes: [
      { nome: "10 unidades", preco: 42, serve: "2/3 pessoas" },
      { nome: "20 unidades", preco: 78, serve: "4/5 pessoas" },
    ],
    ingredientes: [
      { nome: "massa de pastel", quantidade: 500, unidade: "g", essencial: true },
      { nome: "queijo muçarela", quantidade: 200, unidade: "g", essencial: true },
      { nome: "carne moída", quantidade: 200, unidade: "g", essencial: true },
      { nome: "palmito", quantidade: 150, unidade: "g", essencial: false },
    ],
    diferenciais: "massa fininha feita na casa",
    destaque: "Destaque da Casa",
    alergenos: ["glúten", "lactose"],
  }),
  f({
    nome: "Bruschetta de Tomate",
    categoria: "Entradas",
    variacoes: [{ nome: "Porção (6un)", preco: 32, serve: "2 pessoas" }],
    ingredientes: [
      { nome: "pão italiano", quantidade: 300, unidade: "g", essencial: true },
      { nome: "tomate", quantidade: 200, unidade: "g", essencial: true },
      { nome: "manjericão", quantidade: 10, unidade: "g", essencial: true },
      { nome: "azeite", quantidade: 30, unidade: "ml", essencial: false },
    ],
    tags: ["vegetariano"],
    alergenos: ["glúten"],
  }),

  // ===== CHURRASQUEIRA =====
  f({
    nome: "Picanha na Brasa",
    categoria: "Churrasqueira",
    variacoes: [
      { nome: "Inteira", preco: 168, serve: "3/4 pessoas" },
      { nome: "Meia", preco: 92, serve: "2 pessoas" },
    ],
    ingredientes: [
      { nome: "picanha bovina", quantidade: 1200, unidade: "g", essencial: true },
      { nome: "sal grosso", quantidade: 30, unidade: "g", essencial: true },
      { nome: "alho", quantidade: 20, unidade: "g", essencial: false },
    ],
    acompanhamentos: "arroz branco, farofa da casa, vinagrete e mandioca frita",
    diferenciais: "carne maturada 21 dias, feita na brasa",
    destaque: "Mais Pedido",
    tags: ["mais pedido", "sem glúten"],
  }),
  f({
    nome: "Maminha na Brasa",
    categoria: "Churrasqueira",
    variacoes: [
      { nome: "Inteira", preco: 142, serve: "3/4 pessoas" },
      { nome: "Meia", preco: 78, serve: "2 pessoas" },
    ],
    ingredientes: [
      { nome: "maminha bovina", quantidade: 1000, unidade: "g", essencial: true },
      { nome: "sal grosso", quantidade: 25, unidade: "g", essencial: true },
    ],
    acompanhamentos: "arroz branco, farofa da casa, vinagrete e mandioca frita",
    tags: ["sem glúten"],
  }),
  f({
    nome: "Linguiça Artesanal",
    categoria: "Churrasqueira",
    variacoes: [{ nome: "Porção", preco: 52, serve: "2 pessoas" }],
    ingredientes: [
      { nome: "linguiça artesanal", quantidade: 500, unidade: "g", essencial: true },
    ],
    acompanhamentos: "pão de alho, vinagrete",
    diferenciais: "produção local, defumada na lenha",
    destaque: "Recomendado",
    alergenos: ["glúten"],
  }),
  f({
    nome: "Coração de Frango",
    categoria: "Churrasqueira",
    variacoes: [{ nome: "Porção (300g)", preco: 46, serve: "2 pessoas" }],
    ingredientes: [
      { nome: "coração de frango", quantidade: 300, unidade: "g", essencial: true },
      { nome: "sal grosso", quantidade: 10, unidade: "g", essencial: true },
    ],
    tags: ["sem glúten", "low carb"],
  }),

  // ===== À LA CARTE =====
  f({
    nome: "Filé St. Peter ao Camarão",
    categoria: "À la Carte",
    variacoes: [{ nome: "Prato", preco: 89, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "filé de St. Peter", quantidade: 220, unidade: "g", essencial: true },
      { nome: "camarão rosa", quantidade: 100, unidade: "g", essencial: true },
      { nome: "creme de leite", quantidade: 200, unidade: "ml", essencial: true },
      { nome: "alcaparras", quantidade: 15, unidade: "g", essencial: false },
      { nome: "salsinha", quantidade: 5, unidade: "g", essencial: false },
    ],
    acompanhamentos: "arroz branco e batata sauté",
    diferenciais: "molho cremoso de camarão flambado",
    destaque: "Destaque da Casa",
    alergenos: ["lactose", "frutos do mar"],
  }),
  f({
    nome: "Frango à Parmegiana",
    categoria: "À la Carte",
    variacoes: [{ nome: "Prato", preco: 64, serve: "1/2 pessoas" }],
    ingredientes: [
      { nome: "filé de frango", quantidade: 250, unidade: "g", essencial: true },
      { nome: "queijo muçarela", quantidade: 150, unidade: "g", essencial: true },
      { nome: "molho de tomate", quantidade: 200, unidade: "ml", essencial: true },
      { nome: "farinha de rosca", quantidade: 80, unidade: "g", essencial: true },
    ],
    acompanhamentos: "arroz branco e fritas",
    destaque: "Mais Pedido",
    tags: ["mais pedido"],
    alergenos: ["glúten", "lactose", "ovo"],
  }),
  f({
    nome: "Filé Mignon ao Molho Madeira",
    categoria: "À la Carte",
    variacoes: [{ nome: "Prato", preco: 96, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "filé mignon", quantidade: 220, unidade: "g", essencial: true },
      { nome: "vinho madeira", quantidade: 80, unidade: "ml", essencial: true },
      { nome: "champignon", quantidade: 80, unidade: "g", essencial: false },
      { nome: "manteiga", quantidade: 30, unidade: "g", essencial: false },
    ],
    acompanhamentos: "arroz branco e batata sauté",
    diferenciais: "redução de vinho madeira por 2h",
    alergenos: ["lactose"],
  }),
  f({
    nome: "Tilápia Grelhada",
    categoria: "À la Carte",
    variacoes: [{ nome: "Prato", preco: 72, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "filé de tilápia", quantidade: 240, unidade: "g", essencial: true },
      { nome: "limão siciliano", quantidade: 30, unidade: "g", essencial: false },
      { nome: "alcaparras", quantidade: 10, unidade: "g", essencial: false },
    ],
    acompanhamentos: "arroz com brócolis e legumes salteados",
    tags: ["low carb", "sem glúten"],
  }),

  // ===== MASSAS =====
  f({
    nome: "Espaguete à Bolonhesa",
    categoria: "Massas",
    variacoes: [{ nome: "Prato", preco: 58, serve: "1/2 pessoas" }],
    ingredientes: [
      { nome: "espaguete", quantidade: 200, unidade: "g", essencial: true },
      { nome: "carne moída", quantidade: 180, unidade: "g", essencial: true },
      { nome: "molho de tomate", quantidade: 200, unidade: "ml", essencial: true },
      { nome: "queijo parmesão", quantidade: 30, unidade: "g", essencial: false },
    ],
    alergenos: ["glúten", "lactose"],
  }),
  f({
    nome: "Talharim ao Funghi",
    categoria: "Massas",
    variacoes: [{ nome: "Prato", preco: 68, serve: "1/2 pessoas" }],
    ingredientes: [
      { nome: "talharim", quantidade: 200, unidade: "g", essencial: true },
      { nome: "funghi seco", quantidade: 30, unidade: "g", essencial: true },
      { nome: "creme de leite", quantidade: 150, unidade: "ml", essencial: true },
    ],
    tags: ["vegetariano"],
    diferenciais: "funghi italiano hidratado em vinho branco",
    alergenos: ["glúten", "lactose"],
  }),

  // ===== SALADAS =====
  f({
    nome: "Salada Caesar",
    categoria: "Saladas",
    variacoes: [{ nome: "Prato", preco: 42, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "alface romana", quantidade: 150, unidade: "g", essencial: true },
      { nome: "frango grelhado", quantidade: 120, unidade: "g", essencial: false },
      { nome: "croutons", quantidade: 40, unidade: "g", essencial: false },
      { nome: "queijo parmesão", quantidade: 30, unidade: "g", essencial: true },
      { nome: "molho caesar", quantidade: 40, unidade: "ml", essencial: true },
    ],
    alergenos: ["glúten", "lactose", "ovo"],
  }),

  // ===== LANCHES =====
  f({
    nome: "X-Araçá",
    categoria: "Lanches",
    variacoes: [{ nome: "Único", preco: 38, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "pão brioche", quantidade: 1, unidade: "un", essencial: true },
      { nome: "hambúrguer 180g", quantidade: 180, unidade: "g", essencial: true },
      { nome: "queijo cheddar", quantidade: 40, unidade: "g", essencial: true },
      { nome: "bacon", quantidade: 30, unidade: "g", essencial: false },
    ],
    acompanhamentos: "batata frita",
    adicionais: "bacon extra, cheddar extra, ovo, cebola caramelizada",
    diferenciais: "blend bovino exclusivo da casa",
    destaque: "Mais Pedido",
    tags: ["mais pedido"],
    alergenos: ["glúten", "lactose"],
  }),

  // ===== SOBREMESAS =====
  f({
    nome: "Pudim de Leite",
    categoria: "Sobremesas",
    variacoes: [{ nome: "Fatia", preco: 18, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "leite condensado", quantidade: 1, unidade: "lata", essencial: true },
      { nome: "leite", quantidade: 200, unidade: "ml", essencial: true },
      { nome: "ovo", quantidade: 3, unidade: "un", essencial: true },
      { nome: "açúcar", quantidade: 200, unidade: "g", essencial: true },
    ],
    tags: ["vegetariano"],
    alergenos: ["lactose", "ovo"],
  }),
  f({
    nome: "Petit Gateau",
    categoria: "Sobremesas",
    variacoes: [{ nome: "Único", preco: 26, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "chocolate meio amargo", quantidade: 80, unidade: "g", essencial: true },
      { nome: "manteiga", quantidade: 40, unidade: "g", essencial: true },
      { nome: "ovo", quantidade: 2, unidade: "un", essencial: true },
      { nome: "sorvete de creme", quantidade: 1, unidade: "bola", essencial: false },
    ],
    diferenciais: "centro líquido de chocolate belga",
    destaque: "Destaque da Casa",
    alergenos: ["glúten", "lactose", "ovo"],
  }),

  // ===== KIDS =====
  f({
    nome: "Mini Hambúrguer Kids",
    categoria: "Kids",
    variacoes: [{ nome: "Único", preco: 28, serve: "1 criança" }],
    ingredientes: [
      { nome: "pão de hambúrguer", quantidade: 1, unidade: "un", essencial: true },
      { nome: "hambúrguer 80g", quantidade: 80, unidade: "g", essencial: true },
    ],
    acompanhamentos: "batata palito",
    alergenos: ["glúten"],
  }),

  // ===== SUCOS =====
  f({
    nome: "Suco de Laranja Natural",
    categoria: "Sucos",
    variacoes: [
      { nome: "300ml", preco: 12, serve: "1 pessoa" },
      { nome: "500ml", preco: 18, serve: "1/2 pessoas" },
    ],
    ingredientes: [
      { nome: "laranja pera", quantidade: 4, unidade: "un", essencial: true },
    ],
    tags: ["sem glúten", "vegano"],
  }),
  f({
    nome: "Suco Verde Detox",
    categoria: "Sucos",
    variacoes: [{ nome: "400ml", preco: 16, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "couve", quantidade: 30, unidade: "g", essencial: true },
      { nome: "abacaxi", quantidade: 150, unidade: "g", essencial: true },
      { nome: "gengibre", quantidade: 5, unidade: "g", essencial: false },
      { nome: "hortelã", quantidade: 5, unidade: "g", essencial: false },
    ],
    tags: ["vegano", "low carb", "novidade"],
  }),

  // ===== REFRIGERANTES =====
  f({
    nome: "Refrigerante Lata",
    categoria: "Refrigerantes",
    variacoes: [{ nome: "350ml", preco: 7, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "refrigerante 350ml", quantidade: 1, unidade: "un", essencial: true },
    ],
  }),
  f({
    nome: "Água Mineral",
    categoria: "Refrigerantes",
    variacoes: [
      { nome: "Com Gás", preco: 6, serve: "1 pessoa" },
      { nome: "Sem Gás", preco: 5, serve: "1 pessoa" },
    ],
    ingredientes: [{ nome: "água mineral 500ml", quantidade: 1, unidade: "un", essencial: true }],
  }),

  // ===== CERVEJAS =====
  f({
    nome: "Chopp Pilsen",
    categoria: "Cervejas",
    variacoes: [
      { nome: "Tulipa 300ml", preco: 11, serve: "1 pessoa" },
      { nome: "Caneca 500ml", preco: 17, serve: "1 pessoa" },
    ],
    ingredientes: [{ nome: "chopp pilsen", quantidade: 500, unidade: "ml", essencial: true }],
    diferenciais: "tirado no momento, sempre gelado",
    destaque: "Mais Pedido",
    alergenos: ["glúten"],
  }),
  f({
    nome: "Cerveja Long Neck",
    categoria: "Cervejas",
    variacoes: [{ nome: "355ml", preco: 13, serve: "1 pessoa" }],
    ingredientes: [{ nome: "cerveja long neck", quantidade: 1, unidade: "un", essencial: true }],
    alergenos: ["glúten"],
  }),

  // ===== CAIPIRINHAS =====
  f({
    nome: "Caipirinha de Limão",
    categoria: "Caipirinhas",
    variacoes: [{ nome: "Único", preco: 22, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "cachaça", quantidade: 60, unidade: "ml", essencial: true },
      { nome: "limão tahiti", quantidade: 1, unidade: "un", essencial: true },
      { nome: "açúcar", quantidade: 15, unidade: "g", essencial: false },
    ],
    tags: ["sem glúten"],
  }),
  f({
    nome: "Caipirinha de Frutas Vermelhas",
    categoria: "Caipirinhas",
    variacoes: [{ nome: "Único", preco: 26, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "vodka", quantidade: 60, unidade: "ml", essencial: true },
      { nome: "frutas vermelhas", quantidade: 80, unidade: "g", essencial: true },
      { nome: "açúcar", quantidade: 15, unidade: "g", essencial: false },
    ],
    tags: ["novidade", "sem glúten"],
  }),

  // ===== DRINKS =====
  f({
    nome: "Gin Tônica",
    categoria: "Drinks",
    variacoes: [{ nome: "Taça", preco: 32, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "gin", quantidade: 50, unidade: "ml", essencial: true },
      { nome: "água tônica", quantidade: 180, unidade: "ml", essencial: true },
      { nome: "limão siciliano", quantidade: 1, unidade: "un", essencial: false },
      { nome: "zimbro", quantidade: 3, unidade: "un", essencial: false },
    ],
    diferenciais: "gin London Dry, tônica artesanal",
    destaque: "Recomendado",
    tags: ["sem glúten"],
  }),
  f({
    nome: "Leblon Gin Tônica",
    categoria: "Drinks",
    variacoes: [{ nome: "Taça", preco: 38, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "gin", quantidade: 50, unidade: "ml", essencial: true },
      { nome: "água tônica", quantidade: 180, unidade: "ml", essencial: true },
      { nome: "manjericão", quantidade: 5, unidade: "g", essencial: false },
      { nome: "morango", quantidade: 30, unidade: "g", essencial: false },
    ],
    tags: ["novidade", "sem glúten"],
  }),
  f({
    nome: "Negroni",
    categoria: "Drinks",
    variacoes: [{ nome: "Taça", preco: 36, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "gin", quantidade: 30, unidade: "ml", essencial: true },
      { nome: "campari", quantidade: 30, unidade: "ml", essencial: true },
      { nome: "vermute rosso", quantidade: 30, unidade: "ml", essencial: true },
    ],
    tags: ["sem glúten"],
  }),
  f({
    nome: "Aperol Spritz",
    categoria: "Drinks",
    variacoes: [{ nome: "Taça", preco: 34, serve: "1 pessoa" }],
    ingredientes: [
      { nome: "aperol", quantidade: 60, unidade: "ml", essencial: true },
      { nome: "prosecco", quantidade: 90, unidade: "ml", essencial: true },
      { nome: "água com gás", quantidade: 30, unidade: "ml", essencial: false },
      { nome: "laranja", quantidade: 1, unidade: "fatia", essencial: false },
    ],
    destaque: "Recomendado",
    tags: ["sem glúten"],
  }),

  // ===== WHISKIES =====
  f({
    nome: "Whisky Nacional Dose",
    categoria: "Whiskies",
    variacoes: [{ nome: "50ml", preco: 18, serve: "1 pessoa" }],
    ingredientes: [{ nome: "whisky nacional", quantidade: 50, unidade: "ml", essencial: true }],
  }),
  f({
    nome: "Whisky 12 anos Dose",
    categoria: "Whiskies",
    variacoes: [{ nome: "50ml", preco: 38, serve: "1 pessoa" }],
    ingredientes: [{ nome: "whisky 12 anos", quantidade: 50, unidade: "ml", essencial: true }],
  }),

  // ===== VINHOS =====
  f({
    nome: "Vinho Tinto da Casa",
    categoria: "Vinhos",
    variacoes: [
      { nome: "Taça", preco: 24, serve: "1 pessoa" },
      { nome: "Garrafa", preco: 98, serve: "3/4 pessoas" },
    ],
    ingredientes: [{ nome: "vinho tinto Cabernet Sauvignon", quantidade: 750, unidade: "ml", essencial: true }],
    diferenciais: "safra 2021, Vale dos Vinhedos",
  }),
];

// Falta ativa de gin (demo)
const SEED_SHORTAGES = [
  {
    id: "short-1",
    ingrediente: "gin",
    status: "ativo",
    reportado_em: Date.now() - 1000 * 60 * 60 * 3, // 3h atrás
    resolvido_em: null,
    pratos_afetados: [], // populado dinamicamente
  },
];

const SEED_HISTORY = [
  { id: "h1", ingrediente: "creme de leite", data_inicio: Date.now() - 86400000*45, data_fim: Date.now() - 86400000*44, duracao_horas: 18, pratos_bloqueados_count: 2, pratos_adaptados_count: 1 },
  { id: "h2", ingrediente: "creme de leite", data_inicio: Date.now() - 86400000*30, data_fim: Date.now() - 86400000*29, duracao_horas: 22, pratos_bloqueados_count: 2, pratos_adaptados_count: 1 },
  { id: "h3", ingrediente: "creme de leite", data_inicio: Date.now() - 86400000*15, data_fim: Date.now() - 86400000*14, duracao_horas: 12, pratos_bloqueados_count: 2, pratos_adaptados_count: 1 },
  { id: "h4", ingrediente: "alcaparras", data_inicio: Date.now() - 86400000*40, data_fim: Date.now() - 86400000*39, duracao_horas: 8, pratos_bloqueados_count: 0, pratos_adaptados_count: 2 },
  { id: "h5", ingrediente: "alcaparras", data_inicio: Date.now() - 86400000*20, data_fim: Date.now() - 86400000*19, duracao_horas: 6, pratos_bloqueados_count: 0, pratos_adaptados_count: 2 },
  { id: "h6", ingrediente: "camarão rosa", data_inicio: Date.now() - 86400000*22, data_fim: Date.now() - 86400000*21, duracao_horas: 36, pratos_bloqueados_count: 1, pratos_adaptados_count: 0 },
  { id: "h7", ingrediente: "gin", data_inicio: Date.now() - 86400000*8, data_fim: Date.now() - 86400000*7, duracao_horas: 14, pratos_bloqueados_count: 4, pratos_adaptados_count: 0 },
  { id: "h8", ingrediente: "queijo parmesão", data_inicio: Date.now() - 86400000*12, data_fim: Date.now() - 86400000*11, duracao_horas: 5, pratos_bloqueados_count: 0, pratos_adaptados_count: 3 },
];

Object.assign(window, {
  CATEGORIAS,
  TAGS_DISPONIVEIS,
  ALERGENOS,
  DESTAQUES,
  TONS_DE_VOZ,
  SEED_DISHES,
  SEED_SHORTAGES,
  SEED_HISTORY,
});
