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

function UserRowMobile({ u, onEdit, onReset }) {
    return (
        <div className="uCard">
            <div className="uCardTop">
                <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {u.username}
                    </div>
                    <div className="muted" style={{ marginTop: 2 }}>
                        {u.name || "—"}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => onEdit(u)}>✏️</button>
                    <button className="btn" onClick={() => onReset(u)}>🔑</button>
                </div>
            </div>

            <div className="uMeta">
                <span className="uChip">{u.role}</span>
                <span className={"uChip " + (u.isActive === false ? "uChipOff" : "uChipOn")}>
          {u.isActive === false ? "inactive" : "active"}
        </span>
            </div>
        </div>
    );
}

export default function Users() {
    const [items, setItems] = useState([]);
    const [q, setQ] = useState("");

    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const [form, setForm] = useState({
        name: "",
        username: "",
        password: "",
        role: "user",
        isActive: true,
    });

    async function load() {
        setLoading(true);
        setErr("");
        try {
            const res = await api.get("/api/users");
            setItems(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "GET /api/users not available yet");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        return items.filter((u) => {
            if (!s) return true;
            return (
                String(u.username || "").toLowerCase().includes(s) ||
                String(u.name || "").toLowerCase().includes(s)
            );
        });
    }, [items, q]);

    function openAdd() {
        setEditing(null);
        setForm({ name: "", username: "", password: "", role: "user", isActive: true });
        setOpen(true);
    }

    function openEdit(u) {
        setEditing(u);
        setForm({
            name: u?.name || "",
            username: u?.username || "",
            password: "",
            role: u?.role || "user",
            isActive: u?.isActive !== false,
        });
        setOpen(true);
    }

    async function save() {
        try {
            const payload = {
                name: String(form.name || "").trim(),
                username: String(form.username || "").trim().toLowerCase(),
                role: form.role,
                isActive: !!form.isActive,
                password: form.password ? String(form.password) : undefined,
            };

            if (!payload.username) return alert("username лозим аст");

            if (editing?._id) {
                await api.put(`/api/users/${editing._id}`, payload);
            } else {
                if (!payload.password) return alert("password лозим аст");
                await api.post("/api/users", payload);
            }

            setOpen(false);
            await load();
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Save error");
        }
    }

    async function resetPassword(u) {
        const newPass = prompt("Пароли навро навис:");
        if (!newPass) return;
        try {
            await api.post(`/api/users/${u._id}/reset-password`, { password: newPass });
            alert("✅ Парол иваз шуд");
        } catch (e) {
            alert(e?.response?.data?.message || e?.message || "Reset error");
        }
    }

    return (
        <div className="card">
            <div className="usersHeader">
                <b>Users</b>

                <div className="usersActions">
                    <input
                        className="input usersSearch"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Ҷустуҷӯ..."
                    />
                    <button className="btn" onClick={load} disabled={loading}>
                        {loading ? "..." : "⟳"}
                    </button>
                    <button className="btn btnPrimary" onClick={openAdd}>
                        + Add
                    </button>
                </div>
            </div>

            {err ? <div className="errorBox">{err}</div> : null}

            {/* Desktop table */}
            <div className="usersTableWrap">
                <table className="table">
                    <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Active</th>
                        <th style={{ textAlign: "right" }}>Амалиёт</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filtered.map((u) => (
                        <tr key={u._id}>
                            <td style={{ fontWeight: 800 }}>{u.username}</td>
                            <td className="muted">{u.name || "—"}</td>
                            <td>{u.role}</td>
                            <td>{u.isActive === false ? "no" : "yes"}</td>
                            <td style={{ textAlign: "right" }}>
                                <button className="btn" onClick={() => openEdit(u)}>✏️</button>{" "}
                                <button className="btn" onClick={() => resetPassword(u)}>🔑</button>
                            </td>
                        </tr>
                    ))}
                    {!loading && filtered.length === 0 ? (
                        <tr><td colSpan="5" className="muted">Холӣ</td></tr>
                    ) : null}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="usersMobileList">
                {filtered.map((u) => (
                    <UserRowMobile
                        key={u._id}
                        u={u}
                        onEdit={openEdit}
                        onReset={resetPassword}
                    />
                ))}
                {!loading && filtered.length === 0 ? (
                    <div className="muted" style={{ padding: 10 }}>Холӣ</div>
                ) : null}
            </div>

            {open && (
                <Modal title={editing ? "Edit user" : "Add user"} onClose={() => setOpen(false)}>
                    <input
                        className="input"
                        placeholder="Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <input
                        className="input"
                        placeholder="Username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />

                    {!editing ? (
                        <input
                            className="input"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    ) : (
                        <div className="muted">Парол аз тугмаи 🔑 reset мешавад</div>
                    )}

                    <select
                        className="select"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>

                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                        <span>Active</span>
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
