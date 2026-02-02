import { useMemo, useState } from "react";
import { api } from "./api";

function getRedirect(user) {
    if (user?.role === "admin") return "/admin";
    return "/";
}

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [show, setShow] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);

    const canSubmit = useMemo(() => {
        return String(username).trim().length > 0 && String(password).length > 0 && !loading;
    }, [username, password, loading]);

    async function onLogin(e) {
        e.preventDefault();
        if (!canSubmit) return;

        setErr("");
        setLoading(true);
        try {
            const res = await api.post("/api/auth/login", {
                username: String(username).trim().toLowerCase(),
                password: String(password),
            });

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            window.location.href = getRedirect(res.data.user);
        } catch (e2) {
            setErr(e2?.response?.data?.message || e2?.message || "Login error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authShell">
            <div className="authCard">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="authLogo">O</div>
                    <div style={{ minWidth: 0 }}>
                        <div className="authTitle">OSON</div>
                        <div className="muted" style={{ marginTop: 2 }}>
                            Воридшавӣ ба система
                        </div>
                    </div>
                </div>

                {err ? <div className="errorBox" style={{ marginTop: 12 }}>{err}</div> : null}

                <form onSubmit={onLogin} style={{ display: "grid", gap: 10, marginTop: 14 }}>
                    <label className="muted" style={{ fontSize: 12, fontWeight: 800 }}>
                        Username
                    </label>
                    <input
                        className="input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Name"
                        autoComplete="username"
                    />

                    <label className="muted" style={{ fontSize: 12, fontWeight: 800, marginTop: 6 }}>
                        Password
                    </label>

                    <div className="inputRow">
                        <input
                            className="input"
                            style={{ border: "none", outline: "none", background: "transparent", flex: 1 }}
                            type={show ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            className="iconBtn"
                            onClick={() => setShow((s) => !s)}
                            title={show ? "Hide" : "Show"}
                            style={{ height: 36, width: 44 }}
                        >
                            {show ? "🙈" : "👁️"}
                        </button>
                    </div>

                    <button className="btn btnPrimary" type="submit" disabled={!canSubmit}>
                        {loading ? "..." : "Ворид шудан"}
                    </button>

                    <div className="muted" style={{ fontSize: 12, textAlign: "center", marginTop: 2 }}>
                        Агар ворид нашавад — username/password-ро санҷ ва backend фаъол бошад.
                    </div>
                </form>
            </div>
        </div>
    );
}
