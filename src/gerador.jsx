// Módulo 3 - Gerador de Cardápio com IA

function GeradorModule() {
  const { dishes, config, toast } = useStore();
  const [step, setStep] = useState(1);
  const [sel, setSel] = useState(new Set());
  const [plat, setPlat] = useState("ifood");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({});

  const selectAllActive = () => setSel(new Set(dishes.filter((d) => d.ativo && !d.bloqueado).map((d) => d.id)));
  const selectDestaques = () => setSel(new Set(dishes.filter((d) => d.ativo && d.destaque).map((d) => d.id)));
  const clearAll = () => setSel(new Set());
  const toggle = (id) =>
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const byCat = useMemo(() => {
    const g = {};
    dishes.forEach((d) => { (g[d.categoria] ||= []).push(d); });
    return g;
  }, [dishes]);

  const toggleCat = (cat) => {
    const ids = byCat[cat].map((d) => d.id);
    const allOn = ids.every((id) => sel.has(id));
    setSel((s) => {
      const n = new Set(s);
      allOn ? ids.forEach((id) => n.delete(id)) : ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const gerar = async () => {
    if (sel.size === 0) { toast("Selecione pelo menos um prato", "danger"); return; }
    setStep(3);
    setLoading(true);

    const selecionados = dishes.filter((d) => sel.has(d.id));
    const apiKey = config.gemini_api_key;

    if (!apiKey) {
      // Fallback: mock generation
      await new Promise((r) => setTimeout(r, 1200));
      const out = {};
      for (const d of selecionados) out[d.id] = mockGenerate(d, plat, config.tom_de_voz);
      setResults(out);
      setLoading(false);
      toast("Chave Gemini não configurada — textos gerados localmente (sem IA)", "warn");
      return;
    }

    try {
      const pratosPayload = selecionados.map((d) => ({
        id: d.id,
        nome: d.nome,
        categoria: d.categoria,
        diferenciais: d.diferenciais || "",
        acompanhamentos: d.acompanhamentos || "",
        ingredientes_principais: d.ingredientes.filter((i) => i.essencial).map((i) => i.nome).slice(0, 5),
        tags: d.tags,
        destaque: d.destaque,
        alergenos: d.alergenos,
        adicionais: d.adicionais || "",
        variacoes: d.variacoes.map((v) => ({ nome: v.nome, preco: v.preco, serve: v.serve })),
      }));

      const platRules = {
        ifood: "Título: até 50 caracteres. Descrição: até 150 caracteres. Linguagem de delivery: direta, apetitosa, vendedora. Sem texto prolixo.",
        brendi: "Título: até 50 caracteres. Descrição: até 150 caracteres. Similar ao iFood, linguagem direta e objetiva.",
        pdf: "Texto elegante, 2-3 linhas (até 240 caracteres). Pode usar linguagem sensorial e mais descritiva. Para cardápio impresso premium.",
      };

      const prompt = `Você é especialista em marketing gastronômico para restaurantes brasileiros.

RESTAURANTE: ${config.nome_restaurante}
TOM DE VOZ: ${config.tom_de_voz}
PLATAFORMA: ${plat === "ifood" ? "iFood" : plat === "brendi" ? "Brendi" : "Cardápio Impresso"}

REGRAS DA PLATAFORMA:
${platRules[plat]}

REGRAS GERAIS:
- Use os diferenciais reais fornecidos (não invente)
- Se destaque for "Mais Pedido", adicione ⭐ no início do título
- Mencione alérgenos discretamente se houver
- Corrija erros de português
- Nomes simples e diretos
- Destaque ingredientes e técnicas reais

PRATOS (JSON):
${JSON.stringify(pratosPayload, null, 2)}

RESPOSTA: Retorne APENAS um array JSON válido, sem markdown, sem texto extra:
[{"id":"...","titulo":"...","descricao":"...","categoria_sugerida":"..."}]`;

      const text = await callGemini(apiKey, prompt);
      const parsed = parseGeminiJSON(text);

      const out = {};
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.id) {
            out[item.id] = {
              titulo: (item.titulo || "").slice(0, plat === "pdf" ? 80 : 50),
              descricao: (item.descricao || "").slice(0, plat === "pdf" ? 240 : 150),
              categoria_sugerida: item.categoria_sugerida || "",
            };
          }
        });
      }
      // Fill in any missed dishes with mock
      for (const d of selecionados) {
        if (!out[d.id]) out[d.id] = mockGenerate(d, plat, config.tom_de_voz);
      }
      setResults(out);
    } catch (err) {
      toast(`Erro na IA: ${err.message}`, "danger");
      // Fallback to mock
      const out = {};
      for (const d of selecionados) out[d.id] = mockGenerate(d, plat, config.tom_de_voz);
      setResults(out);
    }

    setLoading(false);
  };

  const regen = async (id) => {
    setResults((r) => ({ ...r, [id]: { ...r[id], loading: true } }));
    const d = dishes.find((x) => x.id === id);
    const apiKey = config.gemini_api_key;

    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 600));
      setResults((r) => ({ ...r, [id]: mockGenerate(d, plat, config.tom_de_voz, true) }));
      return;
    }

    try {
      const platRules = {
        ifood: "Título: até 50 caracteres. Descrição: até 150 caracteres. Linguagem de delivery direta.",
        brendi: "Título: até 50 caracteres. Descrição: até 150 caracteres.",
        pdf: "Texto elegante, até 240 caracteres.",
      };
      const prompt = `Gere uma descrição alternativa para este prato de restaurante.

RESTAURANTE: ${config.nome_restaurante} | TOM: ${config.tom_de_voz} | PLATAFORMA: ${plat}
REGRAS: ${platRules[plat]}
${d.destaque === "Mais Pedido" ? "IMPORTANTE: Adicione ⭐ no início do título.\n" : ""}

PRATO:
- Nome: ${d.nome}
- Categoria: ${d.categoria}
- Diferenciais: ${d.diferenciais || "não informado"}
- Acompanhamentos: ${d.acompanhamentos || "não informado"}
- Tags: ${d.tags.join(", ") || "nenhuma"}

RESPOSTA (JSON apenas):
{"id":"${id}","titulo":"...","descricao":"...","categoria_sugerida":"..."}`;

      const text = await callGemini(apiKey, prompt);
      const parsed = parseGeminiJSON(text);
      setResults((r) => ({
        ...r,
        [id]: {
          titulo: (parsed.titulo || d.nome).slice(0, plat === "pdf" ? 80 : 50),
          descricao: (parsed.descricao || "").slice(0, plat === "pdf" ? 240 : 150),
          categoria_sugerida: parsed.categoria_sugerida || catSugerida(d.categoria, plat),
        },
      }));
    } catch (err) {
      setResults((r) => ({ ...r, [id]: mockGenerate(d, plat, config.tom_de_voz, true) }));
      toast(`Erro ao regenerar: ${err.message}`, "warn");
    }
  };

  const copyAll = () => {
    const lines = [];
    const grouped = {};
    Object.entries(results).forEach(([id, r]) => {
      const d = dishes.find((x) => x.id === id);
      if (d) (grouped[d.categoria] ||= []).push({ d, r });
    });
    Object.entries(grouped).forEach(([cat, items]) => {
      lines.push(`\n═══ ${cat.toUpperCase()} ═══\n`);
      items.forEach(({ d, r }) => {
        lines.push(r.titulo);
        lines.push(r.descricao);
        if (d.variacoes.length)
          lines.push(d.variacoes.map((v) => `${v.nome}: R$ ${v.preco.toFixed(2).replace(".", ",")}`).join(" · "));
        lines.push("");
      });
    });
    navigator.clipboard?.writeText(lines.join("\n"));
    toast("Cardápio completo copiado para a área de transferência");
  };

  const baixarPDF = () => {
    try {
      gerarPDF(results, dishes, config);
      toast("PDF gerado com sucesso");
    } catch (err) {
      toast(`Erro ao gerar PDF: ${err.message}`, "danger");
    }
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="kicker">Módulo 3</div>
          <h1>Gerador de Cardápio</h1>
          <p className="page__sub">Gere descrições profissionais com IA para iFood, Brendi ou cardápio impresso.</p>
        </div>
        <div className="step-pills">
          <span className={`step-pill ${step === 1 ? "is-on" : ""}`}>1. Selecionar</span>
          <span className="step-pill__sep">›</span>
          <span className={`step-pill ${step === 2 ? "is-on" : ""}`}>2. Destino</span>
          <span className="step-pill__sep">›</span>
          <span className={`step-pill ${step === 3 ? "is-on" : ""}`}>3. Resultado</span>
        </div>
      </div>

      {step === 1 && (
        <>
          <div className="toolbar toolbar--gen">
            <div className="quick-actions">
              <Btn kind="ghost" size="sm" onClick={selectAllActive}>Todos ativos</Btn>
              <Btn kind="ghost" size="sm" onClick={selectDestaques}>Só destaques</Btn>
              <Btn kind="ghost" size="sm" onClick={clearAll}>Limpar</Btn>
            </div>
            <div className="counter">{sel.size} prato(s) selecionado(s)</div>
            <Btn kind="primary" size="lg" disabled={sel.size === 0} onClick={() => setStep(2)} icon={Icon.arrow}>Continuar</Btn>
          </div>
          {Object.entries(byCat).map(([cat, items]) => {
            const catIds = items.map((d) => d.id);
            const allOn = catIds.every((id) => sel.has(id));
            const someOn = catIds.some((id) => sel.has(id));
            return (
              <section key={cat} className="cat-section">
                <header className="cat-section__head">
                  <label className="check">
                    <input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = !allOn && someOn; }} onChange={() => toggleCat(cat)} />
                    <h2>{cat}</h2>
                  </label>
                  <span className="cat-section__count">{items.filter((d) => sel.has(d.id)).length}/{items.length}</span>
                </header>
                <div className="gen-grid">
                  {items.map((d) => (
                    <label key={d.id} className={`gen-card ${sel.has(d.id) ? "is-on" : ""} ${!d.ativo ? "is-inactive" : ""}`}>
                      <input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} />
                      <div className="gen-card__body">
                        <div className="gen-card__name">{d.nome}</div>
                        <div className="gen-card__meta">
                          {d.destaque && <Badge kind="ember">{d.destaque}</Badge>}
                          {!d.ativo && <Badge kind="muted">inativo</Badge>}
                          {d.bloqueado && <Badge kind="danger">bloqueado</Badge>}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {step === 2 && (
        <div className="plat-picker">
          <div className="plat-picker__head">
            <h2>Para onde vai esse cardápio?</h2>
            <p className="page__sub">A IA ajusta o tom, tamanho e estilo da descrição para cada destino.</p>
          </div>
          <div className="plat-grid">
            <PlatOption icon="📱" name="iFood" desc="Título até 50 chars · Descrição até 150 chars · Linguagem de delivery direta" active={plat === "ifood"} onClick={() => setPlat("ifood")} />
            <PlatOption icon="📲" name="Brendi" desc="Formato adaptado para Brendi · Descrição curta e direta" active={plat === "brendi"} onClick={() => setPlat("brendi")} />
            <PlatOption icon="📄" name="Cardápio Impresso (PDF)" desc="Descrição mais elegante · Layout em PDF formatado" active={plat === "pdf"} onClick={() => setPlat("pdf")} />
          </div>
          <div className="plat-picker__info">
            <div className="info-row"><span>Tom de voz:</span><strong>{config.tom_de_voz}</strong><span className="muted">(altere em Configurações)</span></div>
            <div className="info-row"><span>Pratos selecionados:</span><strong>{sel.size}</strong></div>
            <div className="info-row"><span>Custo estimado API:</span><strong>~{Math.ceil(sel.size * 0.3)} requisições</strong><span className="muted">(grátis até 1500/dia)</span></div>
            {!config.gemini_api_key && <div className="info-row" style={{ color: "var(--warn)" }}><span>⚠️ Sem chave do Gemini — textos serão gerados localmente (qualidade básica)</span></div>}
          </div>
          <div className="plat-picker__actions">
            <Btn kind="ghost" onClick={() => setStep(1)}>Voltar</Btn>
            <Btn kind="primary" size="lg" icon={Icon.ai} onClick={gerar}>Gerar{config.gemini_api_key ? " com IA" : " (sem IA)"}</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <>
          <div className="toolbar toolbar--gen">
            <Btn kind="ghost" onClick={() => setStep(1)}>← Voltar à seleção</Btn>
            <div className="counter">
              {Object.keys(results).length} descrições · destino: <strong>{plat === "ifood" ? "iFood" : plat === "brendi" ? "Brendi" : "Cardápio Impresso"}</strong>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              {plat === "pdf" && !loading && (
                <Btn kind="ghost" icon={Icon.download} onClick={baixarPDF}>Baixar PDF</Btn>
              )}
              <Btn kind="primary" icon={Icon.copy} onClick={copyAll} disabled={loading}>Copiar tudo</Btn>
            </div>
          </div>

          {loading ? (
            <div className="ia-loading">
              <div className="spinner"></div>
              <p>Gerando descrições para {sel.size} pratos…</p>
              <p className="muted">{config.tom_de_voz} · {plat}{config.gemini_api_key ? " · Gemini" : " · modo local"}</p>
            </div>
          ) : (
            <div className="result-grid">
              {Object.entries(results).map(([id, r]) => {
                const d = dishes.find((x) => x.id === id);
                if (!d) return null;
                return (
                  <ResultCard
                    key={id}
                    dish={d}
                    result={r}
                    plat={plat}
                    onRegen={() => regen(id)}
                    onCopy={() => { navigator.clipboard?.writeText(`${r.titulo}\n${r.descricao}`); toast("Item copiado"); }}
                    onEdit={(field, val) => setResults((rs) => ({ ...rs, [id]: { ...rs[id], [field]: val } }))}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatOption({ icon, name, desc, active, onClick }) {
  return (
    <button className={`plat-opt ${active ? "is-on" : ""}`} onClick={onClick}>
      <div className="plat-opt__icon">{icon}</div>
      <div className="plat-opt__name">{name}</div>
      <div className="plat-opt__desc">{desc}</div>
      {active && <span className="plat-opt__check">{Icon.check}</span>}
    </button>
  );
}

function ResultCard({ dish, result, plat, onRegen, onCopy, onEdit }) {
  const limTit = plat === "pdf" ? 80 : 50;
  const limDesc = plat === "pdf" ? 240 : 150;
  return (
    <div className="result-card">
      <div className="result-card__head">
        <div>
          <div className="result-card__ref">{dish.categoria}</div>
          <div className="result-card__orig">Original: {dish.nome}</div>
        </div>
        <div className="result-card__actions">
          <IconBtn onClick={onRegen} title="Regenerar com IA">{Icon.ai}</IconBtn>
          <IconBtn onClick={onCopy} title="Copiar item">{Icon.copy}</IconBtn>
        </div>
      </div>
      {result.loading ? (
        <div className="result-card__loading"><div className="spinner spinner--sm"></div><span>Regerando…</span></div>
      ) : (
        <>
          <div className="result-field">
            <div className="result-field__label">
              Título <span className={result.titulo.length > limTit ? "over" : ""}>{result.titulo.length}/{limTit}</span>
            </div>
            <input value={result.titulo} onChange={(e) => onEdit("titulo", e.target.value)} className="result-input" />
          </div>
          <div className="result-field">
            <div className="result-field__label">
              Descrição <span className={result.descricao.length > limDesc ? "over" : ""}>{result.descricao.length}/{limDesc}</span>
            </div>
            <textarea rows={plat === "pdf" ? 4 : 3} value={result.descricao} onChange={(e) => onEdit("descricao", e.target.value)} className="result-input" />
          </div>
          {plat !== "pdf" && (
            <div className="result-field">
              <div className="result-field__label">Categoria sugerida ({plat})</div>
              <div className="result-cat">{result.categoria_sugerida}</div>
            </div>
          )}
          {dish.variacoes.length > 0 && (
            <div className="result-prices">
              {dish.variacoes.map((v, i) => (
                <span key={i} className="result-price">{v.nome}: <strong>R$ {v.preco.toFixed(2).replace(".", ",")}</strong></span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ===== LOCAL FALLBACK (sem IA) =====
function mockGenerate(d, plat, tom, regen = false) {
  const variants = mockTexts(d, tom);
  const i = regen ? Math.floor(Math.random() * variants.length) : 0;
  const v = variants[i];
  let descr = v.descricao;
  if (plat === "ifood" || plat === "brendi") descr = descr.slice(0, 148);
  return { titulo: v.titulo, descricao: descr, categoria_sugerida: catSugerida(d.categoria, plat) };
}

function catSugerida(cat) {
  const map = { "Churrasqueira": "Churrasco", "À la Carte": "Pratos Principais", "Drinks": "Bebidas Alcoólicas", "Caipirinhas": "Bebidas Alcoólicas", "Cervejas": "Bebidas Alcoólicas", "Sucos": "Sucos Naturais", "Refrigerantes": "Bebidas", "Vinhos": "Vinhos", "Whiskies": "Destilados" };
  return map[cat] || cat;
}

function mockTexts(d, tom) {
  const dif = d.diferenciais || "feito na hora";
  const ac = d.acompanhamentos ? ` Acompanha ${d.acompanhamentos}.` : "";
  const dest = d.destaque === "Mais Pedido" ? "⭐ " : "";
  const variantes = [];
  if (tom === "sofisticado" || tom === "gourmet") {
    variantes.push({ titulo: `${dest}${d.nome}`.slice(0, 50), descricao: `${capit(dif)}, com técnica apurada.${ac}` });
    variantes.push({ titulo: `${dest}${d.nome}`.slice(0, 50), descricao: `Preparo cuidadoso: ${dif}.${ac}` });
  } else {
    variantes.push({ titulo: `${dest}${d.nome}`.slice(0, 50), descricao: `${capit(dif)}.${ac} Do jeito que você gosta.` });
    variantes.push({ titulo: `${dest}${d.nome}`.slice(0, 50), descricao: `Feito com carinho: ${dif}.${ac}` });
  }
  return variantes;
}

function capit(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ===== PDF GENERATION (jsPDF) =====
function gerarPDF(results, dishes, config) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const mg = 22;

  // ── Capa ──
  doc.setFillColor(30, 28, 25);
  doc.rect(0, 0, pw, ph, "F");

  // Faixa decorativa dourada
  doc.setFillColor(177, 135, 70);
  doc.rect(0, ph / 2 - 40, pw, 2, "F");
  doc.rect(0, ph / 2 + 38, pw, 2, "F");

  // Nome do restaurante
  doc.setFont("times", "bold");
  doc.setFontSize(38);
  doc.setTextColor(212, 174, 94);
  doc.text(config.nome_restaurante, pw / 2, ph / 2 - 20, { align: "center" });

  // Subtítulo
  doc.setFont("times", "italic");
  doc.setFontSize(16);
  doc.setTextColor(190, 170, 130);
  doc.text("Cardápio", pw / 2, ph / 2 + 4, { align: "center" });

  // Data
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140, 130, 110);
  doc.text(new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }), pw / 2, ph / 2 + 18, { align: "center" });

  // ── Páginas de conteúdo ──
  const grouped = {};
  Object.entries(results).forEach(([id, r]) => {
    const d = dishes.find((x) => x.id === id);
    if (d) (grouped[d.categoria] ||= []).push({ d, r });
  });

  doc.addPage();
  let y = mg;

  const checkPage = (needed) => {
    if (y + needed > ph - mg) {
      doc.addPage();
      y = mg;
    }
  };

  Object.entries(grouped).forEach(([cat, items]) => {
    checkPage(20);

    // Cabeçalho de categoria
    doc.setFillColor(242, 236, 222);
    doc.rect(mg, y - 3, pw - 2 * mg, 13, "F");
    doc.setDrawColor(200, 180, 140);
    doc.setLineWidth(0.4);
    doc.rect(mg, y - 3, pw - 2 * mg, 13);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(100, 75, 40);
    doc.text(cat.toUpperCase(), mg + 5, y + 6);
    y += 18;

    items.forEach(({ d, r }) => {
      const titulo = r.titulo || d.nome;
      const descricao = r.descricao || "";
      const descLines = doc.splitTextToSize(descricao, pw - 2 * mg - 30);
      const precos = d.variacoes.length
        ? d.variacoes.map((v) => `${v.nome}: R$ ${v.preco.toFixed(2).replace(".", ",")}`).join("  ·  ")
        : "";

      const blockH = 7 + descLines.length * 5 + (precos ? 8 : 0) + 8;
      checkPage(blockH);

      // Nome do prato
      doc.setFont("times", "bold");
      doc.setFontSize(12);
      doc.setTextColor(45, 35, 20);
      doc.text(titulo, mg, y);

      // Destaque badge
      if (d.destaque) {
        const badgeX = mg + doc.getTextWidth(titulo) + 3;
        doc.setFontSize(8);
        doc.setFont("times", "italic");
        doc.setTextColor(160, 110, 40);
        doc.text(`[${d.destaque}]`, badgeX, y);
      }
      y += 6;

      // Descrição
      if (descLines.length) {
        doc.setFont("times", "normal");
        doc.setFontSize(10);
        doc.setTextColor(85, 75, 60);
        doc.text(descLines, mg, y);
        y += descLines.length * 5;
      }

      // Preços
      if (precos) {
        doc.setFont("times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(130, 115, 90);
        doc.text(precos, mg, y + 1);
        y += 7;
      }

      // Acompanhamentos em itálico pequeno
      if (d.acompanhamentos) {
        doc.setFontSize(8.5);
        doc.setFont("times", "italic");
        doc.setTextColor(150, 135, 110);
        doc.text(`Acompanha: ${d.acompanhamentos}`, mg, y);
        y += 6;
      }

      // Separador pontilhado
      doc.setDrawColor(210, 195, 170);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 2], 0);
      doc.line(mg, y, pw - mg, y);
      doc.setLineDashPattern([], 0);
      y += 6;
    });

    y += 6;
  });

  // ── Rodapé em todas as páginas de conteúdo ──
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.setTextColor(160, 150, 130);
    doc.text(
      `${config.nome_restaurante}  ·  ${new Date().toLocaleDateString("pt-BR")}  ·  pág. ${i - 1} / ${totalPages - 1}`,
      pw / 2,
      ph - 10,
      { align: "center" }
    );
  }

  doc.save(`cardapio-${config.nome_restaurante.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

window.GeradorModule = GeradorModule;
