import { Routes, Route, Navigate } from "react-router-dom";
import POS from "./POS.jsx";
import Login from "./Login.jsx";
import AdminApp from "./admin/AdminApp.jsx";

function getAuth() {
    const token = localStorage.getItem("token");
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    return { token, user };
}

function RequireAuth({ children }) {
    const { token } = getAuth();
    if (!token) return <Navigate to="/login" replace />;
    return children;
}

function HomeRedirect() {
    const { token, user } = getAuth();
    if (!token) return <Navigate to="/login" replace />;
    if (user?.role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/pos" replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route
                path="/pos"
                element={
                    <RequireAuth>
                        <POS />
                    </RequireAuth>
                }
            />

            {/* ✅ ин муҳим: /admin/* */}
            <Route
                path="/admin/*"
                element={
                    <RequireAuth>
                        <AdminApp />
                    </RequireAuth>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
