import { useEffect, useState } from "react";
import { api } from "../../api";

export default function Products() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [form, setForm] = useState({
        name: "",
        price: "",
        stock: "",
    });

    async function load() {
        setLoading(true);
        try {
            const res = await api.get("/api/products");
            setItems(res.data || []);
        } catch (e) {
            setErr(e?.response?.data?.message || "Error loading products");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    function openAdd() {
        setEditing(null);
        setForm({ name: "", price: "", stock: "" });
        setOpen(true);
    }

    function openEdit(p) {
        setEditing(p);
        setForm({
            name: p.name || "",
            price: p.price || "",
            stock: p.stock || "",
        });
        setOpen(true);
    }

    async function save() {
        try {
            if (editing) {
                await api.put(`/api/products/${editing._id}`, form);
            } else {
                await api.post("/api/products", form);
            }
            setOpen(false);
            load();
        } catch (e) {
            alert(e?.response?.data?.message || "Save error");
        }
    }

    async function remove(id) {
        if (!window.confirm("Ҳазф кунем?")) return;
        try {
            await api.delete(`/api/products/${id}`);
            load();
        } catch (e) {
            alert(e?.response?.data?.message || "Delete error");
        }
    }

    return (
        <div className="card">
            <div className="cardTitle">
                <b>Products</b>
                <button className="btn btnPrimary" onClick={openAdd}>
                    + Add
                </button>
            </div>

            {err ? <div className="errorBox">{err}</div> : null}

            <table className="table">
                <thead>
                <tr>
                    <th>Ном</th>
                    <th>Нарх</th>
                    <th>Склад</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {items.map((p) => (
                    <tr key={p._id}>
                        <td>{p.name}</td>
                        <td>{p.price}</td>
                        <td>{p.stock}</td>
                        <td style={{ textAlign: "right" }}>
                            <button className="btn" onClick={() => openEdit(p)}>✏️</button>{" "}
                            <button className="btn" onClick={() => remove(p._id)}>🗑</button>
                        </td>
                    </tr>
                ))}
                {!loading && items.length === 0 ? (
                    <tr>
                        <td colSpan="4" className="muted">Холӣ</td>
                    </tr>
                ) : null}
                </tbody>
            </table>

            {/* MODAL */}
            {open && (
                <div className="modalBack">
                    <div className="modal">
                        <h3>{editing ? "Edit product" : "Add product"}</h3>

                        <input
                            className="input"
                            placeholder="Ном"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <input
                            className="input"
                            type="number"
                            placeholder="Нарх"
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

                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button className="btn btnPrimary" onClick={save}>
                                Сабт
                            </button>
                            <button className="btn" onClick={() => setOpen(false)}>
                                Бекор
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
