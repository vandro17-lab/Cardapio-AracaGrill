// Módulo 4 - Bloqueio Inteligente de Insumos

function InsumosModule() {
  const [tab, setTab] = useState("status");
  const { shortages } = useStore();
  const ativos = shortages.filter((s) => s.status === "ativo");

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="kicker">Módulo 4</div>
          <h1>Insumos em Falta</h1>
          <p className="page__sub">Bloqueio inteligente — saiba na hora o que parar de vender quando falta algum insumo.</p>
        </div>
        {ativos.length > 0 && (
          <div className="hero-alert">
            <span className="hero-alert__dot"></span>
            <span><strong>{ativos.length}</strong> {ativos.length === 1 ? "insumo" : "insumos"} em falta agora</span>
          </div>
        )}
      </div>

      <div className="tabbar">
        <button className={tab === "reportar" ? "is-on" : ""} onClick={() => setTab("reportar")}>+ Reportar Falta</button>
        <button className={tab === "status" ? "is-on" : ""} onClick={() => setTab("status")}>
          Status Atual {ativos.length > 0 && <span className="tab-badge">{ativos.length}</span>}
        </button>
        <button className={tab === "aviso" ? "is-on" : ""} onClick={() => setTab("aviso")}>Aviso WhatsApp</button>
        <button className={tab === "rel" ? "is-on" : ""} onClick={() => setTab("rel")}>Relatórios</button>
      </div>

      {tab === "reportar" && <ReportarFalta onDone={() => setTab("status")} />}
      {tab === "status" && <StatusAtual onReport={() => setTab("reportar")} />}
      {tab === "aviso" && <AvisoWhatsApp />}
      {tab === "rel" && <Relatorios />}
    </div>
  );
}

// ===== SUBABA 1: Reportar Falta =====
function ReportarFalta({ onDone }) {
  const { dishes, config, setShortages, toast } = useStore();
  const [insumos, setInsumos] = useState([]);
  const [inputV, setInputV] = useState("");
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(false);

  const sugest = useMemo(() => {
    const s = new Set();
    dishes.forEach((d) => d.ingredientes.forEach((i) => s.add(i.nome.toLowerCase())));
    return [...s].sort();
  }, [dishes]);

  const filteredSug = useMemo(() => {
    if (!inputV) return [];
    return sugest.filter((s) => s.includes(inputV.toLowerCase()) && !insumos.includes(s)).slice(0, 8);
  }, [inputV, sugest, insumos]);

  const addInsumo = (val) => {
    const v = val.trim().toLowerCase();
    if (!v || insumos.includes(v)) return;
    setInsumos([...insumos, v]);
    setInputV("");
  };

  const analisar = async () => {
    if (!insumos.length) { toast("Adicione pelo menos um insumo", "danger"); return; }
    setLoading(true);
    setAnalise(null);

    // Encontrar todos os pratos com esses insumos
    const pratosAfetadosBruto = [];
    for (const d of dishes) {
      for (const ing of d.ingredientes) {
        const match = insumos.find(
          (i) => ing.nome.toLowerCase().includes(i) || i.includes(ing.nome.toLowerCase())
        );
        if (!match) continue;
        const existing = pratosAfetadosBruto.find((p) => p.dish_id === d.id);
        // Classificação base usando campo essencial
        const isCritico = ing.essencial || d.categoria === "Drinks" || d.categoria === "Caipirinhas" || d.categoria === "Whiskies";
        const classificacao = isCritico ? "critico" : "adaptavel";
        const acao = classificacao === "critico" ? "bloqueado" : "adaptado";
        const adaptacao = classificacao === "adaptavel" ? `servido sem ${ing.nome}` : "";
        if (!existing) {
          pratosAfetadosBruto.push({ dish_id: d.id, dish: d, insumo: match, ingrediente: ing.nome, classificacao, acao, adaptacao });
        } else if (isCritico) {
          existing.classificacao = "critico";
          existing.acao = "bloqueado";
          existing.adaptacao = "";
        }
        break;
      }
    }

    const apiKey = config.gemini_api_key;

    if (!apiKey || pratosAfetadosBruto.length === 0) {
      await new Promise((r) => setTimeout(r, 800));
      setAnalise({ insumos: [...insumos], pratos: pratosAfetadosBruto });
      setLoading(false);
      return;
    }

    // Usar Gemini para classificação inteligente
    try {
      const payload = pratosAfetadosBruto.map((p) => ({
        dish_id: p.dish_id,
        nome: p.dish.nome,
        categoria: p.dish.categoria,
        ingrediente_faltando: p.ingrediente,
        ingrediente_essencial: p.dish.ingredientes.find((i) => i.nome === p.ingrediente)?.essencial ?? false,
        outros_ingredientes: p.dish.ingredientes.filter((i) => i.nome !== p.ingrediente).map((i) => i.nome).slice(0, 5),
        diferenciais: p.dish.diferenciais || "",
      }));

      const prompt = `Você é chef consultor. Classifique o impacto da falta dos insumos abaixo em cada prato.

INSUMOS EM FALTA: ${insumos.join(", ")}

CLASSIFICAÇÕES:
- "critico": sem este insumo o prato não pode ser servido (ex: ingredient base, proteína principal)
- "adaptavel": pode ser servido com adaptação/substituição (ex: guarnição substituível, decoração)
- "irrelevante": a falta mal afeta o prato (ex: garnish opcional, decoração)

Para "adaptavel", sugira uma adaptação curta em português (ex: "servido sem alcaparras").

PRATOS:
${JSON.stringify(payload, null, 2)}

RESPOSTA (JSON array somente, sem markdown):
[{"dish_id":"...","classificacao":"critico|adaptavel|irrelevante","adaptacao":"..."}]`;

      const text = await callGemini(apiKey, prompt);
      const parsed = parseGeminiJSON(text);

      if (Array.isArray(parsed)) {
        const iaMap = {};
        parsed.forEach((item) => { if (item.dish_id) iaMap[item.dish_id] = item; });
        const pratosAtualizados = pratosAfetadosBruto.map((p) => {
          const ia = iaMap[p.dish_id];
          if (!ia) return p;
          const acaoMap = { critico: "bloqueado", adaptavel: "adaptado", irrelevante: "normal" };
          return {
            ...p,
            classificacao: ia.classificacao || p.classificacao,
            acao: acaoMap[ia.classificacao] || p.acao,
            adaptacao: ia.classificacao === "adaptavel" ? (ia.adaptacao || p.adaptacao) : "",
          };
        });
        setAnalise({ insumos: [...insumos], pratos: pratosAtualizados });
      } else {
        setAnalise({ insumos: [...insumos], pratos: pratosAfetadosBruto });
      }
    } catch (err) {
      toast(`IA indisponível: usando classificação automática. (${err.message})`, "warn");
      setAnalise({ insumos: [...insumos], pratos: pratosAfetadosBruto });
    }

    setLoading(false);
  };

  const reclassify = (dishId, newClass) => {
    const acaoMap = { critico: "bloqueado", adaptavel: "adaptado", irrelevante: "normal" };
    setAnalise((a) => ({
      ...a,
      pratos: a.pratos.map((p) =>
        p.dish_id === dishId
          ? { ...p, classificacao: newClass, acao: acaoMap[newClass], adaptacao: newClass === "adaptavel" ? (p.adaptacao || `servido sem ${p.ingrediente}`) : "" }
          : p
      ),
    }));
  };

  const setAdaptacao = (dishId, val) => {
    setAnalise((a) => ({ ...a, pratos: a.pratos.map((p) => p.dish_id === dishId ? { ...p, adaptacao: val } : p) }));
  };

  const confirmar = () => {
    const novos = insumos.map((ing) => ({
      id: "sh-" + Math.random().toString(36).slice(2),
      ingrediente: ing,
      status: "ativo",
      reportado_em: Date.now(),
      resolvido_em: null,
      pratos_afetados: analise.pratos
        .filter((p) => p.insumo === ing)
        .map((p) => ({ dish_id: p.dish_id, classificacao: p.classificacao, acao: p.acao, adaptacao: p.adaptacao })),
    }));
    setShortages((curr) => [...curr, ...novos]);
    toast(`${insumos.length} insumo(s) reportados como em falta`);
    onDone();
  };

  if (analise) {
    const criticos = analise.pratos.filter((p) => p.classificacao === "critico");
    const adapt = analise.pratos.filter((p) => p.classificacao === "adaptavel");
    const irrel = analise.pratos.filter((p) => p.classificacao === "irrelevante");
    return (
      <div className="report-review">
        <div className="report-review__head">
          <div>
            <h2>Revise a classificação</h2>
            <p className="page__sub">
              {analise.pratos.length} pratos afetados pelos insumos: <strong>{analise.insumos.join(", ")}</strong>. Mova entre colunas se necessário.
            </p>
          </div>
          <Btn kind="ghost" onClick={() => setAnalise(null)}>← Refazer análise</Btn>
        </div>
        <div className="kanban">
          <KanbanCol kind="critico" title="🔴 Crítico — bloquear" hint="Insumo essencial. Não dá pra servir." pratos={criticos} onChange={reclassify} />
          <KanbanCol kind="adaptavel" title="🟡 Adaptável" hint="Pode vender com substituição." pratos={adapt} onChange={reclassify} onAdapt={setAdaptacao} />
          <KanbanCol kind="irrelevante" title="🟢 Irrelevante" hint="Guarnição, não muda o prato." pratos={irrel} onChange={reclassify} />
        </div>
        <div className="report-review__footer">
          <Btn kind="ghost" onClick={() => setAnalise(null)}>Cancelar</Btn>
          <Btn kind="primary" size="lg" onClick={confirmar}>Confirmar e aplicar bloqueio</Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="report-form">
      <h2>Quais insumos estão em falta hoje?</h2>
      <p className="page__sub">Digite o nome — pode adicionar vários. {config.gemini_api_key ? "A IA vai classificar o impacto em cada prato." : "O sistema vai classificar automaticamente pelo campo 'essencial' de cada ficha."}</p>

      <div className="ingr-input">
        <div className="ingr-pills">
          {insumos.map((i) => (
            <span key={i} className="ingr-pill">
              {i}
              <button onClick={() => setInsumos(insumos.filter((x) => x !== i))}>×</button>
            </span>
          ))}
          <input
            placeholder={insumos.length ? "Adicionar outro…" : "Ex: gin, alcaparras, creme de leite…"}
            value={inputV}
            onChange={(e) => setInputV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputV) addInsumo(inputV);
              if (e.key === "Backspace" && !inputV && insumos.length) setInsumos(insumos.slice(0, -1));
            }}
          />
        </div>
        {filteredSug.length > 0 && (
          <div className="ingr-sug">
            {filteredSug.map((s) => <button key={s} onClick={() => addInsumo(s)}>{s}</button>)}
          </div>
        )}
      </div>

      {loading ? (
        <div className="ia-loading">
          <div className="spinner"></div>
          <p>Analisando impacto em {dishes.length} pratos{config.gemini_api_key ? " com o Gemini" : ""}…</p>
        </div>
      ) : (
        <div className="report-actions">
          <Btn kind="primary" size="lg" icon={Icon.ai} onClick={analisar} disabled={!insumos.length}>
            Analisar impacto
          </Btn>
        </div>
      )}
    </div>
  );
}

function KanbanCol({ kind, title, hint, pratos, onChange, onAdapt }) {
  return (
    <div className={`kanban-col kanban-col--${kind}`}>
      <header>
        <h3>{title}</h3>
        <span className="kanban-col__count">{pratos.length}</span>
      </header>
      <p className="kanban-col__hint">{hint}</p>
      <div className="kanban-list">
        {pratos.length === 0 && <div className="kanban-empty">Nenhum prato</div>}
        {pratos.map((p) => (
          <div key={p.dish_id} className="kanban-card">
            <div className="kanban-card__name">{p.dish.nome}</div>
            <div className="kanban-card__meta">{p.dish.categoria} · falta: {p.ingrediente}</div>
            {kind === "adaptavel" && (
              <input className="kanban-card__adapt" value={p.adaptacao} placeholder="texto de adaptação" onChange={(e) => onAdapt(p.dish_id, e.target.value)} />
            )}
            <div className="kanban-card__moves">
              {kind !== "critico" && <button onClick={() => onChange(p.dish_id, "critico")}>← crítico</button>}
              {kind !== "adaptavel" && <button onClick={() => onChange(p.dish_id, "adaptavel")}>adaptável</button>}
              {kind !== "irrelevante" && <button onClick={() => onChange(p.dish_id, "irrelevante")}>irrelevante →</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== SUBABA 2: Status Atual =====
function StatusAtual({ onReport }) {
  const { dishes, shortages, setShortages, setHistory, toast } = useStore();
  const ativos = shortages.filter((s) => s.status === "ativo");

  // Popula pratos_afetados de shortages vindos do seed sem pratos_afetados
  useEffect(() => {
    setShortages((curr) =>
      curr.map((s) => {
        if (s.pratos_afetados.length || s.status !== "ativo") return s;
        const afetados = [];
        for (const d of dishes) {
          for (const ing of d.ingredientes) {
            if (ing.nome.toLowerCase().includes(s.ingrediente) || s.ingrediente.includes(ing.nome.toLowerCase())) {
              afetados.push({
                dish_id: d.id,
                classificacao: ing.essencial ? "critico" : "adaptavel",
                acao: ing.essencial ? "bloqueado" : "adaptado",
                adaptacao: ing.essencial ? "" : `servido sem ${ing.nome}`,
              });
              break;
            }
          }
        }
        return { ...s, pratos_afetados: afetados };
      })
    );
  }, []);

  const marcarReposto = (shortageId) => {
    const sh = shortages.find((s) => s.id === shortageId);
    if (!sh) return;
    const now = Date.now();
    const duracao_horas = (now - sh.reportado_em) / 3600000;
    const blocked = sh.pratos_afetados.filter((p) => p.acao === "bloqueado").map((p) => p.dish_id);
    const outrosAtivos = shortages.filter((s) => s.id !== shortageId && s.status === "ativo");
    const desbloqueados = [], permanecem = [];
    for (const dId of blocked) {
      const d = dishes.find((x) => x.id === dId);
      const outrosMotivos = [];
      for (const o of outrosAtivos) {
        const pa = o.pratos_afetados.find((p) => p.dish_id === dId && p.acao === "bloqueado");
        if (pa) outrosMotivos.push(o.ingrediente);
      }
      if (outrosMotivos.length) permanecem.push({ d, outros: outrosMotivos });
      else desbloqueados.push(d);
    }

    setShortages((curr) => curr.map((s) => s.id === shortageId ? { ...s, status: "resolvido", resolvido_em: now } : s));
    setHistory((h) => [
      ...h,
      {
        id: "h-" + Math.random().toString(36).slice(2),
        ingrediente: sh.ingrediente,
        data_inicio: sh.reportado_em,
        data_fim: now,
        duracao_horas: Math.round(duracao_horas * 10) / 10,
        pratos_bloqueados_count: blocked.length,
        pratos_adaptados_count: sh.pratos_afetados.filter((p) => p.acao === "adaptado").length,
      },
    ]);

    const partes = [];
    if (desbloqueados.length) partes.push(`✅ Desbloqueados: ${desbloqueados.map((d) => d.nome).join(", ")}`);
    if (permanecem.length) partes.push(`⚠️ Continuam bloqueados: ${permanecem.map((p) => `${p.d.nome} (falta: ${p.outros.join(", ")})`).join("; ")}`);
    toast(partes.length ? partes.join(" · ") : `${sh.ingrediente} reposto`);
  };

  if (ativos.length === 0) {
    return (
      <div className="empty empty--big">
        <div className="empty__icon">{Icon.check}</div>
        <h2>Tudo em ordem na cozinha</h2>
        <p>Nenhum insumo em falta no momento.</p>
        <Btn kind="primary" icon={Icon.plus} onClick={onReport}>Reportar uma falta</Btn>
      </div>
    );
  }

  return (
    <div className="status-list">
      {ativos.map((s) => {
        const bloqs = s.pratos_afetados.filter((p) => p.acao === "bloqueado");
        const adapts = s.pratos_afetados.filter((p) => p.acao === "adaptado");
        const hrs = Math.round(((Date.now() - s.reportado_em) / 3600000) * 10) / 10;
        return (
          <div key={s.id} className="status-card">
            <div className="status-card__head">
              <div>
                <h3>Falta: {s.ingrediente}</h3>
                <div className="status-card__sub">há {hrs}h · {s.pratos_afetados.length} pratos afetados</div>
              </div>
              <Btn kind="primary" icon={Icon.check} onClick={() => marcarReposto(s.id)}>Marcar como reposto</Btn>
            </div>
            {bloqs.length > 0 && (
              <div className="status-section">
                <div className="status-section__head"><span className="dot dot--red"></span>Bloqueados ({bloqs.length})</div>
                <ul className="status-pratos">
                  {bloqs.map((p) => {
                    const d = dishes.find((x) => x.id === p.dish_id);
                    return <li key={p.dish_id}><strong>{d?.nome}</strong><span>{d?.categoria}</span></li>;
                  })}
                </ul>
              </div>
            )}
            {adapts.length > 0 && (
              <div className="status-section">
                <div className="status-section__head"><span className="dot dot--yellow"></span>Adaptados ({adapts.length})</div>
                <ul className="status-pratos">
                  {adapts.map((p) => {
                    const d = dishes.find((x) => x.id === p.dish_id);
                    return <li key={p.dish_id}><strong>{d?.nome}</strong><em>{p.adaptacao}</em></li>;
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===== SUBABA 3: Aviso WhatsApp =====
function AvisoWhatsApp() {
  const { dishes, shortages, config, toast } = useStore();
  const ativos = shortages.filter((s) => s.status === "ativo");

  const texto = useMemo(() => {
    const now = new Date();
    const data = now.toLocaleDateString("pt-BR") + " " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const bloqs = new Map(), adapts = new Map();
    ativos.forEach((s) => {
      s.pratos_afetados.forEach((p) => {
        const d = dishes.find((x) => x.id === p.dish_id);
        if (!d) return;
        if (p.acao === "bloqueado") bloqs.set(d.id, d.nome);
        else if (p.acao === "adaptado") adapts.set(d.id, `${d.nome} → ${p.adaptacao || "adaptado"}`);
      });
    });
    let t = `🚨 *${config.nome_restaurante.toUpperCase()} — AVISO DE COZINHA E BAR*\n📅 ${data}\n`;
    if (bloqs.size) t += `\n❌ *NÃO VENDER (faltando insumo):*\n${[...bloqs.values()].map((n) => `• ${n}`).join("\n")}\n`;
    if (adapts.size) t += `\n⚠️ *VENDER COM ADAPTAÇÃO:*\n${[...adapts.values()].map((n) => `• ${n}`).join("\n")}\n`;
    t += `\nℹ️ *Insumos em falta hoje:* ${ativos.map((s) => s.ingrediente).join(", ")}\n\n_Aviso gerado automaticamente pelo sistema._`;
    return t;
  }, [ativos, dishes, config]);

  const wppLink = `https://wa.me/${config.telefone_whatsapp}?text=${encodeURIComponent(texto)}`;

  if (ativos.length === 0) {
    return (
      <div className="empty empty--big">
        <div className="empty__icon">{Icon.whatsapp}</div>
        <h2>Nada para avisar</h2>
        <p>Sem insumos em falta, não há aviso para gerar.</p>
      </div>
    );
  }

  return (
    <div className="aviso">
      <div className="aviso__preview">
        <div className="aviso__phone-head">
          <span className="aviso__phone-time">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span className="aviso__phone-title">Equipe {config.nome_restaurante}</span>
          <span className="aviso__phone-time" style={{ opacity: 0 }}>·</span>
        </div>
        <div className="aviso__bubble">
          <pre>{texto}</pre>
        </div>
      </div>
      <div className="aviso__actions">
        <Btn kind="ghost" size="lg" icon={Icon.copy} onClick={() => { navigator.clipboard?.writeText(texto); toast("Aviso copiado"); }}>
          Copiar texto
        </Btn>
        <a href={wppLink} target="_blank" rel="noopener" className="btn btn--primary btn--lg">
          <span className="btn__icon">{Icon.whatsapp}</span>
          <span>Abrir WhatsApp</span>
        </a>
      </div>
    </div>
  );
}

// ===== SUBABA 4: Relatórios =====
function Relatorios() {
  const { history, config, toast } = useStore();
  const [periodo, setPeriodo] = useState(60);
  const [iaOpen, setIaOpen] = useState(false);
  const [iaResult, setIaResult] = useState("");
  const [iaLoading, setIaLoading] = useState(false);

  const cutoff = Date.now() - periodo * 86400000;
  const filtered = history.filter((h) => h.data_inicio >= cutoff);

  const ranking = useMemo(() => {
    const m = new Map();
    filtered.forEach((h) => {
      const e = m.get(h.ingrediente) || { ingrediente: h.ingrediente, eventos: 0, totalHoras: 0, totalBloq: 0, totalAdapt: 0 };
      e.eventos++; e.totalHoras += h.duracao_horas; e.totalBloq += h.pratos_bloqueados_count; e.totalAdapt += h.pratos_adaptados_count;
      m.set(h.ingrediente, e);
    });
    return [...m.values()].sort((a, b) => b.eventos - a.eventos);
  }, [filtered]);

  const semanas = useMemo(() => {
    const w = new Array(Math.min(12, Math.ceil(periodo / 7))).fill(0);
    filtered.forEach((h) => {
      const weeksAgo = Math.floor((Date.now() - h.data_inicio) / (7 * 86400000));
      if (weeksAgo < w.length) w[w.length - 1 - weeksAgo]++;
    });
    return w;
  }, [filtered, periodo]);

  const maxSemana = Math.max(1, ...semanas);

  const rodarIA = async () => {
    setIaOpen(true);
    setIaLoading(true);
    setIaResult("");

    const apiKey = config.gemini_api_key;
    const top = ranking[0];

    if (!apiKey) {
      await new Promise((r) => setTimeout(r, 700));
      let result = `**Análise dos últimos ${periodo} dias**\n\n`;
      if (top) {
        result += `O insumo que mais gerou problemas foi **${top.ingrediente}**: ${top.eventos} eventos, duração média de ${Math.round(top.totalHoras / top.eventos)}h e ${Math.round(top.totalBloq / top.eventos)} prato(s) bloqueado(s) por evento.\n\n`;
        result += `**Recomendação:** aumente o estoque de ${top.ingrediente} em 30-40% e antecipe o pedido em 2 dias.\n\n`;
      }
      if (ranking.length > 1) result += `**Outros insumos críticos:**\n${ranking.slice(1, 4).map((r) => `• ${r.ingrediente} — ${r.eventos} eventos`).join("\n")}\n\n`;
      const totalBloq = filtered.reduce((a, h) => a + h.pratos_bloqueados_count, 0);
      result += `**Custo de oportunidade estimado:** com ticket médio de R$ 75, o impacto foi de aprox. **R$ ${(totalBloq * 75 * 2).toLocaleString("pt-BR")}** em vendas potenciais perdidas.\n\n_Configure o Gemini nas Configurações para análise mais aprofundada._`;
      setIaResult(result);
      setIaLoading(false);
      return;
    }

    try {
      const prompt = `Você é consultor de operações de restaurante. Analise o histórico de faltas de insumos abaixo.

RESTAURANTE: ${config.nome_restaurante}
PERÍODO: últimos ${periodo} dias

RANKING DE INSUMOS QUE MAIS FALTARAM:
${JSON.stringify(ranking.slice(0, 8), null, 2)}

MÉTRICAS DO PERÍODO:
- Total de eventos: ${filtered.length}
- Duração média: ${Math.round(filtered.reduce((a, h) => a + h.duracao_horas, 0) / Math.max(1, filtered.length))}h
- Total de pratos bloqueados: ${filtered.reduce((a, h) => a + h.pratos_bloqueados_count, 0)}
- Total de pratos adaptados: ${filtered.reduce((a, h) => a + h.pratos_adaptados_count, 0)}

Forneça:
1. Análise dos padrões identificados
2. Top 3 recomendações de compra/estoque
3. Estimativa de custo de oportunidade (use ticket médio de R$ 75)
4. Próximos passos práticos

Seja específico com os dados reais. Escreva em português brasileiro, tom direto e profissional.`;

      const text = await callGemini(apiKey, prompt);
      setIaResult(text);
    } catch (err) {
      setIaResult(`❌ **Erro:** ${err.message}\n\nVerifique sua chave da API nas Configurações.`);
    }

    setIaLoading(false);
  };

  return (
    <div className="rel">
      <div className="rel__toolbar">
        <div className="periodo-pills">
          {[30, 60, 90].map((p) => (
            <button key={p} className={periodo === p ? "is-on" : ""} onClick={() => setPeriodo(p)}>{p} dias</button>
          ))}
        </div>
        <Btn kind="primary" icon={Icon.ai} onClick={rodarIA}>Análise com IA</Btn>
      </div>

      <div className="rel__grid">
        <div className="rel-card">
          <h3>Insumos que mais faltam</h3>
          <p className="rel-card__sub">Ranking por número de eventos</p>
          <table className="rank">
            <thead>
              <tr><th>Insumo</th><th>Eventos</th><th>Duração média</th><th>Pratos bloq./evento</th></tr>
            </thead>
            <tbody>
              {ranking.slice(0, 8).map((r, i) => (
                <tr key={r.ingrediente}>
                  <td><span className="rank__pos">#{i + 1}</span> {r.ingrediente}</td>
                  <td><strong>{r.eventos}</strong></td>
                  <td>{Math.round(r.totalHoras / r.eventos)}h</td>
                  <td>{(r.totalBloq / r.eventos).toFixed(1)}</td>
                </tr>
              ))}
              {ranking.length === 0 && <tr><td colSpan="4" className="empty-row">Sem histórico no período</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="rel-card">
          <h3>Bloqueios por semana</h3>
          <p className="rel-card__sub">Detectar padrões temporais</p>
          <div className="chart">
            {semanas.map((v, i) => (
              <div key={i} className="chart__bar" style={{ height: `${(v / maxSemana) * 100}%` }} title={`${v} eventos`}>
                <span className="chart__val">{v || ""}</span>
              </div>
            ))}
          </div>
          <div className="chart__axis">
            {semanas.map((_, i) => (
              <span key={i}>{i === semanas.length - 1 ? "hoje" : `-${semanas.length - 1 - i}s`}</span>
            ))}
          </div>
        </div>

        <div className="rel-card rel-card--span">
          <h3>Métricas do período</h3>
          <div className="kpi-row">
            <Kpi value={filtered.length} label="Eventos de falta" />
            <Kpi value={Math.round(filtered.reduce((a, h) => a + h.duracao_horas, 0) / Math.max(1, filtered.length))} suffix="h" label="Duração média" />
            <Kpi value={filtered.reduce((a, h) => a + h.pratos_bloqueados_count, 0)} label="Pratos bloqueados (total)" />
            <Kpi value={filtered.reduce((a, h) => a + h.pratos_adaptados_count, 0)} label="Pratos adaptados (total)" />
          </div>
        </div>
      </div>

      <Modal
        open={iaOpen}
        onClose={() => setIaOpen(false)}
        title="Análise inteligente do histórico"
        size="lg"
        footer={
          <>
            <Btn kind="ghost" onClick={() => { navigator.clipboard?.writeText(iaResult); toast("Análise copiada"); }} disabled={!iaResult}>Copiar</Btn>
            <Btn kind="primary" onClick={() => setIaOpen(false)}>Fechar</Btn>
          </>
        }
      >
        {iaLoading ? (
          <div className="ia-loading"><div className="spinner"></div><p>Analisando histórico{config.gemini_api_key ? " com o Gemini" : ""}…</p></div>
        ) : (
          <div className="ia-result">
            {iaResult.split("\n\n").map((p, i) => (
              <p key={i} dangerouslySetInnerHTML={{ __html: p.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Kpi({ value, label, suffix = "" }) {
  return (
    <div className="kpi">
      <div className="kpi__val">{value}<span className="kpi__suffix">{suffix}</span></div>
      <div className="kpi__lbl">{label}</div>
    </div>
  );
}

window.InsumosModule = InsumosModule;
