import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function Card({ title, sub, right, children }) {
    return (
        <div className="card" style={{ position: "relative" }}>
            <div className="cardTitle dashCardTitle">
                <div style={{ minWidth: 0 }}>
                    <b>{title}</b>
                    {sub ? <div className="muted" style={{ marginTop: 2 }}>{sub}</div> : null}
                </div>
                {right ? <div className="dashRight">{right}</div> : null}
            </div>
            {children}
        </div>
    );
}

function Segmented({ value, onChange, options }) {
    return (
        <div className="segmented">
            {options.map((o) => (
                <button
                    key={o.value}
                    className={"segBtn " + (value === o.value ? "segBtnActive" : "")}
                    onClick={() => onChange(o.value)}
                    type="button"
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function formatMoney(x) {
    const n = Number(x || 0);
    return n.toLocaleString("ru-RU");
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(0, 0, 0, 0);
    return d;
}

function LineChart({ points }) {
    // responsive SVG with viewBox
    const w = 520;
    const h = 160;
    const pad = 18;
    const max = Math.max(1, ...points.map((p) => Number(p.value || 0)));

    const toXY = (i, v) => {
        const x = pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
        const y = h - pad - ((Number(v || 0) / max) * (h - pad * 2));
        return { x, y };
    };

    const path = points
        .map((p, i) => {
            const { x, y } = toXY(i, p.value);
            return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");

    return (
        <div className="dashChartBox">
            <svg
                viewBox={`0 0 ${w} ${h}`}
                preserveAspectRatio="none"
                className="dashChartSvg"
            >
                {/* grid */}
                <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="rgba(0,0,0,0.15)" />
                <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(0,0,0,0.15)" />

                {/* path */}
                <path d={path} fill="none" stroke="rgba(0,0,0,0.65)" strokeWidth="2.5" />

                {/* points */}
                {points.map((p, i) => {
                    const { x, y } = toXY(i, p.value);
                    return <circle key={i} cx={x} cy={y} r="3.5" fill="rgba(0,0,0,0.8)" />;
                })}
            </svg>

            <div className="muted dashChartLabels">
                <span>{points[0]?.label}</span>
                <span>{points[points.length - 1]?.label}</span>
            </div>
        </div>
    );
}


function statusTJ(st) {
    const s = String(st || "").toLowerCase();
    if (s === "paid") return "Пурра пардохт";
    if (s === "partial") return "Қисман пардохт";
    if (s === "credit") return "Насия";
    return s || "—";
}

function DebtorCard({ s }) {
    return (
        <div className="dCard">
            <div className="dTop">
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.customerName || "— Ном нест —"}
                    </div>
                    <div className="muted" style={{ marginTop: 2 }}>
                        {s.customerPhone || "— Телефон нест —"}
                    </div>
                </div>
                <div style={{ fontWeight: 1000 }}>
                    {formatMoney(s.balance)}
                </div>
            </div>

            <div className="dMeta">
                <span className="dChip">{statusTJ(s.status)}</span>
                <span className="dChip">
          Муҳлат: {s.dueDate ? new Date(s.dueDate).toLocaleDateString("ru-RU") : "нест"}
        </span>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [range, setRange] = useState(7);
    const [base, setBase] = useState({ products: 0, categories: 0 });
    const [sales, setSales] = useState([]);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function loadAll() {
        setLoading(true);
        setErr("");
        try {
            const [p, c, s] = await Promise.all([
                api.get("/api/products"),
                api.get("/api/categories"),
                api.get("/api/sales"),
            ]);

            setBase({
                products: Array.isArray(p.data) ? p.data.length : 0,
                categories: Array.isArray(c.data) ? c.data.length : 0,
            });

            setSales(Array.isArray(s.data) ? s.data : []);
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "Хатои гирифтани маълумот");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { loadAll(); }, []);

    const salesInRange = useMemo(() => {
        const from = range === 1 ? daysAgo(0) : daysAgo(range - 1);
        return sales.filter((x) => {
            const d = new Date(x.createdAt || x.updatedAt || Date.now());
            return d >= from;
        });
    }, [sales, range]);

    const kpis = useMemo(() => {
        let total = 0;
        let count = 0;

        let paid = 0;
        let credit = 0;
        let partial = 0;

        let paidTotal = 0;
        let debtTotal = 0;

        const methodSum = new Map();
        const addMethod = (m, a) => {
            const key = String(m || "").toLowerCase();
            methodSum.set(key, (methodSum.get(key) || 0) + Number(a || 0));
        };

        for (const s of salesInRange) {
            count += 1;
            total += Number(s.total || 0);

            const st = String(s.status || "").toLowerCase();
            if (st === "paid") paid += 1;
            else if (st === "credit") credit += 1;
            else if (st === "partial") partial += 1;

            paidTotal += Number(s.paidTotal || 0);
            debtTotal += Number(s.balance || 0);

            const pays = Array.isArray(s.payments) ? s.payments : [];
            for (const p of pays) addMethod(p.method, p.amount);
        }

        const topMethods = [...methodSum.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([method, amount]) => ({ method, amount }));

        return {
            total,
            count,
            avg: count ? total / count : 0,
            paid,
            credit,
            partial,
            paidTotal,
            debtTotal,
            topMethods,
        };
    }, [salesInRange]);

    const debtors = useMemo(() => {
        return salesInRange
            .filter((s) => Number(s.balance || 0) > 0)
            .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
            .slice(0, 20);
    }, [salesInRange]);

    const chartPoints = useMemo(() => {
        const days = range === 1 ? 1 : range;
        const from = range === 1 ? daysAgo(0) : daysAgo(range - 1);

        const buckets = new Map();
        for (let i = 0; i < days; i++) {
            const d = new Date(from);
            d.setDate(from.getDate() + i);
            const key = d.toISOString().slice(0, 10);
            buckets.set(key, 0);
        }

        for (const s of salesInRange) {
            const d = startOfDay(new Date(s.createdAt || s.updatedAt || Date.now()));
            const key = d.toISOString().slice(0, 10);
            if (buckets.has(key)) {
                buckets.set(key, (buckets.get(key) || 0) + Number(s.total || 0));
            }
        }

        return [...buckets.entries()].map(([key, val]) => {
            const dd = key.slice(8, 10);
            const mm = key.slice(5, 7);
            return { label: `${dd}.${mm}`, value: val };
        });
    }, [salesInRange, range]);

    return (
        <div className="dashWrap">
            {err ? <div className="errorBox">{err}</div> : null}

            <div className="dashHeader">
                <div>
                    <div className="dashTitle">Нишондиҳандаҳо</div>
                    <div className="muted">Таҳлил: 1 рӯз, 1 ҳафта, 1 моҳ + қарздорҳо</div>
                </div>

                <div className="dashControls">
                    <Segmented
                        value={range}
                        onChange={setRange}
                        options={[
                            { value: 1, label: "1 рӯз" },
                            { value: 7, label: "1 ҳафта" },
                            { value: 30, label: "1 моҳ" },
                        ]}
                    />
                    <button className="btn" onClick={loadAll} disabled={loading}>
                        {loading ? "..." : "⟳ Навсозӣ"}
                    </button>
                </div>
            </div>

            <div className="grid2 dashGrid">
                <Card title="Маҳсулотҳо" sub="ҳама">
                    <div style={{ fontSize: 30, fontWeight: 900 }}>{base.products}</div>
                    <div className="muted">Шумораи умумии маҳсулот</div>
                </Card>

                <Card title="Категорияҳо" sub="ҳама">
                    <div style={{ fontSize: 30, fontWeight: 900 }}>{base.categories}</div>
                    <div className="muted">Шумораи умумии категория</div>
                </Card>

                <Card
                    title="Фурӯшҳо"
                    sub={`дар ${range === 1 ? "1 рӯз" : range === 7 ? "1 ҳафта" : "1 моҳ"}`}
                    right={<span className="muted" style={{ fontWeight: 900 }}>Миёна: {formatMoney(kpis.avg)}</span>}
                >
                    <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 30, fontWeight: 900 }}>{formatMoney(kpis.total)}</div>
                        <div className="muted">сумма</div>
                        <div style={{ marginLeft: 10, fontWeight: 900 }}>{kpis.count}</div>
                        <div className="muted">фурӯш</div>
                    </div>

                    <div className="dashBadges">
                        <span className="muted">Пурра: <b>{kpis.paid}</b></span>
                        <span className="muted">Қисман: <b>{kpis.partial}</b></span>
                        <span className="muted">Насия: <b>{kpis.credit}</b></span>
                    </div>
                </Card>

                <Card title="Қарзҳо" sub={`дар ${range === 1 ? "1 рӯз" : range === 7 ? "1 ҳафта" : "1 моҳ"}`}>
                    <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 30, fontWeight: 900 }}>{formatMoney(kpis.debtTotal)}</div>
                        <div className="muted">боқимонда</div>
                    </div>

                    <div className="muted" style={{ marginTop: 8 }}>
                        Пардохтшуда: <b>{formatMoney(kpis.paidTotal)}</b>
                    </div>

                    {kpis.topMethods?.length ? (
                        <div style={{ marginTop: 10 }}>
                            <div className="muted" style={{ fontWeight: 900, marginBottom: 6 }}>Усулҳои пардохт (Top)</div>
                            <div className="dashMethods">
                                {kpis.topMethods.map((x) => (
                                    <span key={x.method} className="muted">
                    <b>{x.method}</b>: {formatMoney(x.amount)}
                  </span>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="muted" style={{ marginTop: 10 }}>Ҳоло пардохт сабт нашудааст</div>
                    )}
                </Card>
            </div>

            <div className="grid2 dashGrid">
                <Card title="Диаграмма" sub={`Фурӯш дар рӯзҳо (${range === 1 ? "1 рӯз" : range === 7 ? "1 ҳафта" : "1 моҳ"})`}>
                    {chartPoints.length ? (
                        <>
                            <LineChart points={chartPoints} />
                            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                                Нуқтаҳо — суммаи фурӯш барои ҳар рӯз
                            </div>
                        </>
                    ) : (
                        <div className="muted">Маълумот нест</div>
                    )}
                </Card>

                <Card title="Қарздорҳо" sub="Top 20 (боқимонда > 0)">
                    {debtors.length ? (
                        <>
                            {/* Desktop table */}
                            <div className="debtorsTableWrap">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Мизоҷ</th>
                                        <th>Телефон</th>
                                        <th>Ҳолат</th>
                                        <th>Муҳлат</th>
                                        <th style={{ textAlign: "right" }}>Қарз</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {debtors.map((s) => (
                                        <tr key={s._id}>
                                            <td style={{ fontWeight: 800 }}>{s.customerName || "—"}</td>
                                            <td className="muted">{s.customerPhone || "—"}</td>
                                            <td>{statusTJ(s.status)}</td>
                                            <td className="muted">
                                                {s.dueDate ? new Date(s.dueDate).toLocaleDateString("ru-RU") : "—"}
                                            </td>
                                            <td style={{ textAlign: "right", fontWeight: 900 }}>
                                                {formatMoney(s.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>

                                <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                                    Агар “Ном/Телефон” холӣ бошад — дар вақти насия пур карда нашудааст.
                                </div>
                            </div>

                            {/* Mobile cards */}
                            <div className="debtorsMobileList">
                                {debtors.map((s) => (
                                    <DebtorCard key={s._id} s={s} />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="muted">Қарздор нест</div>
                    )}
                </Card>
            </div>
        </div>
    );
}
