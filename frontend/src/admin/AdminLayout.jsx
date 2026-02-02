import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

const linkClass = ({ isActive }) => "navItem" + (isActive ? " navItemActive" : "");

function getUser() {
    try {
        const raw = localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function pageTitle(pathname) {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/products")) return "Products";
    if (pathname.startsWith("/admin/categories")) return "Categories";
    if (pathname.startsWith("/admin/sales")) return "Sales";
    if (pathname.startsWith("/admin/users")) return "Users";
    return "Admin";
}

export default function AdminLayout() {
    const user = getUser();
    const { pathname } = useLocation();

    const [open, setOpen] = useState(false);

    const title = useMemo(() => pageTitle(pathname), [pathname]);

    // ✅ Ҳангоми иваз шудани page — drawer-ро пӯш кун
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    function logout() {
        localStorage.clear();
        window.location.href = "/login";
    }

    return (
        <div className="adminShell2">
            {/* overlay (mobile) */}
            {open ? <div className="adminOverlay" onClick={() => setOpen(false)} /> : null}

            <aside className={"adminSidebar2 " + (open ? "adminSidebar2Open" : "")}>
                <div className="adminBrand2">
                    <div className="logo2">O</div>

                    <div style={{ minWidth: 0 }}>
                        <div className="brandTitle">OSON</div>
                        <div className="muted brandSub">
                            Admin • {user?.username || "?"}
                        </div>
                    </div>

                    {/* close button only on mobile */}
                    <button className="iconBtn mobileOnly" onClick={() => setOpen(false)} title="Close">
                        ✕
                    </button>
                </div>

                <nav className="adminNav2">
                    <NavLink to="/admin" end className={linkClass}>
                        <span className="navEmoji">📊</span> Dashboard
                    </NavLink>

                    <NavLink to="/admin/products" className={linkClass}>
                        <span className="navEmoji">📦</span> Products
                    </NavLink>

                    <NavLink to="/admin/categories" className={linkClass}>
                        <span className="navEmoji">🏷️</span> Categories
                    </NavLink>

                    <NavLink to="/admin/sales" className={linkClass}>
                        <span className="navEmoji">🧾</span> Sales
                    </NavLink>

                    <NavLink to="/admin/users" className={linkClass}>
                        <span className="navEmoji">👤</span> Users
                    </NavLink>
                </nav>

                <div className="sidebarBottom">
                    <button className="btn btnDanger" style={{ width: "100%" }} onClick={logout}>
                        ⎋ Logout
                    </button>
                </div>
            </aside>

            <main className="adminMain2">
                <div className="adminTopbar2">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        {/* hamburger (mobile) */}
                        <button className="iconBtn mobileOnly" onClick={() => setOpen(true)} title="Menu">
                            ☰
                        </button>

                        <div style={{ minWidth: 0 }}>
                            <div className="topTitle">{title}</div>
                            <div className="muted topSub">адаптив • зебо</div>
                        </div>
                    </div>

                    <div className="userPill">
                        <span className="userDot" />
                        <span style={{ fontWeight: 900 }}>{user?.username || "guest"}</span>
                        {user?.role ? <span className="muted">• {user.role}</span> : null}
                    </div>
                </div>

                <div className="adminContent2">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
