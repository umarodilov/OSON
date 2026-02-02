import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";

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

function CategoryCard({ c, onEdit, onRemove }) {
    return (
        <div className="cCard">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                    </div>
                    {c.order !== undefined ? (
                        <div className="muted" style={{ marginTop: 2 }}>order: {c.order}</div>
                    ) : null}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => onEdit(c)}>✏️</button>
                    <button className="btn" onClick={() => onRemove(c._id)}>🗑</button>
                </div>
            </div>
        </div>
    );
}

export default function Categories() {
    const [items, setItems] = useState([]);
    const [q, setQ] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState("");

    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/categories");
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "Error loading categories");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter((c) => (!s ? true : String(c.name || "").toLowerCase().includes(s)));
    }, [items, q]);

    function openAdd() {
        setEditing(null);
        setName("");
        setOpen(true);
    }

    function openEdit(c) {
        setEditing(c);
        setName(c?.name || "");
        setOpen(true);
    }

    async function save() {
        const payload = { name: String(name || "").trim() };
        if (!payload.name) return alert("Номро ворид кунед");

        try {
            if (editing?._id) await api.put(`/api/categories/${editing._id}`, payload);
            else await api.post("/api/categories", payload);

            setOpen(false);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Save error");
        }
    }

    async function remove(id) {
        if (!window.confirm("Ҳазф кунем?")) return;
        try {
            await api.delete(`/api/categories/${id}`);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Delete error");
        }
    }

    return (
        <div className="card">
            <div className="catsHeader">
                <b>Categories</b>

                <div className="catsActions">
                    <input
                        className="input catsSearch"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ..."
                    />
                    <button className="btn" onClick={load} disabled={loading}>
                        {loading ? "..." : "⟳"}
                    </button>
                    <button className="btn btnPrimary" onClick={openAdd}>+ Add</button>
                </div>
            </div>

            {err ? <div className="errorBox">{err}</div> : null}

            {/* Desktop table */}
            <div className="catsTableWrap">
                <table className="table">
                    <thead>
                    <tr>
                        <th>Ном</th>
                        <th style={{ textAlign: "right" }}>Амалиёт</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((c) => (
                        <tr key={c._id}>
                            <td>{c.name}</td>
                            <td style={{ textAlign: "right" }}>
                                <button className="btn" onClick={() => openEdit(c)}>✏️</button>{" "}
                                <button className="btn" onClick={() => remove(c._id)}>🗑</button>
                            </td>
                        </tr>
                    ))}
                    {!loading && filtered.length === 0 ? (
                        <tr><td colSpan="2" className="muted">Холӣ</td></tr>
                    ) : null}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="catsMobileList">
                {filtered.map((c) => (
                    <CategoryCard key={c._id} c={c} onEdit={openEdit} onRemove={remove} />
                ))}
                {!loading && filtered.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>Холӣ</div>
                ) : null}
            </div>

            {open && (
                <Modal title={editing ? "Edit category" : "Add category"} onClose={() => setOpen(false)}>
                    <input
                        className="input"
                        placeholder="Ном"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />

                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button className="btn btnPrimary" onClick={save}>Сабт</button>
                        <button className="btn" onClick={() => setOpen(false)}>Бекор</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
