import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

function money(n) {
    return `${Number(n || 0).toLocaleString("ru-RU")} см`;
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

function ProductCard({ p, getCatName, onEdit, onRemove }) {
    const stock = Number(p.stock || 0);
    const low = stock <= 5;

    return (
        <div className="pCard">
            <div className="pTop">
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 1000, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name} {p.favorite ? "⭐" : ""}
                    </div>
                    <div className="muted" style={{ marginTop: 2 }}>
                        Категория: {getCatName(p) || "—"}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => onEdit(p)}>✏️</button>
                    <button className="btn" onClick={() => onRemove(p._id)}>🗑</button>
                </div>
            </div>

            <div className="pMeta">
                <span className="pChip">Нарх: <b>{money(p.price)}</b></span>
                <span className={"pChip " + (low ? "pChipLow" : "pChipOk")}>
          Дар склад: <b>{stock}</b>
        </span>
            </div>
        </div>
    );
}

export default function Products() {
    const [items, setItems] = useState([]);
    const [cats, setCats] = useState([]);
    const [q, setQ] = useState("");
    const [cat, setCat] = useState("all");

    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [form, setForm] = useState({
        name: "",
        price: "",
        stock: "",
        categoryId: "",
        favorite: false,
    });

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const [p, c] = await Promise.all([
                api.get("/api/products"),
                api.get("/api/categories"),
            ]);
            setItems(Array.isArray(p.data) ? p.data : []);
            setCats(Array.isArray(c.data) ? c.data : []);
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "Хатои гирифтани маҳсулотҳо");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    function getCatId(p) {
        return typeof p.categoryId === "object" ? p.categoryId?._id : p.categoryId;
    }
    function getCatName(p) {
        return typeof p.categoryId === "object" ? p.categoryId?.name : "";
    }

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items
            .filter((p) => (cat === "all" ? true : String(getCatId(p)) === String(cat)))
            .filter((p) => (!s ? true : String(p.name || "").toLowerCase().includes(s)));
    }, [items, q, cat]);

    function openAdd() {
        setEditing(null);
        setForm({
            name: "",
            price: "",
            stock: "",
            categoryId: cats?.[0]?._id || "",
            favorite: false,
        });
        setOpen(true);
    }

    function openEdit(p) {
        setEditing(p);
        setForm({
            name: p?.name || "",
            price: p?.price ?? "",
            stock: p?.stock ?? "",
            categoryId: getCatId(p) || cats?.[0]?._id || "",
            favorite: !!p?.favorite,
        });
        setOpen(true);
    }

    async function save() {
        try {
            const payload = {
                name: String(form.name || "").trim(),
                price: Number(form.price || 0),
                stock: Number(form.stock || 0),
                categoryId: form.categoryId || null,
                favorite: !!form.favorite,
            };
            if (!payload.name) return alert("Номро ворид кунед");

            if (editing?._id) await api.put(`/api/products/${editing._id}`, payload);
            else await api.post("/api/products", payload);

            setOpen(false);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Хатои сабт");
        }
    }

    async function remove(id) {
        if (!window.confirm("Ҳазф кунем?")) return;
        try {
            await api.delete(`/api/products/${id}`);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Хатои ҳазф");
        }
    }

    return (
        <div className="card">
            <div className="prodHeader">
                <b>Маҳсулотҳо</b>

                <div className="prodActions">
                    <input
                        className="input prodSearch"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ..."
                    />

                    <select className="select prodSelect" value={cat} onChange={(e) => setCat(e.target.value)}>
                        <option value="all">Ҳамаи категорияҳо</option>
                        {cats.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>

                    <button className="btn" onClick={load} disabled={loading}>
                        {loading ? "..." : "⟳"}
                    </button>

                    <button className="btn btnPrimary" onClick={openAdd}>+ Илова</button>
                </div>
            </div>

            {err ? <div className="errorBox">{err}</div> : null}

            {/* Desktop table */}
            <div className="prodTableWrap">
                <table className="table">
                    <thead>
                    <tr>
                        <th>Ном</th>
                        <th>Категория</th>
                        <th>Нарх</th>
                        <th>Склад</th>
                        <th style={{ textAlign: "right" }}>Амалиёт</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((p) => (
                        <tr key={p._id}>
                            <td>{p.name} {p.favorite ? "⭐" : ""}</td>
                            <td className="muted">{getCatName(p) || "—"}</td>
                            <td>{money(p.price)}</td>
                            <td>
                  <span className={Number(p.stock || 0) <= 5 ? "badge badgeLow" : "badge badgeOk"}>
                    {Number(p.stock || 0)}
                  </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                                <button className="btn" onClick={() => openEdit(p)}>✏️</button>{" "}
                                <button className="btn" onClick={() => remove(p._id)}>🗑</button>
                            </td>
                        </tr>
                    ))}

                    {!loading && filtered.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="muted">Холӣ</td>
                        </tr>
                    ) : null}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="prodMobileList">
                {filtered.map((p) => (
                    <ProductCard
                        key={p._id}
                        p={p}
                        getCatName={getCatName}
                        onEdit={openEdit}
                        onRemove={remove}
                    />
                ))}
                {!loading && filtered.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>Холӣ</div>
                ) : null}
            </div>

            {open && (
                <Modal title={editing ? "Таҳрири маҳсулот" : "Иловаи маҳсулот"} onClose={() => setOpen(false)}>
                    <input
                        className="input"
                        placeholder="Ном"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />

                    <div className="prodFormRow">
                        <input
                            className="input"
                            type="number"
                            placeholder="Нарх (см)"
                            value={form.price}
                            onChange={(e) => setForm({ ...form, price: e.target.value })}
                        />
                        <input
                            className="input"
                            type="number"
                            placeholder="Склад"
                            value={form.stock}
                            onChange={(e) => setForm({ ...form, stock: e.target.value })}
                        />
                    </div>

                    <select
                        className="select"
                        value={form.categoryId || ""}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    >
                        {cats.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>

                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={form.favorite}
                            onChange={(e) => setForm({ ...form, favorite: e.target.checked })}
                        />
                        <span>Маҳсулоти муҳим (⭐)</span>
                    </label>

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button className="btn btnPrimary" onClick={save}>Сабт</button>
                        <button className="btn" onClick={() => setOpen(false)}>Бекор</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
