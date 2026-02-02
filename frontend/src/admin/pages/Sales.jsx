import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function money(n) {
    return `${Number(n || 0).toLocaleString("ru-RU")} см`;
}

function statusTJ(status) {
    const s = String(status || "").toLowerCase();
    if (s === "paid") return "Пурра пардохт";
    if (s === "partial") return "Қисман пардохт";
    if (s === "credit") return "Насия";
    return "—";
}

function Badge({ status }) {
    const s = String(status || "").toLowerCase();
    const cls = s === "paid" ? "badgeOk" : "badgeLow";
    return <span className={`badge ${cls}`}>{statusTJ(s)}</span>;
}

function Modal({ title, children, onClose }) {
    return (
        <div className="modalBack" onMouseDown={onClose}>
            <div className="modal modalResponsive" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modalHead">
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <button className="btn" onClick={onClose}>✕</button>
                </div>
                <div className="modalBody">{children}</div>
            </div>
        </div>
    );
}

function SaleCard({ s, onPay }) {
    const idShort = String(s._id || "").slice(-6);
    const hasDebt = Number(s.balance || 0) > 0;

    return (
        <div className="sCard">
            <div className="sTop">
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000 }}>
                        {s.customerName || "— Ном нест —"}
                    </div>
                    <div className="muted" style={{ marginTop: 2 }}>
                        {s.customerPhone || "— Телефон нест —"}
                    </div>
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                        ID: {idShort}
                    </div>
                </div>

                <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                    <Badge status={s.status} />
                    <div style={{ fontWeight: 1000 }}>{money(s.balance)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>Қарз</div>
                </div>
            </div>

            <div className="sMeta">
                <span className="sChip">Ҷамъ: <b>{money(s.total)}</b></span>
                <span className="sChip">Пардохт: <b>{money(s.paidTotal)}</b></span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                {hasDebt ? (
                    <button className="btn btnPrimary" onClick={() => onPay(s)}>
                        + Пардохт
                    </button>
                ) : (
                    <span className="muted">Қарз нест</span>
                )}
            </div>
        </div>
    );
}

export default function Sales() {
    const [items, setItems] = useState([]);
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");

    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const [payOpen, setPayOpen] = useState(false);
    const [paySale, setPaySale] = useState(null);
    const [payForm, setPayForm] = useState({ method: "cash", amount: "", txnId: "" });

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/sales");
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "GET /api/sales ҳоло дастрас нест");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items
            .filter((x) => (filter === "all" ? true : String(x.status) === filter))
            .filter((x) => {
                if (!s) return true;
                return (
                    String(x.customerName || "").toLowerCase().includes(s) ||
                    String(x.customerPhone || "").toLowerCase().includes(s) ||
                    String(x._id || "").toLowerCase().includes(s)
                );
            });
    }, [items, q, filter]);

    function openPay(sale) {
        setPaySale(sale);
        setPayForm({ method: "cash", amount: String(sale.balance || ""), txnId: "" });
        setPayOpen(true);
    }

    function methodTJ(m) {
        const x = String(m || "").toLowerCase();
        if (x === "cash") return "Нақд";
        if (x === "dc") return "DC";
        if (x === "card") return "Корт";
        if (x === "alif") return "Alif";
        return x;
    }

    async function doPay() {
        try {
            const payload = {
                method: payForm.method,
                amount: Number(payForm.amount || 0),
                txnId: payForm.txnId || "",
            };
            if (payload.amount <= 0) return alert("Сумма нодуруст аст");

            await api.post(`/api/sales/${paySale._id}/pay`, payload);
            setPayOpen(false);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Хатои пардохт");
        }
    }

    return (
        <div className="card">
            <div className="salesHeader">
                <b>Фурӯшҳо</b>

                <div className="salesActions">
                    <input
                        className="input salesSearch"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ (ном/тел/ID)"
                    />

                    <select className="select salesSelect" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">Ҳама</option>
                        <option value="paid">Пурра пардохт</option>
                        <option value="partial">Қисман пардохт</option>
                        <option value="credit">Насия</option>
                    </select>

                    <button className="btn" onClick={load} disabled={loading}>
                        {loading ? "..." : "⟳"}
                    </button>
                </div>
            </div>

            {err ? <div className="errorBox">{err}</div> : null}

            {/* Desktop table */}
            <div className="salesTableWrap">
                <table className="table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Мизоҷ</th>
                        <th>Ҳолат</th>
                        <th>Ҷамъ</th>
                        <th>Пардохт</th>
                        <th>Қарз</th>
                        <th style={{ textAlign: "right" }}>Амалиёт</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((s) => (
                        <tr key={s._id}>
                            <td className="muted">{String(s._id).slice(-6)}</td>
                            <td>
                                <div style={{ fontWeight: 800 }}>{s.customerName || "—"}</div>
                                <div className="muted">{s.customerPhone || ""}</div>
                            </td>
                            <td><Badge status={s.status} /></td>
                            <td>{money(s.total)}</td>
                            <td>{money(s.paidTotal)}</td>
                            <td>{money(s.balance)}</td>
                            <td style={{ textAlign: "right" }}>
                                {Number(s.balance || 0) > 0 ? (
                                    <button className="btn btnPrimary" onClick={() => openPay(s)}>
                                        + Пардохт
                                    </button>
                                ) : (
                                    <span className="muted">—</span>
                                )}
                            </td>
                        </tr>
                    ))}

                    {!loading && filtered.length === 0 ? (
                        <tr><td colSpan="7" className="muted">Холӣ</td></tr>
                    ) : null}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="salesMobileList">
                {filtered.map((s) => (
                    <SaleCard key={s._id} s={s} onPay={openPay} />
                ))}
                {!loading && filtered.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>Холӣ</div>
                ) : null}
            </div>

            {payOpen && (
                <Modal
                    title={`Пардохти қарз • ID: ${String(paySale?._id || "").slice(-6)}`}
                    onClose={() => setPayOpen(false)}
                >
                    <select
                        className="select"
                        value={payForm.method}
                        onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    >
                        <option value="cash">{methodTJ("cash")}</option>
                        <option value="dc">{methodTJ("dc")}</option>
                        <option value="card">{methodTJ("card")}</option>
                        <option value="alif">{methodTJ("alif")}</option>
                    </select>

                    <input
                        className="input"
                        type="number"
                        placeholder="Сумма"
                        value={payForm.amount}
                        onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />

                    <input
                        className="input"
                        placeholder="Рақами транзаксия (ихтиёрӣ)"
                        value={payForm.txnId}
                        onChange={(e) => setPayForm({ ...payForm, txnId: e.target.value })}
                    />

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button className="btn btnPrimary" onClick={doPay}>Сабт</button>
                        <button className="btn" onClick={() => setPayOpen(false)}>Бекор</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
