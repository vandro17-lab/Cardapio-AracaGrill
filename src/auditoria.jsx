// Módulo 2 - Painel de Auditoria

function AuditoriaModule() {
  const { dishes, config, toast } = useStore();
  const [iaOpen, setIaOpen] = useState(false);
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState("");

  const stats = useMemo(() => {
    const ativos = dishes.filter((d) => d.ativo);
    const semFoto = ativos.filter((d) => !d.foto_url);
    const nomeLongo = ativos.filter((d) => d.nome.length > 40);
    const semDif = ativos.filter((d) => !d.diferenciais?.trim());
    const semDest = ativos.filter((d) => !d.destaque);
    const semAcomp = ativos
      .filter((d) => d.categoria === "Churrasqueira" || d.categoria === "À la Carte")
      .filter((d) => !d.acompanhamentos?.trim());
    const semAlerg = ativos.filter(
      (d) =>
        d.ingredientes.some((i) => /leite|queijo|creme|manteiga|trigo|farinha|camarão/i.test(i.nome)) &&
        d.alergenos.length === 0
    );
    const total = ativos.length;
    const bemCadastrados = ativos.filter(
      (d) => d.foto_url && d.nome.length <= 40 && d.diferenciais?.trim() && d.destaque
    );
    return { total, semFoto, nomeLongo, semDif, semDest, semAcomp, semAlerg, bemCadastrados };
  }, [dishes]);

  const score = Math.round((stats.bemCadastrados.length / Math.max(1, stats.total)) * 100);

  const rodarIA = async () => {
    setIaOpen(true);
    setIaLoading(true);
    setIaResult("");

    try {
      const resumo = {
        total_ativos: stats.total,
        sem_foto: stats.semFoto.length,
        sem_foto_nomes: stats.semFoto.slice(0, 5).map((d) => d.nome),
        nome_longo: stats.nomeLongo.length,
        nome_longo_nomes: stats.nomeLongo.map((d) => d.nome),
        sem_diferencial: stats.semDif.length,
        sem_destaque: stats.semDest.length,
        sem_acompanhamento: stats.semAcomp.length,
        alérgenos_ausentes: stats.semAlerg.length,
        bem_cadastrados: stats.bemCadastrados.length,
        score,
        categorias: [...new Set(dishes.filter((d) => d.ativo).map((d) => d.categoria))],
        pratos_destaque: dishes.filter((d) => d.destaque).map((d) => d.nome).slice(0, 5),
      };

      const prompt = `Você é consultor de marketing gastronômico especializado em cardápios digitais para restaurantes brasileiros.

RESTAURANTE: ${config.nome_restaurante}
DADOS DO CARDÁPIO:
${JSON.stringify(resumo, null, 2)}

Faça uma auditoria completa e prática. Seja específico, direto e use dados reais acima. Escreva em português brasileiro, tom profissional mas acessível.

Estruture sua resposta com:
1. Diagnóstico geral (2-3 frases)
2. Principais problemas identificados (use os dados reais)
3. Prioridades de ação (top 3, em ordem de impacto)
4. Score final: ${score}/100 — interpretação e próximos passos

Não invente informações. Use apenas os dados fornecidos.`;

      const text = await callGemini(null, prompt);
      setIaResult(text);
    } catch (err) {
      setIaResult(`❌ **Erro ao conectar com o Gemini:** ${err.message}`);
    }

    setIaLoading(false);
  };

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <div className="kicker">Módulo 2</div>
          <h1>Auditoria do Cardápio</h1>
          <p className="page__sub">Diagnóstico de qualidade baseado em padrões reais de conversão.</p>
        </div>
        <Btn kind="primary" size="lg" icon={Icon.ai} onClick={rodarIA}>
          Auditoria com IA
        </Btn>
      </div>

      <div className="score-panel">
        <div className="score-panel__num">
          <ScoreRing value={score} />
          <div>
            <div className="score-panel__label">Score do cardápio</div>
            <div className="score-panel__sub">
              {stats.bemCadastrados.length} de {stats.total} pratos completos
            </div>
          </div>
        </div>
        <div className="score-panel__bars">
          <BarRow label="Com foto" value={stats.total - stats.semFoto.length} total={stats.total} kind="ok" />
          <BarRow label="Com diferencial" value={stats.total - stats.semDif.length} total={stats.total} kind="warn" />
          <BarRow label="Com destaque" value={stats.total - stats.semDest.length} total={stats.total} kind="warn" />
          <BarRow label="Alérgenos OK" value={stats.total - stats.semAlerg.length} total={stats.total} kind="ok" />
        </div>
      </div>

      <div className="alert-grid">
        <AlertCard level="danger" icon={Icon.warn} count={stats.semFoto.length} title="pratos sem foto" why="Fotos são o fator nº1 de conversão no delivery. Pratos sem foto vendem até 30% menos." items={stats.semFoto} />
        <AlertCard level="danger" icon={Icon.warn} count={stats.nomeLongo.length} title="pratos com nome longo demais" why="Nomes acima de 40 caracteres são truncados na busca do iFood e prejudicam a localização." items={stats.nomeLongo} />
        <AlertCard level="warn" icon={Icon.warn} count={stats.semDif.length} title="pratos sem diferencial" why="Sem diferencial cadastrado, a IA gera descrições genéricas. Escreva 1 frase por prato." items={stats.semDif} />
        <AlertCard level="warn" icon={Icon.warn} count={stats.semDest.length} title="pratos sem destaque" why="Marcar 'Mais Pedido' e 'Destaque da Casa' aumenta ticket médio. Sem nenhum, o cliente fica perdido." items={stats.semDest.slice(0, 20)} />
        <AlertCard level="warn" icon={Icon.warn} count={stats.semAcomp.length} title="pratos principais sem acompanhamento" why="Pratos da Churrasqueira ou À la Carte sem acompanhamento prejudicam o cardápio impresso." items={stats.semAcomp} />
        <AlertCard level="warn" icon={Icon.warn} count={stats.semAlerg.length} title="pratos com alérgenos não declarados" why="ANVISA RDC 26/2015 obriga declaração. Risco legal." items={stats.semAlerg} />
        <AlertCard level="info" icon={Icon.audit} count={stats.total} title="pratos ativos no cardápio" why={stats.total > 50 ? "Cardápios com >50 pratos reduzem conversão (paradoxo da escolha)." : "Tamanho saudável de cardápio."} />
        <AlertCard level="ok" icon={Icon.check} count={stats.bemCadastrados.length} title="pratos completos" why="Foto, nome curto, diferencial e destaque cadastrados." items={stats.bemCadastrados.slice(0, 10)} />
      </div>

      <Modal
        open={iaOpen}
        onClose={() => setIaOpen(false)}
        title="Diagnóstico do Cardápio"
        size="lg"
        footer={
          <>
            <Btn kind="ghost" onClick={() => { navigator.clipboard?.writeText(iaResult); toast("Diagnóstico copiado"); }} disabled={!iaResult}>
              Copiar
            </Btn>
            <Btn kind="primary" onClick={() => setIaOpen(false)}>Fechar</Btn>
          </>
        }
      >
        {iaLoading ? (
          <div className="ia-loading">
            <div className="spinner"></div>
            <p>Analisando {stats.total} pratos com o Gemini…</p>
          </div>
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

function ScoreRing({ value }) {
  const r = 42, c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg className="score-ring" width="110" height="110" viewBox="0 0 110 110">
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--ember)" strokeWidth="8" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" transform="rotate(-90 55 55)" style={{ transition: "stroke-dashoffset .6s ease" }} />
      <text x="55" y="62" textAnchor="middle" fontSize="28" fontFamily="Instrument Serif, serif" fill="var(--text)">{value}</text>
    </svg>
  );
}

function BarRow({ label, value, total, kind }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bar-row">
      <div className="bar-row__head">
        <span>{label}</span>
        <span className="bar-row__nums"><strong>{value}</strong>/{total}</span>
      </div>
      <div className="bar-track">
        <div className={`bar-fill bar-fill--${kind}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AlertCard({ level, icon, count, title, why, items }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`alert alert--${level}`}>
      <div className="alert__icon">{icon}</div>
      <div className="alert__body">
        <div className="alert__count">
          <span className="alert__num">{count}</span>
          <span className="alert__title">{title}</span>
        </div>
        <p className="alert__why">{why}</p>
        {items?.length > 0 && (
          <>
            <button className="alert__toggle" onClick={() => setOpen(!open)}>
              {open ? "Ocultar" : "Ver lista"} ({items.length})
            </button>
            {open && (
              <ul className="alert__items">
                {items.map((d) => (
                  <li key={d.id}>{d.nome} <span className="alert__items__cat">· {d.categoria}</span></li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

window.AuditoriaModule = AuditoriaModule;
