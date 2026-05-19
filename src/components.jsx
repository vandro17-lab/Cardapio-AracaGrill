// Shared components & store - Araçá Grill
const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

// ===== GEMINI API HELPER =====
async function callGemini(apiKey, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error("Limite de requisições da API atingido. Tente novamente em alguns minutos.");
    if (res.status === 400 || res.status === 403) throw new Error("Chave da API inválida ou sem permissão. Verifique nas Configurações.");
    throw new Error(err.error?.message || `Erro da API Gemini (${res.status}). Verifique sua chave.`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function parseGeminiJSON(text) {
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) return JSON.parse(arrMatch[0]);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return JSON.parse(objMatch[0]);
  return JSON.parse(text);
}

Object.assign(window, { callGemini, parseGeminiJSON });

// ===== STORE (IndexedDB via Dexie) =====
const StoreCtx = createContext(null);

function useStore() {
  return useContext(StoreCtx);
}

const DEFAULT_CONFIG = {
  gemini_api_key: "",
  tom_de_voz: "descontraído",
  nome_restaurante: "Araçá Grill",
  telefone_whatsapp: "5515999999999",
};

function StoreProvider({ children }) {
  const [dishes, _setDishes] = useState([]);
  const [shortages, _setShortages] = useState([]);
  const [history, _setHistory] = useState([]);
  const [config, _setConfig] = useState(DEFAULT_CONFIG);
  const [ready, setReady] = useState(false);
  const db = window.__db;

  // Load from IndexedDB on mount; seed if empty
  useEffect(() => {
    async function load() {
      try {
        const [dbDishes, dbShortages, dbHistory, dbConfig] = await Promise.all([
          db.dishes.toArray(),
          db.shortages.toArray(),
          db.shortage_history.toArray(),
          db.config.toArray(),
        ]);

        if (dbDishes.length === 0) {
          await db.dishes.bulkAdd(window.SEED_DISHES);
          _setDishes(window.SEED_DISHES.map((d) => ({ ...d })));
        } else {
          _setDishes(dbDishes);
        }

        if (dbShortages.length === 0) {
          await db.shortages.bulkAdd(window.SEED_SHORTAGES);
          _setShortages(window.SEED_SHORTAGES.map((s) => ({ ...s })));
        } else {
          _setShortages(dbShortages);
        }

        if (dbHistory.length === 0) {
          await db.shortage_history.bulkAdd(window.SEED_HISTORY);
          _setHistory(window.SEED_HISTORY.map((h) => ({ ...h })));
        } else {
          _setHistory(dbHistory);
        }

        const configObj = {};
        dbConfig.forEach((c) => { configObj[c.key] = c.value; });
        _setConfig({ ...DEFAULT_CONFIG, ...configObj });
      } catch (err) {
        console.error("Erro ao carregar IndexedDB, usando dados de exemplo:", err);
        _setDishes(window.SEED_DISHES.map((d) => ({ ...d })));
        _setShortages(window.SEED_SHORTAGES.map((s) => ({ ...s })));
        _setHistory(window.SEED_HISTORY.map((h) => ({ ...h })));
      }
      setReady(true);
    }
    load();
  }, []);

  // Recalculate blocked state whenever shortages change
  useEffect(() => {
    if (!ready) return;
    const ativos = shortages.filter((s) => s.status === "ativo");
    _setDishes((curr) =>
      curr.map((d) => {
        const motivos = [];
        for (const sh of ativos) {
          const acao = sh.pratos_afetados.find((p) => p.dish_id === d.id);
          if (acao?.acao === "bloqueado") motivos.push(sh.ingrediente);
        }
        if (motivos.length) return { ...d, bloqueado: true, motivo_bloqueio: motivos };
        if (d.bloqueado) return { ...d, bloqueado: false, motivo_bloqueio: [] };
        return d;
      })
    );
  }, [shortages, ready]);

  // ===== DISH MUTATIONS =====
  const upsertDish = useCallback((dish) => {
    const now = Date.now();
    _setDishes((curr) => {
      const idx = curr.findIndex((d) => d.id === dish.id);
      if (idx === -1) {
        const novo = { ...dish, criado_em: now, atualizado_em: now };
        db.dishes.put(novo).catch(console.error);
        return [...curr, novo];
      }
      const updated = { ...dish, atualizado_em: now };
      db.dishes.put(updated).catch(console.error);
      const copy = [...curr];
      copy[idx] = updated;
      return copy;
    });
  }, [db]);

  const removeDish = useCallback((id) => {
    _setDishes((curr) => curr.filter((d) => d.id !== id));
    db.dishes.delete(id).catch(console.error);
  }, [db]);

  const duplicateDish = useCallback((id) => {
    _setDishes((curr) => {
      const found = curr.find((d) => d.id === id);
      if (!found) return curr;
      const now = Date.now();
      const copy = {
        ...found,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        nome: found.nome + " (cópia)",
        criado_em: now,
        atualizado_em: now,
        bloqueado: false,
        motivo_bloqueio: [],
      };
      db.dishes.put(copy).catch(console.error);
      return [...curr, copy];
    });
  }, [db]);

  // ===== SHORTAGE MUTATIONS =====
  const setShortages = useCallback((updater) => {
    _setShortages((curr) => {
      const next = typeof updater === "function" ? updater(curr) : updater;
      const prevIds = new Set(curr.map((s) => s.id));
      const nextIds = new Set(next.map((s) => s.id));
      next.forEach((s) => db.shortages.put(s).catch(console.error));
      prevIds.forEach((id) => { if (!nextIds.has(id)) db.shortages.delete(id).catch(console.error); });
      return next;
    });
  }, [db]);

  // ===== HISTORY MUTATIONS =====
  const setHistory = useCallback((updater) => {
    _setHistory((curr) => {
      const next = typeof updater === "function" ? updater(curr) : updater;
      next.forEach((h) => db.shortage_history.put(h).catch(console.error));
      return next;
    });
  }, [db]);

  // ===== CONFIG MUTATIONS =====
  const setConfig = useCallback((newConfig) => {
    _setConfig(newConfig);
    Object.entries(newConfig).forEach(([key, value]) => {
      db.config.put({ key, value }).catch(console.error);
    });
  }, [db]);

  // ===== BULK RESTORE (import backup) =====
  const restoreBackup = useCallback(async (backup) => {
    await Promise.all([
      db.dishes.clear(),
      db.shortages.clear(),
      db.shortage_history.clear(),
      db.config.clear(),
    ]);
    if (backup.dishes?.length) {
      await db.dishes.bulkAdd(backup.dishes);
      _setDishes(backup.dishes);
    }
    if (backup.shortages?.length) {
      await db.shortages.bulkAdd(backup.shortages);
      _setShortages(backup.shortages);
    }
    if (backup.history?.length) {
      await db.shortage_history.bulkAdd(backup.history);
      _setHistory(backup.history);
    }
    if (backup.config) {
      const entries = Object.entries(backup.config).map(([key, value]) => ({ key, value }));
      await db.config.bulkAdd(entries);
      _setConfig({ ...DEFAULT_CONFIG, ...backup.config });
    }
  }, [db]);

  // ===== CLEAR ALL =====
  const clearAll = useCallback(async () => {
    await Promise.all([
      db.dishes.clear(),
      db.shortages.clear(),
      db.shortage_history.clear(),
      db.config.clear(),
    ]);
    _setDishes([]);
    _setShortages([]);
    _setHistory([]);
    _setConfig(DEFAULT_CONFIG);
  }, [db]);

  // ===== TOASTS =====
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", fontFamily: "Manrope, sans-serif", color: "oklch(0.45 0.022 65)", gap: "14px", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
          <svg viewBox="0 0 32 32" width="48" height="48">
            <defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="oklch(0.78 0.16 60)"/><stop offset="1" stopColor="oklch(0.55 0.18 35)"/></linearGradient></defs>
            <path d="M16 4c2 6 8 7 8 14a8 8 0 0 1-16 0c0-3 1.5-5 3-6 0 2.5 1.5 4 3 4 0-4-2-7 2-12z" fill="url(#lg)"/>
          </svg>
          <div className="spinner"></div>
          <div style={{ fontSize: "13px" }}>Carregando dados…</div>
        </div>
      </div>
    );
  }

  return (
    <StoreCtx.Provider value={{
      dishes, shortages, history, config, ready,
      upsertDish, removeDish, duplicateDish,
      setShortages, setHistory, setConfig,
      restoreBackup, clearAll,
      toast,
    }}>
      {children}
      <ToastStack toasts={toasts} />
    </StoreCtx.Provider>
  );
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          <div className="toast__dot"></div>
          <div>{t.msg}</div>
        </div>
      ))}
    </div>
  );
}

// ===== BASIC UI =====
function Btn({ children, kind = "ghost", size = "md", icon, onClick, disabled, title, type = "button" }) {
  return (
    <button type={type} className={`btn btn--${kind} btn--${size}`} onClick={onClick} disabled={disabled} title={title}>
      {icon && <span className="btn__icon">{icon}</span>}
      <span>{children}</span>
    </button>
  );
}

function Badge({ children, kind = "neutral", icon }) {
  return <span className={`badge badge--${kind}`}>{icon && <span className="badge__icon">{icon}</span>}{children}</span>;
}

function IconBtn({ children, onClick, title, danger }) {
  return <button className={`icon-btn ${danger ? "icon-btn--danger" : ""}`} onClick={onClick} title={title}>{children}</button>;
}

const Icon = {
  ficha: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4h11l3 3v13H5z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>,
  audit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  ai: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/></svg>,
  block: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3 6.5 7 .8-5.2 4.8L18 21l-6-3.5L6 21l1.2-6.9L2 9.3l7-.8z"/></svg>,
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  upload: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  whatsapp: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4A11 11 0 0 0 4 19l-1 5 5-1A11 11 0 1 0 20 4zm-8 18a9 9 0 0 1-4.6-1.3l-.3-.2-3 .6.7-2.9-.2-.3A9 9 0 1 1 12 22zm5.2-6.7c-.3-.1-1.7-.8-1.9-.9s-.5-.2-.6.1-.7.9-.9 1.1-.3.2-.6 0a7.4 7.4 0 0 1-2.1-1.3 8 8 0 0 1-1.5-1.8c-.2-.3 0-.5.1-.6l.4-.4a3 3 0 0 0 .3-.5.4.4 0 0 0 0-.4l-.8-2c-.2-.5-.5-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-1 2.3 5.3 5.3 0 0 0 1.2 3 12.4 12.4 0 0 0 4.8 4.2 16 16 0 0 0 1.6.6 4 4 0 0 0 1.8.1 3 3 0 0 0 1.9-1.3 2.4 2.4 0 0 0 .2-1.3z"/></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.1"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-12"/></svg>,
  drag: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>,
  fire: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,
};

// ===== Modal =====
function Modal({ open, onClose, children, size = "lg", title, footer }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className={`modal modal--${size}`} onClick={(e) => e.stopPropagation()}>
        {title && <div className="modal__header"><h3>{title}</h3><IconBtn onClick={onClose} title="Fechar">{Icon.close}</IconBtn></div>}
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}

// ===== Image placeholder =====
function DishImage({ url, name, size = "md" }) {
  const seed = (name || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue = (seed * 7) % 360;
  return (
    <div
      className={`dish-img dish-img--${size}`}
      style={url ? { backgroundImage: `url(${url})` } : { background: `linear-gradient(135deg, oklch(0.34 0.04 ${hue}), oklch(0.22 0.03 ${(hue + 40) % 360}))` }}
    >
      {!url && <span className="dish-img__placeholder">sem foto</span>}
    </div>
  );
}

// ===== Confirm =====
function useConfirm() {
  const [state, setState] = useState(null);
  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setState({ ...opts, resolve });
      }),
    []
  );
  const node = state ? (
    <Modal
      open={true}
      onClose={() => { state.resolve(false); setState(null); }}
      title={state.title}
      size="sm"
      footer={
        <>
          <Btn kind="ghost" onClick={() => { state.resolve(false); setState(null); }}>Cancelar</Btn>
          <Btn kind={state.danger ? "danger" : "primary"} onClick={() => { state.resolve(true); setState(null); }}>
            {state.confirmLabel || "Confirmar"}
          </Btn>
        </>
      }
    >
      <p style={{ color: "var(--text-dim)", lineHeight: 1.5 }}>{state.message}</p>
    </Modal>
  ) : null;
  return [confirm, node];
}

Object.assign(window, {
  StoreProvider, useStore, Btn, Badge, IconBtn, Icon, Modal, DishImage, useConfirm,
});
