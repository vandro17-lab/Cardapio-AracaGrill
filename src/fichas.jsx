// Módulo 1 - Fichas Técnicas

function FichasModule() {
  const { dishes, removeDish, duplicateDish, toast } = useStore();
  const [filtros, setFiltros] = useState({ categoria: "todas", status: "todos", destaque: "todos", q: "" });
  const [editing, setEditing] = useState(null); // ficha sendo editada (ou "new")
  const [confirm, confirmNode] = useConfirm();

  const filtered = useMemo(() => {
    return dishes.filter(d => {
      if (filtros.categoria !== "todas" && d.categoria !== filtros.categoria) return false;
      if (filtros.status === "ativo" && !d.ativo) return false;
      if (filtros.status === "inativo" && d.ativo) return false;
      if (filtros.status === "bloqueado" && !d.bloqueado) return false;
      if (filtros.destaque !== "todos" && d.destaque !== filtros.destaque) return false;
      if (filtros.q && !d.nome.toLowerCase().includes(filtros.q.toLowerCase())) return false;
      return true;
    });
  }, [dishes, filtros]);

  const groupedByCat = useMemo(() => {
    const g = {};
    filtered.forEach(d => { (g[d.categoria] ||= []).push(d); });
    return g;
  }, [filtered]);

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="kicker">Módulo 1</div>
          <h1>Fichas Técnicas</h1>
          <p className="page__sub">{dishes.length} pratos cadastrados · {dishes.filter(d => d.ativo).length} ativos · {dishes.filter(d => d.bloqueado).length} bloqueados</p>
        </div>
        <Btn kind="primary" size="lg" icon={Icon.plus} onClick={() => setEditing("new")}>Nova ficha</Btn>
      </div>

      <div className="toolbar">
        <div className="search">
          <span className="search__icon">{Icon.search}</span>
          <input placeholder="Buscar por nome…" value={filtros.q} onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))} />
        </div>
        <select value={filtros.categoria} onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))}>
          <option value="todas">Todas categorias</option>
          {window.CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}>
          <option value="todos">Todos status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
          <option value="bloqueado">Bloqueados</option>
        </select>
        <select value={filtros.destaque} onChange={e => setFiltros(f => ({ ...f, destaque: e.target.value }))}>
          <option value="todos">Qualquer destaque</option>
          <option value="">Sem destaque</option>
          {window.DESTAQUES.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {Object.keys(groupedByCat).length === 0 && (
        <div className="empty">
          <p>Nenhuma ficha encontrada com esses filtros.</p>
        </div>
      )}

      {Object.entries(groupedByCat).map(([cat, items]) => (
        <section key={cat} className="cat-section">
          <header className="cat-section__head">
            <h2>{cat}</h2>
            <span className="cat-section__count">{items.length} {items.length === 1 ? "prato" : "pratos"}</span>
          </header>
          <div className="dish-grid">
            {items.map(d => (
              <DishCard key={d.id} dish={d}
                onEdit={() => setEditing(d)}
                onDup={() => { duplicateDish(d.id); toast("Ficha duplicada"); }}
                onDel={async () => {
                  if (await confirm({ title: "Excluir ficha?", message: `Deseja excluir "${d.nome}"? Esta ação não pode ser desfeita.`, danger: true, confirmLabel: "Excluir" })) {
                    removeDish(d.id); toast("Ficha excluída", "warn");
                  }
                }}
              />
            ))}
          </div>
        </section>
      ))}

      {editing && <FichaEditor dish={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {confirmNode}
    </div>
  );
}

function DishCard({ dish, onEdit, onDup, onDel }) {
  const priceRange = useMemo(() => {
    if (!dish.variacoes.length) return "—";
    const precos = dish.variacoes.map(v => v.preco).filter(Boolean);
    if (!precos.length) return "—";
    const min = Math.min(...precos), max = Math.max(...precos);
    return min === max ? `R$ ${min.toFixed(2).replace(".", ",")}` : `R$ ${min.toFixed(2).replace(".", ",")} – ${max.toFixed(2).replace(".", ",")}`;
  }, [dish.variacoes]);

  return (
    <article className={`dish-card ${dish.bloqueado ? "dish-card--blocked" : ""} ${!dish.ativo ? "dish-card--inactive" : ""}`}>
      <DishImage url={dish.foto_url} name={dish.nome} />
      <div className="dish-card__body">
        <div className="dish-card__top">
          <h3>{dish.nome}</h3>
          {dish.destaque && <span className="dish-card__star" title={dish.destaque}>{Icon.star}</span>}
        </div>
        <div className="dish-card__meta">
          <Badge kind="neutral">{dish.categoria}</Badge>
          {dish.destaque && <Badge kind="ember">{dish.destaque}</Badge>}
          {!dish.ativo && <Badge kind="muted">inativo</Badge>}
        </div>
        <div className="dish-card__variacoes">
          {dish.variacoes.map((v, i) => (
            <div key={i} className="variacao">
              <span>{v.nome}</span>
              <span className="variacao__preco">R$ {v.preco?.toFixed(2).replace(".", ",")}</span>
            </div>
          ))}
        </div>
        {dish.bloqueado && (
          <div className="block-warning">
            <span>{Icon.warn}</span>
            <span>Bloqueado: falta {dish.motivo_bloqueio.join(", ")}</span>
          </div>
        )}
        <div className="dish-card__actions">
          <Btn kind="ghost" size="sm" icon={Icon.edit} onClick={onEdit}>Editar</Btn>
          <Btn kind="ghost" size="sm" icon={Icon.copy} onClick={onDup}>Duplicar</Btn>
          <IconBtn onClick={onDel} title="Excluir" danger>{Icon.trash}</IconBtn>
        </div>
      </div>
    </article>
  );
}

// ===== EDITOR =====
function FichaEditor({ dish, onClose }) {
  const { upsertDish, toast } = useStore();
  const [data, setData] = useState(() => dish ? { ...dish, variacoes: [...dish.variacoes], ingredientes: dish.ingredientes.map(i => ({ ...i })), tags: [...dish.tags], alergenos: [...dish.alergenos] } : {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    nome: "", categoria: "Entradas", foto_url: "", destaque: "",
    variacoes: [{ nome: "Único", preco: 0, serve: "1 pessoa" }],
    ingredientes: [{ nome: "", quantidade: 0, unidade: "g", essencial: true }],
    modo_preparo: "", tempo_preparo_min: 0, rendimento_porcoes: 1, acompanhamentos: "",
    diferenciais: "", adicionais: "", tags: [], alergenos: [], descricao_interna: "",
    disponivel_delivery: true, disponivel_salao: true, ativo: true,
    bloqueado: false, motivo_bloqueio: [],
  });
  const [section, setSection] = useState({ basico: true, preco: true, ingr: true, receita: false, marketing: false, status: false, notas: false });
  const toggle = (k) => setSection(s => ({ ...s, [k]: !s[k] }));

  const update = (k, v) => setData(d => ({ ...d, [k]: v }));

  const errs = useMemo(() => {
    const e = {};
    if (!data.nome.trim()) e.nome = "Obrigatório";
    if (!data.categoria) e.categoria = "Obrigatório";
    if (!data.variacoes.length || !data.variacoes.some(v => v.preco > 0)) e.variacoes = "Pelo menos uma variação com preço";
    if (!data.ingredientes.length || !data.ingredientes.some(i => i.nome.trim())) e.ingredientes = "Pelo menos um ingrediente";
    return e;
  }, [data]);

  const save = () => {
    if (Object.keys(errs).length) { toast("Corrija os campos destacados", "danger"); return; }
    upsertDish(data);
    toast(dish ? "Ficha atualizada" : "Ficha criada");
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} size="xl" title={dish ? `Editar: ${dish.nome || "Nova ficha"}` : "Nova ficha técnica"}
      footer={<>
        <Btn kind="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn kind="primary" onClick={save}>{dish ? "Salvar alterações" : "Criar ficha"}</Btn>
      </>}>
      <div className="form">
        <Section open={section.basico} onToggle={() => toggle("basico")} title="Informações básicas" required>
          <div className="form-grid">
            <Field label="Nome" err={errs.nome} hint={`${data.nome.length}/40 caracteres${data.nome.length > 40 ? " (longo demais)" : ""}`} warn={data.nome.length > 40}>
              <input value={data.nome} onChange={e => update("nome", e.target.value)} placeholder="Ex: Picanha na Brasa" />
            </Field>
            <Field label="Categoria" err={errs.categoria}>
              <select value={data.categoria} onChange={e => update("categoria", e.target.value)}>
                {window.CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="URL da foto" hint="ou deixe vazio para placeholder" span={2}>
              <input value={data.foto_url} onChange={e => update("foto_url", e.target.value)} placeholder="https://…" />
            </Field>
            <Field label="Destaque">
              <select value={data.destaque} onChange={e => update("destaque", e.target.value)}>
                <option value="">Nenhum</option>
                {window.DESTAQUES.filter(Boolean).map(d => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section open={section.preco} onToggle={() => toggle("preco")} title="Preço e variações" required>
          {errs.variacoes && <div className="field-err">{errs.variacoes}</div>}
          <div className="rows">
            {data.variacoes.map((v, i) => (
              <div key={i} className="row row--variacao">
                <input placeholder="Nome (Inteira / Meia)" value={v.nome} onChange={e => { const nv = [...data.variacoes]; nv[i] = { ...v, nome: e.target.value }; update("variacoes", nv); }} />
                <input placeholder="Serve (3/4 pessoas)" value={v.serve} onChange={e => { const nv = [...data.variacoes]; nv[i] = { ...v, serve: e.target.value }; update("variacoes", nv); }} />
                <div className="price-input">
                  <span>R$</span>
                  <input type="number" step="0.01" value={v.preco} onChange={e => { const nv = [...data.variacoes]; nv[i] = { ...v, preco: parseFloat(e.target.value) || 0 }; update("variacoes", nv); }} />
                </div>
                <IconBtn danger title="Remover" onClick={() => update("variacoes", data.variacoes.filter((_, j) => j !== i))}>{Icon.close}</IconBtn>
              </div>
            ))}
          </div>
          <Btn kind="ghost" size="sm" icon={Icon.plus} onClick={() => update("variacoes", [...data.variacoes, { nome: "", preco: 0, serve: "" }])}>Adicionar variação</Btn>
        </Section>

        <Section open={section.ingr} onToggle={() => toggle("ingr")} title="Ingredientes" required>
          {errs.ingredientes && <div className="field-err">{errs.ingredientes}</div>}
          <div className="rows">
            {data.ingredientes.map((ing, i) => (
              <div key={i} className="row row--ingr">
                <input placeholder="Nome do ingrediente" value={ing.nome} onChange={e => { const ni = [...data.ingredientes]; ni[i] = { ...ing, nome: e.target.value }; update("ingredientes", ni); }} />
                <input type="number" placeholder="Qtd" value={ing.quantidade} onChange={e => { const ni = [...data.ingredientes]; ni[i] = { ...ing, quantidade: parseFloat(e.target.value) || 0 }; update("ingredientes", ni); }} />
                <select value={ing.unidade} onChange={e => { const ni = [...data.ingredientes]; ni[i] = { ...ing, unidade: e.target.value }; update("ingredientes", ni); }}>
                  {["g", "kg", "ml", "l", "un", "fatia", "lata", "colher"].map(u => <option key={u}>{u}</option>)}
                </select>
                <label className="check inline">
                  <input type="checkbox" checked={ing.essencial} onChange={e => { const ni = [...data.ingredientes]; ni[i] = { ...ing, essencial: e.target.checked }; update("ingredientes", ni); }} />
                  <span>essencial</span>
                </label>
                <IconBtn danger title="Remover" onClick={() => update("ingredientes", data.ingredientes.filter((_, j) => j !== i))}>{Icon.close}</IconBtn>
              </div>
            ))}
          </div>
          <Btn kind="ghost" size="sm" icon={Icon.plus} onClick={() => update("ingredientes", [...data.ingredientes, { nome: "", quantidade: 0, unidade: "g", essencial: true }])}>Adicionar ingrediente</Btn>
        </Section>

        <Section open={section.receita} onToggle={() => toggle("receita")} title="Receita">
          <div className="form-grid">
            <Field label="Modo de preparo" span={2}>
              <textarea rows={4} value={data.modo_preparo} onChange={e => update("modo_preparo", e.target.value)} placeholder="Passo a passo…" />
            </Field>
            <Field label="Tempo de preparo (min)">
              <input type="number" value={data.tempo_preparo_min} onChange={e => update("tempo_preparo_min", parseInt(e.target.value) || 0)} />
            </Field>
            <Field label="Rendimento (porções)">
              <input type="number" value={data.rendimento_porcoes} onChange={e => update("rendimento_porcoes", parseInt(e.target.value) || 1)} />
            </Field>
            <Field label="Acompanhamentos" span={2}>
              <input value={data.acompanhamentos} onChange={e => update("acompanhamentos", e.target.value)} placeholder="arroz, salada, mandioca…" />
            </Field>
          </div>
        </Section>

        <Section open={section.marketing} onToggle={() => toggle("marketing")} title="Marketing e venda">
          <div className="form-grid">
            <Field label="Diferenciais (vendem o prato)" span={2}>
              <textarea rows={2} value={data.diferenciais} onChange={e => update("diferenciais", e.target.value)} placeholder="feito na brasa, receita da casa…" />
            </Field>
            <Field label="Adicionais disponíveis" span={2}>
              <input value={data.adicionais} onChange={e => update("adicionais", e.target.value)} placeholder="bacon extra, queijo, cebola…" />
            </Field>
            <Field label="Tags" span={2}>
              <div className="chips">
                {window.TAGS_DISPONIVEIS.map(t => (
                  <button key={t} type="button" className={`chip ${data.tags.includes(t) ? "chip--on" : ""}`}
                    onClick={() => update("tags", data.tags.includes(t) ? data.tags.filter(x => x !== t) : [...data.tags, t])}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Alérgenos" span={2}>
              <div className="chips">
                {window.ALERGENOS.map(a => (
                  <button key={a} type="button" className={`chip chip--alergeno ${data.alergenos.includes(a) ? "chip--on" : ""}`}
                    onClick={() => update("alergenos", data.alergenos.includes(a) ? data.alergenos.filter(x => x !== a) : [...data.alergenos, a])}>
                    {a}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        <Section open={section.status} onToggle={() => toggle("status")} title="Status">
          <div className="toggles">
            <Toggle label="Disponível para delivery" checked={data.disponivel_delivery} onChange={v => update("disponivel_delivery", v)} />
            <Toggle label="Disponível para salão" checked={data.disponivel_salao} onChange={v => update("disponivel_salao", v)} />
            <Toggle label="Prato ativo" checked={data.ativo} onChange={v => update("ativo", v)} />
          </div>
        </Section>

        <Section open={section.notas} onToggle={() => toggle("notas")} title="Notas internas">
          <Field label="Descrição interna (não vai para o cardápio)">
            <textarea rows={3} value={data.descricao_interna} onChange={e => update("descricao_interna", e.target.value)} placeholder="Anotações da cozinha…" />
          </Field>
        </Section>
      </div>
    </Modal>
  );
}

function Section({ open, onToggle, title, required, children }) {
  return (
    <section className={`form-section ${open ? "is-open" : ""}`}>
      <button type="button" className="form-section__head" onClick={onToggle}>
        <span className="form-section__chev">{Icon.chevron}</span>
        <span>{title}</span>
        {required && <span className="req">obrigatório</span>}
      </button>
      {open && <div className="form-section__body">{children}</div>}
    </section>
  );
}

function Field({ label, err, hint, warn, span, children }) {
  return (
    <div className="field" style={span ? { gridColumn: `span ${span}` } : {}}>
      <label className="field__label">{label}</label>
      {children}
      {err && <div className="field-err">{err}</div>}
      {hint && !err && <div className={`field-hint ${warn ? "field-hint--warn" : ""}`}>{hint}</div>}
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <span className={`toggle__sw ${checked ? "is-on" : ""}`} onClick={() => onChange(!checked)}>
        <span className="toggle__dot"></span>
      </span>
    </label>
  );
}

window.FichasModule = FichasModule;
