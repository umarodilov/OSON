import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import "./App.css";

const money = (n) => `${Number(n || 0)} см`;
const onlyDigits = (v) => String(v ?? "").replace(/[^\d]/g, "");
const n = (x) => Number(x || 0);

export default function POS() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [q, setQ] = useState("");
    const [selectedCat, setSelectedCat] = useState("all");
    const [showFav, setShowFav] = useState(false);

    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const [errMsg, setErrMsg] = useState("");

    // ===== NEW: split payments + credit =====
    const [payCashAmt, setPayCashAmt] = useState(""); // string digits
    const [payDcAmt, setPayDcAmt] = useState(""); // string digits
    const [isCredit, setIsCredit] = useState(false);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD
    const [note, setNote] = useState("");

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

    const total = useMemo(
        () => cart.reduce((sum, it) => sum + n(it.price) * n(it.qty), 0),
        [cart]
    );

    const paidFront = useMemo(() => {
        const c = n(payCashAmt);
        const d = n(payDcAmt);
        return c + d;
    }, [payCashAmt, payDcAmt]);

    const balanceFront = useMemo(() => {
        const b = total - paidFront;
        return b > 0 ? b : 0;
    }, [total, paidFront]);

    const overpaid = useMemo(() => paidFront > total, [paidFront, total]);

    function logout() {
        localStorage.removeItem("token");   // ё номи токени ту
        localStorage.removeItem("user");    // агар user нигоҳ дорӣ
        window.location.href = "/login";    // ё navigate("/login")
    }
    function addToCart(p) {
        setCart((prev) => {
            const ex = prev.find((x) => x._id === p._id);
            if (ex)
                return prev.map((x) =>
                    x._id === p._id ? { ...x, qty: n(x.qty) + 1 } : x
                );
            return [...prev, { ...p, qty: 1 }];
        });
    }

    function inc(id) {
        setCart((prev) =>
            prev.map((x) => (x._id === id ? { ...x, qty: n(x.qty) + 1 } : x))
        );
    }

    function dec(id) {
        setCart((prev) =>
            prev
                .map((x) => (x._id === id ? { ...x, qty: n(x.qty) - 1 } : x))
                .filter((x) => n(x.qty) > 0)
        );
    }

    function removeItem(id) {
        setCart((prev) => prev.filter((x) => x._id !== id));
    }

    function clearCart() {
        setCart([]);
    }

    // Reset pay fields when cart becomes empty (or when new sale starts)
    useEffect(() => {
        if (cart.length === 0) {
            setPayCashAmt("");
            setPayDcAmt("");
            setIsCredit(false);
            setCustomerName("");
            setCustomerPhone("");
            setDueDate("");
            setNote("");
        }
    }, [cart.length]);

    function setFullCash() {
        setPayCashAmt(String(total || 0));
        setPayDcAmt("");
    }
    function setFullDc() {
        setPayDcAmt(String(total || 0));
        setPayCashAmt("");
    }
    function setHalfHalf() {
        const half = Math.floor(n(total) / 2);
        setPayCashAmt(String(half));
        setPayDcAmt(String(n(total) - half));
    }

    async function pay() {
        if (cart.length === 0) return;

        setPaying(true);
        setErrMsg("");

        try {
            const cash = n(payCashAmt);
            const dc = n(payDcAmt);

            if (cash < 0 || dc < 0) throw new Error("Сумма нодуруст аст.");
            if (cash === 0 && dc === 0 && !isCredit)
                throw new Error("Суммаи пардохтро ворид кунед ё 'Насия'-ро фаъол кунед.");
            if (cash + dc > total) throw new Error("Пардохт аз суммаи умумӣ зиёд аст.");

            // Агар насия НЕ бошад → бояд 100% пардохт шавад
            if (!isCredit && cash + dc !== total) {
                throw new Error("Агар насия набошад, Нақд + DC бояд ба Ҷамъ баробар бошад.");
            }

            // Агар насия бошад ва пардохт 0 аст → беҳтар аст маълумоти муштарӣ пур бошад
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

    return (
        <>
            <div className="topbar">
                <div className="topbar-inner">
                    <div className="brand">
                        <div className="logo">O</div>
                        <div>
                            <h1>OSON POS</h1>
                            <p>SUPER FAST • Мағозаи омехта</p>
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btnDanger" onClick={logout}>
                            Баромадан
                        </button>

                        <button className="btn" onClick={loadAll}>
                            ⟳ Навсозӣ
                        </button>

                        <button className="btn" onClick={clearCart}>
                            🧺 Тоза
                        </button>
                    </div>
                </div>

                <div className="filters">
                    <input
                        className="input"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ: мех / лампа / аристон…"
                    />

                    <select
                        className="select"
                        value={selectedCat}
                        onChange={(e) => setSelectedCat(e.target.value)}
                    >
                        <option value="all">Ҳама категорияҳо</option>
                        {categories.map((c) => (
                            <option key={c._id} value={c._id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <button className="btn" onClick={() => setShowFav((v) => !v)}>
                        ⭐ Favorites {favCount ? `(${favCount})` : ""} {showFav ? "— ON" : ""}
                    </button>
                </div>

                {errMsg ? <div className="errorBox">{errMsg}</div> : null}
            </div>

            <div className="container">
                <div className="grid">
                    <div className="card">
                        <div className="cardTitle">
                            <div style={{ fontWeight: 800 }}>Молҳо</div>
                            <div className="muted">
                                {loading ? "бор…" : `${filtered.length} адад`}
                            </div>
                        </div>

                        <div className="products">
                            {filtered.map((p) => {
                                const stock = n(p.stock);
                                const low = stock <= 5;
                                const catName =
                                    typeof p.categoryId === "object" ? p.categoryId?.name : "";

                                return (
                                    <button
                                        key={p._id}
                                        className="productBtn"
                                        onClick={() => addToCart(p)}
                                    >
                                        <div className="productTop">
                                            <div style={{ minWidth: 0 }}>
                                                <p className="productName">{p.name}</p>
                                                <div className="badges">
                                                    <span className="badge">{money(p.price)}</span>
                                                    {catName ? (
                                                        <span className="badge">{catName}</span>
                                                    ) : null}
                                                    <span
                                                        className={`badge ${
                                                            low ? "badgeLow" : "badgeOk"
                                                        }`}
                                                    >
                            Склад: {stock} {low ? "⚠️" : ""}
                          </span>
                                                    {p.favorite ? <span className="badge">⭐</span> : null}
                                                </div>
                                            </div>
                                            <div className="addChip">+ Илова</div>
                                        </div>
                                    </button>
                                );
                            })}

                            {!loading && filtered.length === 0 ? (
                                <div
                                    className="card"
                                    style={{ gridColumn: "1 / -1", background: "#f8fafc" }}
                                >
                                    Мол ёфт нашуд.
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="card">
                        <div className="cardTitle">
                            <div style={{ fontWeight: 800 }}>Сабад</div>
                            <button className="btn" onClick={clearCart}>
                                Тоза
                            </button>
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
                                            <button
                                                className="removeBtn"
                                                onClick={() => removeItem(it._id)}
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="qtyRow">
                                            <button className="qtyBtn" onClick={() => dec(it._id)}>
                                                −
                                            </button>
                                            <button className="qtyBtn" onClick={() => inc(it._id)}>
                                                +
                                            </button>
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

                            {/* ===== NEW: Split payment UI ===== */}
                            {cart.length > 0 ? (
                                <div
                                    className="card"
                                    style={{ background: "#f8fafc", marginTop: 10 }}
                                >
                                    <div style={{ display: "grid", gap: 8 }}>
                                        <div
                                            style={{
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: 8,
                                            }}
                                        >
                                            <div>
                                                <div className="muted">Нақд (см)</div>
                                                <input
                                                    className="input"
                                                    inputMode="numeric"
                                                    value={payCashAmt}
                                                    onChange={(e) =>
                                                        setPayCashAmt(onlyDigits(e.target.value))
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
                                                        setPayDcAmt(onlyDigits(e.target.value))
                                                    }
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                            <button className="btn" type="button" onClick={setFullCash}>
                                                100% Нақд
                                            </button>
                                            <button className="btn" type="button" onClick={setFullDc}>
                                                100% DC
                                            </button>
                                            <button className="btn" type="button" onClick={setHalfHalf}>
                                                50/50
                                            </button>
                                            <button
                                                className="btn"
                                                type="button"
                                                onClick={() => {
                                                    setPayCashAmt("");
                                                    setPayDcAmt("");
                                                }}
                                            >
                                                Тоза сумма
                                            </button>
                                        </div>

                                        <label
                                            style={{
                                                display: "flex",
                                                gap: 8,
                                                alignItems: "center",
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isCredit}
                                                onChange={(e) => setIsCredit(e.target.checked)}
                                            />
                                            <span>Насия (қисмеаш баъд дода мешавад)</span>
                                        </label>

                                        {isCredit ? (
                                            <div
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "1fr 1fr",
                                                    gap: 8,
                                                }}
                                            >
                                                <input
                                                    className="input"
                                                    value={customerName}
                                                    onChange={(e) => setCustomerName(e.target.value)}
                                                    placeholder="Номи харидор *"
                                                />
                                                <input
                                                    className="input"
                                                    value={customerPhone}
                                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                                    placeholder="Телефон *"
                                                />
                                                <input
                                                    className="input"
                                                    type="date"
                                                    value={dueDate}
                                                    onChange={(e) => setDueDate(e.target.value)}
                                                    style={{ gridColumn: "1 / -1" }}
                                                />
                                            </div>
                                        ) : null}

                                        <input
                                            className="input"
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="Эзоҳ (ихтиёрӣ)"
                                        />

                                        {overpaid ? (
                                            <div className="errorBox">
                                                ❌ Пардохт аз суммаи умумӣ зиёд аст.
                                            </div>
                                        ) : null}

                                        <div className="muted">
                                            Пардохтшуда: <b>{money(paidFront)}</b> • Қарз:{" "}
                                            <b>{money(balanceFront)}</b>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <button
                                className={`btn btnPrimary ${
                                    cart.length === 0 || paying || overpaid ? "btnDisabled" : ""
                                }`}
                                style={{
                                    width: "100%",
                                    marginTop: 10,
                                    padding: 14,
                                    borderRadius: 16,
                                }}
                                onClick={pay}
                                disabled={cart.length === 0 || paying || overpaid}
                            >
                                {paying ? "…Сабт" : isCredit ? "САБТ (НАСИЯ)" : "ПАРДОХТ (ПУРРА)"}
                            </button>

                            <div className="muted" style={{ marginTop: 10 }}>
                                Пас аз сабт, аз склад кам карда мешавад. (DC + Нақд + Насия
                                дастгирӣ мешавад)
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer">OSON • MVP POS • 2 клик — фурӯш</div>
            </div>
        </>
    );
}