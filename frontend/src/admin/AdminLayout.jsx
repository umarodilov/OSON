import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }) =>
    "navItem" + (isActive ? " navItemActive" : "");

export default function AdminLayout() {
    return (
        <div className="adminShell">
            <aside className="adminSidebar">
                <div className="adminBrand">
                    <div className="logo">O</div>
                    <div>
                        <div style={{ fontWeight: 900, lineHeight: 1 }}>OSON</div>
                        <div className="muted" style={{ marginTop: 2 }}>Admin</div>
                    </div>
                </div>

                <nav className="adminNav">
                    <NavLink to="/admin" end className={linkClass}>📊 Dashboard</NavLink>
                    <NavLink to="/admin/products" className={linkClass}>📦 Products</NavLink>
                    <NavLink to="/admin/categories" className={linkClass}>🏷️ Categories</NavLink>
                    <NavLink to="/admin/sales" className={linkClass}>🧾 Sales</NavLink>
                    <NavLink to="/admin/users" className={linkClass}>👤 Users</NavLink>
                </nav>

                <div style={{ marginTop: "auto" }}>
                    <button
                        className="btn"
                        style={{ width: "100%" }}
                        onClick={() => {
                            localStorage.clear();
                            window.location.href = "/login";
                        }}
                    >
                        ⎋ Logout
                    </button>
                </div>
            </aside>

            <main className="adminMain">
                <div className="adminTopbar">
                    <div style={{ fontWeight: 800 }}>Админ панел</div>
                    <div className="muted">замонавӣ • тоза</div>
                </div>

                <div className="adminContent">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
