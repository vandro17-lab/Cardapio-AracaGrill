// Configurações + Main App

function ConfigModule() {
  const { config, setConfig, dishes, shortages, history, toast, restoreBackup, clearAll } = useStore();
  const [draft, setDraft] = useState(config);
  const [confirm, confirmNode] = useConfirm();
  const importRef = useRef(null);

  // Keep draft in sync if config changes externally
  useEffect(() => { setDraft(config); }, [config]);

  const save = () => {
    setConfig(draft);
    toast("Configurações salvas");
  };

  const exportBackup = () => {
    const blob = new Blob(
      [JSON.stringify({ dishes, shortages, history, config }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `araca-grill-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup baixado");
  };

  const importBackup = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!await confirm({
      title: "Importar backup?",
      message: `Isso vai substituir todos os dados atuais pelo arquivo "${file.name}". Esta ação não pode ser desfeita.`,
      danger: true,
      confirmLabel: "Importar e substituir",
    })) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.dishes || !Array.isArray(data.dishes)) {
        toast("Arquivo inválido — não contém fichas técnicas", "danger");
        return;
      }
      await restoreBackup(data);
      toast(`Backup importado: ${data.dishes.length} fichas, ${data.shortages?.length || 0} faltas, ${data.history?.length || 0} históricos`);
    } catch (err) {
      toast(`Erro ao importar: ${err.message}`, "danger");
    }
  };

  const limpar = async () => {
    if (!await confirm({ title: "Limpar todos os dados?", message: "Isso vai apagar todas as fichas e o histórico. Esta ação não pode ser desfeita.", danger: true, confirmLabel: "Continuar" })) return;
    if (!await confirm({ title: "Tem certeza absoluta?", message: "Última chance. Todos os dados serão perdidos permanentemente do IndexedDB.", danger: true, confirmLabel: "Sim, apagar tudo" })) return;
    if (!await confirm({ title: "Confirmação final", message: "Esta é a 3ª e última confirmação. Apagar todos os dados?", danger: true, confirmLabel: "APAGAR TUDO" })) return;
    await clearAll();
    toast("Todos os dados foram apagados", "warn");
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="kicker">Sistema</div>
          <h1>Configurações</h1>
          <p className="page__sub">Ajustes globais do sistema, integração com IA e backups.</p>
        </div>
        <Btn kind="primary" size="lg" onClick={save}>Salvar alterações</Btn>
      </div>

      <div className="config-grid">
        <div className="config-card">
          <h3>Integração com IA</h3>
          <p className="config-card__sub">
            A chave do Gemini é guardada localmente no IndexedDB. Pegue gratuitamente em{" "}
            <a href="https://ai.google.dev" target="_blank" rel="noopener">ai.google.dev</a>{" "}
            (até 1500 requisições/dia).
          </p>
          <Field label="Chave da API do Gemini">
            <input
              type="password"
              placeholder="AIza…"
              value={draft.gemini_api_key}
              onChange={(e) => setDraft({ ...draft, gemini_api_key: e.target.value })}
            />
          </Field>
          {draft.gemini_api_key && (
            <div style={{ fontSize: "12px", color: "var(--ok)", marginTop: "-4px" }}>✓ Chave configurada — IA ativa</div>
          )}
        </div>

        <div className="config-card">
          <h3>Identidade do restaurante</h3>
          <Field label="Nome do restaurante">
            <input value={draft.nome_restaurante} onChange={(e) => setDraft({ ...draft, nome_restaurante: e.target.value })} />
          </Field>
          <Field label="Telefone WhatsApp da equipe" hint="Use formato internacional sem + (5515999999999)">
            <input value={draft.telefone_whatsapp} onChange={(e) => setDraft({ ...draft, telefone_whatsapp: e.target.value })} />
          </Field>
        </div>

        <div className="config-card">
          <h3>Tom de voz do cardápio</h3>
          <p className="config-card__sub">Define como a IA escreve as descrições no Gerador de Cardápio.</p>
          <div className="chips chips--tom">
            {window.TONS_DE_VOZ.map((t) => (
              <button
                key={t}
                className={`chip chip--tom ${draft.tom_de_voz === t ? "chip--on" : ""}`}
                onClick={() => setDraft({ ...draft, tom_de_voz: t })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="config-card">
          <h3>Backup dos dados</h3>
          <p className="config-card__sub">Exporte um JSON com todas as fichas, faltas e histórico. Útil para migrar ou guardar uma cópia.</p>
          <div className="config-actions">
            <Btn kind="ghost" icon={Icon.download} onClick={exportBackup}>Exportar backup</Btn>
            <Btn kind="ghost" icon={Icon.upload} onClick={() => importRef.current?.click()}>Importar backup</Btn>
            <input ref={importRef} type="file" accept=".json" style={{ display: "none" }} onChange={importBackup} />
          </div>
        </div>

        <div className="config-card config-card--danger">
          <h3>Zona de perigo</h3>
          <p className="config-card__sub">Apaga todas as fichas, históricos e configurações do banco local. Requer 3 confirmações.</p>
          <Btn kind="danger" icon={Icon.trash} onClick={limpar}>Limpar todos os dados</Btn>
        </div>

        <div className="config-card">
          <h3>Estatísticas atuais</h3>
          <div className="stat-list">
            <div className="stat-line"><span>Fichas cadastradas</span><strong>{dishes.length}</strong></div>
            <div className="stat-line"><span>Pratos ativos</span><strong>{dishes.filter((d) => d.ativo).length}</strong></div>
            <div className="stat-line"><span>Bloqueios ativos</span><strong>{shortages.filter((s) => s.status === "ativo").length}</strong></div>
            <div className="stat-line"><span>Eventos no histórico</span><strong>{history.length}</strong></div>
            <div className="stat-line"><span>Persistência</span><strong>IndexedDB (local)</strong></div>
          </div>
        </div>
      </div>
      {confirmNode}
    </div>
  );
}

// Componentes locais do formulário (reutilizados de fichas.jsx que não os exporta globalmente)
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

// ===== MAIN APP =====
function App() {
  const [route, setRoute] = useState(() => location.hash.slice(1) || "fichas");
  const { dishes, shortages } = useStore();
  const blocked = dishes.filter((d) => d.bloqueado).length;
  const ativosShort = shortages.filter((s) => s.status === "ativo").length;

  useEffect(() => {
    const h = () => setRoute(location.hash.slice(1) || "fichas");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const go = (r) => { location.hash = r; setRoute(r); };

  const NAV = [
    { key: "fichas", label: "Fichas Técnicas", icon: Icon.ficha },
    { key: "auditoria", label: "Auditoria", icon: Icon.audit },
    { key: "gerador", label: "Gerador de Cardápio", icon: Icon.ai },
    { key: "insumos", label: "Insumos em Falta", icon: Icon.block, badge: ativosShort },
    { key: "config", label: "Configurações", icon: Icon.gear },
  ];

  const NAV_MOBILE = [
    { key: "fichas", label: "Fichas", icon: Icon.ficha },
    { key: "auditoria", label: "Auditoria", icon: Icon.audit },
    { key: "gerador", label: "Cardápio", icon: Icon.ai },
    { key: "insumos", label: "Insumos", icon: Icon.block, badge: ativosShort },
    { key: "config", label: "Ajustes", icon: Icon.gear },
  ];

  const brandMark = (
    <svg viewBox="0 0 32 32" width="32" height="32">
      <defs>
        <linearGradient id="emberG" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="oklch(0.78 0.16 60)" />
          <stop offset="1" stopColor="oklch(0.55 0.18 35)" />
        </linearGradient>
      </defs>
      <path d="M16 4c2 6 8 7 8 14a8 8 0 0 1-16 0c0-3 1.5-5 3-6 0 2.5 1.5 4 3 4 0-4-2-7 2-12z" fill="url(#emberG)" />
      <circle cx="16" cy="20" r="2.5" fill="oklch(0.18 0.01 60)" />
    </svg>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => go("fichas")}>
          <div className="brand__mark">{brandMark}</div>
          <div>
            <div className="brand__sub">Cardápio Inteligente</div>
            <div className="brand__name">Araçá Grill</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <button key={n.key} className={`nav-item ${route === n.key ? "is-on" : ""}`} onClick={() => go(n.key)}>
              <span className="nav-item__icon">{n.icon}</span>
              <span className="nav-item__label">{n.label}</span>
              {n.badge > 0 && <span className="nav-item__badge">{n.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="side-foot">
          {blocked > 0 && (
            <button className="side-status side-status--alert" onClick={() => go("insumos")}>
              <span className="side-status__dot"></span>
              <div>
                <div className="side-status__num">{blocked} pratos bloqueados</div>
                <div className="side-status__sub">Toque para resolver</div>
              </div>
            </button>
          )}
          <div className="side-version">v1.0 · IndexedDB · Gemini</div>
        </div>
      </aside>

      <header className="appbar">
        <div className="appbar__brand" onClick={() => go("fichas")}>
          <div className="appbar__mark">{brandMark}</div>
          <div>
            <div className="appbar__page">Cardápio Inteligente</div>
            <div className="appbar__name">Araçá Grill</div>
          </div>
        </div>
        {blocked > 0 && (
          <button className="appbar__alert" onClick={() => go("insumos")}>
            <span className="appbar__alert-dot"></span>
            <span>{blocked}</span>
          </button>
        )}
      </header>

      <main className="main">
        {route === "fichas" && <FichasModule />}
        {route === "auditoria" && <AuditoriaModule />}
        {route === "gerador" && <GeradorModule />}
        {route === "insumos" && <InsumosModule />}
        {route === "config" && <ConfigModule />}
      </main>

      <nav className="tabbar-bottom">
        {NAV_MOBILE.map((n) => (
          <button key={n.key} className={`tabbar-bottom__item ${route === n.key ? "is-on" : ""}`} onClick={() => go(n.key)}>
            <span className="tabbar-bottom__icon">
              {n.icon}
              {n.badge > 0 && <span className="tabbar-bottom__badge">{n.badge}</span>}
            </span>
            <span className="tabbar-bottom__label">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StoreProvider><App /></StoreProvider>);
