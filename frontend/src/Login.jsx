import { useState } from "react";
import { api } from "./api";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");

    async function onLogin(e) {
        e.preventDefault();
        setErr("");
        try {
            const res = await api.post("/api/auth/login", { username, password });

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("user", JSON.stringify(res.data.user));

            window.location.href = "/"; // redirect
        } catch (e) {
            setErr(e?.response?.data?.message || e?.message || "Login error");
        }
    }

    return (
        <div style={{ maxWidth: 420, margin: "40px auto" }}>
            <h2>Воридшавӣ</h2>
            {err ? <div className="errorBox">{err}</div> : null}
            <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
                <input
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                />
                <input
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                />
                <button className="btn btnPrimary" type="submit">
                    Ворид шудан
                </button>
            </form>
        </div>
    );
}
