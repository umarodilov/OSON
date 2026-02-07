import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

const money = (n) => `${Number(n || 0)} см`;
const onlyDigits = (v) => String(v ?? "").replace(/[^\d]/g, "");
const n = (x) => Number(x || 0);

const LS_KEY = "oson_pos_sales_v1";

function makeSaleSession(index) {
    return {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        title: `Клиент ${index}`,
        cart: [],

        // payments + credit fields (per window)
        payCashAmt: "",
        payDcAmt: "",
        isCredit: false,
        customerName: "",
        customerPhone: "",
        dueDate: "",
        note: "",
    };
}

export default function POS() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [q, setQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("all");
    const [showFav, setShowFav] = useState(false);

    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    // ===== Multi-windows (up to 5) with persistence =====
    const [sales, setSales] = useState(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return [makeSaleSession(1)];
            const parsed = JSON.parse(raw);
            const arr = Array.isArray(parsed?.sales) ? parsed.sales : null;
            if (!arr || arr.length === 0) return [makeSaleSession(1)];

            // restore (max 5), fill missing fields safely
            return arr.slice(0, 5).map((s, i) => ({
                ...makeSaleSession(i + 1),
                ...s,
                title: s?.title || `Клиент ${i + 1}`,
                cart: Array.isArray(s?.cart) ? s.cart : [],
                payCashAmt: String(s?.payCashAmt ?? ""),
                payDcAmt: String(s?.payDcAmt ?? ""),
                isCredit: !!s?.isCredit,
                customerName: String(s?.customerName ?? ""),
                customerPhone: String(s?.customerPhone ?? ""),
                dueDate: String(s?.dueDate ?? ""),
                note: String(s?.note ?? ""),
            }));
        } catch {
            return [makeSaleSession(1)];
        }
    });

    const [activeSaleId, setActiveSaleId] = useState(() => {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.activeSaleId || null;
        } catch {
            return null;
        }
    });

    // ===== Pagination =====
    const [page, setPage] = useState(1);
    const pageSize = 10;

    // Ensure active sale exists
    useEffect(() => {
        if (!activeSaleId && sales[0]?.id) setActiveSaleId(sales[0].id);
    }, [activeSaleId, sales]);

    // Persist to localStorage on any change
    useEffect(() => {
        try {
            localStorage.setItem(
                LS_KEY,
                JSON.stringify({
                    sales: sales.slice(0, 5),
                    activeSaleId: activeSaleId || (sales[0]?.id ?? null),
                })
            );
        } catch (e) {
            console.warn("localStorage save failed:", e);
        }
    }, [sales, activeSaleId]);

    const activeSale = useMemo(() => {
        return sales.find((s) => s.id === activeSaleId) || sales[0] || null;
    }, [sales, activeSaleId]);

    const cart = activeSale?.cart || [];
    const payCashAmt = activeSale?.payCashAmt ?? "";
    const payDcAmt = activeSale?.payDcAmt ?? "";
    const isCredit = !!activeSale?.isCredit;
    const customerName = activeSale?.customerName ?? "";
    const customerPhone = activeSale?.customerPhone ?? "";
    const dueDate = activeSale?.dueDate ?? "";
    const note = activeSale?.note ?? "";

    function updateActiveSale(updater) {
        setSales((prev) => {
            const idx = prev.findIndex((s) => s.id === activeSaleId);
            if (idx === -1) return prev;
            const copy = [...prev];
            copy[idx] = updater(copy[idx]);
            return copy;
        });
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
    }

    async function loadAll() {
        setLoading(true);
        setErrMsg("");
        try {
            const [pRes, cRes] = await Promise.all([
                api.get("/api/products"),
                api.get("/api/categories"),
            ]);
            setProducts(pRes.data || []);
            setCategories(cRes.data || []);
        } catch (e) {
            console.error(e);
            setErrMsg(
                e?.response?.data?.message ||
                e?.message ||
                "Хатои гирифтани маълумот (API URL / Backend)."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadAll();
    }, []);

    // ===== windows actions =====
    function newWindow() {
        setErrMsg("");
        setSales((prev) => {
            if (prev.length >= 5) return prev;
            const created = makeSaleSession(prev.length + 1);
            // set active immediately
            setActiveSaleId(created.id);
            return [...prev, created];
        });
    }

    function switchWindow(id) {
        setActiveSaleId(id);
    }

    function closeWindow(id) {
        if (sales.length <= 1) return;

        const target = sales.find((s) => s.id === id);
        const count = (target?.cart || []).reduce((a, it) => a + n(it.qty), 0);

        if (!window.confirm(`Окноро пӯшам? Сабад гум мешавад. (${count} адад)`)) return;

        setSales((prev) => {
            const next = prev.filter((s) => s.id !== id);

            // re-number titles cleanly
            const renumbered = next.map((s, i) => ({ ...s, title: `Клиент ${i + 1}` }));

            // if active removed -> set first as active
            const stillExists = renumbered.find((s) => s.id === activeSaleId);
            if (!stillExists) setActiveSaleId(renumbered[0]?.id || null);

            return renumbered.length ? renumbered : [makeSaleSession(1)];
        });
    }

    // ===== product filter =====
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return (products || [])
            .filter((p) => (showFav ? !!p.favorite : true))
            .filter((p) => {
                if (selectedCat === "all") return true;
                const catId =
                    typeof p.categoryId === "object" ? p.categoryId?._id : p.categoryId;
                return String(catId) === String(selectedCat);
            })
            .filter((p) => {
                if (!s) return true;
                return (p.name || "").toLowerCase().includes(s);
            });
    }, [products, q, selectedCat, showFav]);

    useEffect(() => {
        setPage(1);
    }, [q, selectedCat, showFav]);

    const pageCount = useMemo(() => {
        const pc = Math.ceil(filtered.length / pageSize);
        return pc > 0 ? pc : 1;
    }, [filtered.length]);

    const paged = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filtered.slice(start, start + pageSize);
    }, [filtered, page]);

    const total = useMemo(
        () => cart.reduce((sum, it) => sum + n(it.price) * n(it.qty), 0),
        [cart]
    );

    const paidFront = useMemo(() => n(payCashAmt) + n(payDcAmt), [payCashAmt, payDcAmt]);

    const balanceFront = useMemo(() => {
        const b = total - paidFront;
        return b > 0 ? b : 0;
    }, [total, paidFront]);

    const overpaid = useMemo(() => paidFront > total, [paidFront, total]);

    // ===== cart functions (same names) =====
    function addToCart(p) {
        updateActiveSale((sale) => {
            const prev = sale.cart || [];
            const ex = prev.find((x) => x._id === p._id);
            const nextCart = ex
                ? prev.map((x) => (x._id === p._id ? { ...x, qty: n(x.qty) + 1 } : x))
                : [...prev, { ...p, qty: 1 }];
            return { ...sale, cart: nextCart };
        });
    }

    function inc(id) {
        updateActiveSale((sale) => ({
            ...sale,
            cart: (sale.cart || []).map((x) =>
                x._id === id ? { ...x, qty: n(x.qty) + 1 } : x
            ),
        }));
    }

    function dec(id) {
        updateActiveSale((sale) => ({
            ...sale,
            cart: (sale.cart || [])
                .map((x) => (x._id === id ? { ...x, qty: n(x.qty) - 1 } : x))
                .filter((x) => n(x.qty) > 0),
        }));
    }

    function removeItem(id) {
        updateActiveSale((sale) => ({
            ...sale,
            cart: (sale.cart || []).filter((x) => x._id !== id),
        }));
    }

    function clearCart() {
        updateActiveSale((sale) => ({
            ...sale,
            cart: [],
            payCashAmt: "",
            payDcAmt: "",
            isCredit: false,
            customerName: "",
            customerPhone: "",
            dueDate: "",
            note: "",
        }));
    }

    function setFullCash() {
        updateActiveSale((sale) => ({
            ...sale,
            payCashAmt: String(total || 0),
            payDcAmt: "",
        }));
    }
    function setFullDc() {
        updateActiveSale((sale) => ({
            ...sale,
            payDcAmt: String(total || 0),
            payCashAmt: "",
        }));
    }
    function setHalfHalf() {
        const half = Math.floor(n(total) / 2);
        updateActiveSale((sale) => ({
            ...sale,
            payCashAmt: String(half),
            payDcAmt: String(n(total) - half),
        }));
    }

    async function pay() {
        if (!activeSale || cart.length === 0) return;

        setPaying(true);
        setErrMsg("");

        try {
            const cash = n(payCashAmt);
            const dc = n(payDcAmt);

            if (cash < 0 || dc < 0) throw new Error("Сумма нодуруст аст.");
            if (cash === 0 && dc === 0 && !isCredit)
                throw new Error("Суммаи пардохтро ворид кунед ё 'Насия'-ро фаъол кунед.");
            if (cash + dc > total) throw new Error("Пардохт аз суммаи умумӣ зиёд аст.");

            // no credit => must pay full
            if (!isCredit && cash + dc !== total) {
                throw new Error("Агар насия набошад, Нақд + DC бояд ба Ҷамъ баробар бошад.");
            }

            // credit => must have customer data
            if (isCredit) {
                if (!customerName.trim() || !customerPhone.trim()) {
                    throw new Error("Барои насия: Ном ва Телефонро ҳатман пур кунед.");
                }
            }

            const payments = [];
            if (cash > 0) payments.push({ method: "cash", amount: cash });
            if (dc > 0) payments.push({ method: "dc", amount: dc });

            const payload = {
                items: cart.map((i) => ({ productId: i._id, qty: i.qty })),
                payments,
                customerName: isCredit ? customerName.trim() : "",
                customerPhone: isCredit ? customerPhone.trim() : "",
                dueDate: isCredit && dueDate ? dueDate : null,
                note: (isCredit ? "Насия. " : "") + (note?.trim() || ""),
            };

            const res = await api.post("/api/sales", payload);

            // clear only current window
            clearCart();
            await loadAll();

            const t = res?.data?.total ?? total;
            const paid = res?.data?.paidTotal ?? (cash + dc);
            const bal = res?.data?.balance ?? Math.max(0, t - paid);

            alert(
                `✅ Фурӯш сабт шуд.\nҶамъ: ${money(t)}\nПардохт: ${money(
                    paid
                )}\nҚарз: ${money(bal)}`
            );
        } catch (e) {
            console.error("PAY ERROR:", e);
            const msg =
                e?.response?.data?.message ||
                e?.message ||
                "Хатои пардохт (Backend / URL / Payload).";
            setErrMsg(msg);
            alert("❌ " + msg);
        } finally {
            setPaying(false);
        }
    }

    const favCount = useMemo(
        () => products.filter((p) => p.favorite).length,
        [products]
    );

    function goPrev() {
        setPage((p) => (p > 1 ? p - 1 : 1));
    }
    function goNext() {
        setPage((p) => (p < pageCount ? p + 1 : p));
    }
    function goPage(pn) {
        const x = n(pn);
        if (x < 1) return setPage(1);
        if (x > pageCount) return setPage(pageCount);
        setPage(x);
    }

    const pageNumbers = useMemo(() => {
        const max = 5;
        const half = Math.floor(max / 2);
        let start = Math.max(1, page - half);
        let end = Math.min(pageCount, start + max - 1);
        start = Math.max(1, end - max + 1);
        const arr = [];
        for (let i = start; i <= end; i++) arr.push(i);
        return arr;
    }, [page, pageCount]);

    return (
        <>
            <div className="topbar">
                <div className="topbar-inner">
                    <div className="brand">
                        <div className="logo">O</div>
                        <div>
                            <h1>OSON POS</h1>
                            <button className="btn btnLogout" onClick={logout} aria-label="Logout">
                                <span className="text">Баромадан</span>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn" onClick={loadAll}>⟳ Навсозӣ</button>
                        <button className="btn" onClick={clearCart}>🧺 Тоза</button>
                    </div>
                </div>

                {/* ===== Windows (Clients) ===== */}
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 12px 10px" }}>
                    <div className="catRow">
                        {sales.map((s) => {
                            const isActive = s.id === activeSaleId;
                            const count = (s.cart || []).reduce((a, it) => a + n(it.qty), 0);
                            return (
                                <button
                                    key={s.id}
                                    className={`catPill ${isActive ? "catPillActive" : ""}`}
                                    onClick={() => switchWindow(s.id)}
                                    title={s.title}
                                >
                                    {s.title}{count ? ` (${count})` : ""}
                                </button>
                            );
                        })}

                        <button className="catPill" onClick={newWindow} disabled={sales.length >= 5}>
                            + Клиент
                        </button>

                        {sales.length > 1 ? (
                            <button className="catPill" onClick={() => closeWindow(activeSaleId)} title="Пӯшидан">
                                ✕ Пӯшидан
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="filters">
                    <input
                        className="input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ: мех / лампа / аристон…"
                    />

                    <button className="btn" onClick={() => setShowFav((v) => !v)}>
                        ⭐ Favorites {favCount ? `(${favCount})` : ""} {showFav ? "— ON" : ""}
                    </button>
                </div>

                {errMsg ? <div className="errorBox">{errMsg}</div> : null}
            </div>

            <div className="container">
                <div className="grid">
                    {/* ===== Products ===== */}
                    <div className="card">
                        <div className="cardTitle">
                            <div style={{ fontWeight: 800 }}>Молҳо</div>
                            <div className="muted">{loading ? "бор…" : `${filtered.length} адад`}</div>
                        </div>

                        {/* Categories */}
                        <div className="catRow">
                            <button
                                className={`catPill ${selectedCat === "all" ? "catPillActive" : ""}`}
                                onClick={() => setSelectedCat("all")}
                            >
                                Ҳама
                            </button>
                            {categories.map((c) => (
                                <button
                                    key={c._id}
                                    className={`catPill ${String(selectedCat) === String(c._id) ? "catPillActive" : ""}`}
                                    onClick={() => setSelectedCat(c._id)}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>

                        <div className="products">
                            {paged.map((p) => {
                                const stock = n(p.stock);
                                const low = stock <= 5;

                                return (
                                    <button key={p._id} className="productBtn" onClick={() => addToCart(p)}>
                                        <div className="productMobileTop">
                                            <div className="productMobileName">{p.name}</div>
                                            <div className="productMobilePrice">{money(p.price)}</div>
                                        </div>

                                        <div className="productMobileMeta">
                      <span className={`miniBadge ${low ? "miniBadgeLow" : "miniBadgeOk"}`}>
                        Склад: {stock} {low ? "⚠️" : ""}
                      </span>
                                            {p.favorite ? <span className="miniBadge">⭐</span> : null}
                                        </div>

                                        <div className="productMobileAdd">+ Илова</div>
                                    </button>
                                );
                            })}

                            {!loading && filtered.length === 0 ? (
                                <div className="card" style={{ gridColumn: "1 / -1", background: "#f8fafc" }}>
                                    Мол ёфт нашуд.
                                </div>
                            ) : null}
                        </div>

                        {filtered.length > pageSize ? (
                            <div className="pager">
                                <button className={`btn ${page === 1 ? "btnDisabled" : ""}`} onClick={goPrev} disabled={page === 1}>
                                    ←
                                </button>

                                {pageNumbers[0] > 1 ? (
                                    <>
                                        <button className="btn" onClick={() => goPage(1)}>1</button>
                                        <span className="muted">…</span>
                                    </>
                                ) : null}

                                {pageNumbers.map((pn) => (
                                    <button
                                        key={pn}
                                        className={`btn ${pn === page ? "btnPrimary" : ""}`}
                                        onClick={() => goPage(pn)}
                                    >
                                        {pn}
                                    </button>
                                ))}

                                {pageNumbers[pageNumbers.length - 1] < pageCount ? (
                                    <>
                                        <span className="muted">…</span>
                                        <button className="btn" onClick={() => goPage(pageCount)}>{pageCount}</button>
                                    </>
                                ) : null}

                                <button
                                    className={`btn ${page === pageCount ? "btnDisabled" : ""}`}
                                    onClick={goNext}
                                    disabled={page === pageCount}
                                >
                                    →
                                </button>

                                <div className="muted" style={{ marginLeft: "auto" }}>
                                    {page} / {pageCount}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* ===== Cart (Active window) ===== */}
                    <div className="card">
                        <div className="cardTitle">
                            <div style={{ fontWeight: 800 }}>Сабад — {activeSale?.title || "Клиент"}</div>
                            <button className="btn" onClick={clearCart}>Тоза</button>
                        </div>

                        {cart.length === 0 ? (
                            <div className="card" style={{ background: "#f8fafc" }}>
                                Сабад холӣ аст. Молро пахш кун → ба сабад меояд.
                            </div>
                        ) : (
                            <div>
                                {cart.map((it) => (
                                    <div key={it._id} className="cartItem">
                                        <div className="cartRow">
                                            <div style={{ minWidth: 0 }}>
                                                <p className="cartName">{it.name}</p>
                                                <div className="cartMeta">
                                                    {money(it.price)} × {it.qty} ={" "}
                                                    <b>{money(n(it.price) * n(it.qty))}</b>
                                                </div>
                                            </div>
                                            <button className="removeBtn" onClick={() => removeItem(it._id)}>✕</button>
                                        </div>

                                        <div className="qtyRow">
                                            <button className="qtyBtn" onClick={() => dec(it._id)}>−</button>
                                            <button className="qtyBtn" onClick={() => inc(it._id)}>+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="totalBox">
                            <div className="totalRow">
                                <span className="totalLabel">Ҷамъ:</span>
                                <span className="totalValue">{money(total)}</span>
                            </div>

                            {cart.length > 0 ? (
                                <div className="card" style={{ background: "#f8fafc", marginTop: 10 }}>
                                    <div style={{ display: "grid", gap: 8 }}>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                            <div>
                                                <div className="muted">Нақд (см)</div>
                                                <input
                                                    className="input"
                                                    inputMode="numeric"
                                                    value={payCashAmt}
                                                    onChange={(e) =>
                                                        updateActiveSale((sale) => ({ ...sale, payCashAmt: onlyDigits(e.target.value) }))
                                                    }
                                                    placeholder="0"
                                                />
                                            </div>

                                            <div>
                                                <div className="muted">DC (см)</div>
                                                <input
                                                    className="input"
                                                    inputMode="numeric"
                                                    value={payDcAmt}
                                                    onChange={(e) =>
                                                        updateActiveSale((sale) => ({ ...sale, payDcAmt: onlyDigits(e.target.value) }))
                                                    }
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button className="btn" type="button" onClick={setFullCash}>100% Нақд</button>
                                            <button className="btn" type="button" onClick={setFullDc}>100% DC</button>
                                            <button className="btn" type="button" onClick={setHalfHalf}>50/50</button>
                                            <button
                                                className="btn"
                                                type="button"
                                                onClick={() => updateActiveSale((sale) => ({ ...sale, payCashAmt: "", payDcAmt: "" }))}
                                            >
                                                Тоза сумма
                                            </button>
                                        </div>

                                        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                            <input
                                                type="checkbox"
                                                checked={isCredit}
                                                onChange={(e) => updateActiveSale((sale) => ({ ...sale, isCredit: e.target.checked }))}
                                            />
                                            <span>Насия (қисмеаш баъд дода мешавад)</span>
                                        </label>

                                        {isCredit ? (
                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                                <input
                                                    className="input"
                                                    value={customerName}
                                                    onChange={(e) => updateActiveSale((sale) => ({ ...sale, customerName: e.target.value }))}
                                                    placeholder="Номи харидор *"
                                                />
                                                <input
                                                    className="input"
                                                    value={customerPhone}
                                                    onChange={(e) => updateActiveSale((sale) => ({ ...sale, customerPhone: e.target.value }))}
                                                    placeholder="Телефон *"
                                                />
                                                <input
                                                    className="input"
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => updateActiveSale((sale) => ({ ...sale, dueDate: e.target.value }))}
                                                    style={{ gridColumn: "1 / -1" }}
                                                />
                                            </div>
                                        ) : null}

                                        <input
                                            className="input"
                                            value={note}
                                            onChange={(e) => updateActiveSale((sale) => ({ ...sale, note: e.target.value }))}
                                            placeholder="Эзоҳ (ихтиёрӣ)"
                                        />

                                        {overpaid ? (
                                            <div className="errorBox">❌ Пардохт аз суммаи умумӣ зиёд аст.</div>
                                        ) : null}

                                        <div className="muted">
                                            Пардохтшуда: <b>{money(paidFront)}</b> • Қарз:{" "}
                                            <b>{money(balanceFront)}</b>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <button
                                className={`btn btnPrimary ${cart.length === 0 || paying || overpaid ? "btnDisabled" : ""}`}
                                style={{ width: "100%", marginTop: 10, padding: 14, borderRadius: 16 }}
                                onClick={pay}
                                disabled={cart.length === 0 || paying || overpaid}
                            >
                                {paying ? "…Сабт" : isCredit ? "САБТ (НАСИЯ)" : "ПАРДОХТ (ПУРРА)"}
                            </button>

                            <div className="muted" style={{ marginTop: 10 }}>
                                Пас аз сабт, аз склад кам карда мешавад. (DC + Нақд + Насия дастгирӣ мешавад)
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer">OSON • MVP POS • 2 клик — фурӯш</div>
            </div>
        </>
    );
}
