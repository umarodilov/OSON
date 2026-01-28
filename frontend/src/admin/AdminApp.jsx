import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout.jsx";

function Dashboard() {
    return (
        <div className="card">
            <div className="cardTitle">
                <b>Dashboard</b><span className="muted">Admin</span>
            </div>
            <div className="muted">Инҷо: статистика, low-stock, debts…</div>
        </div>
    );
}

function Products() {
    return (
        <div className="card">
            <div className="cardTitle">
                <b>Products</b>
                <button className="btn btnPrimary">+ Add</button>
            </div>
            <div className="muted">CRUD-и маҳсулотҳо баъд илова мекунем</div>
        </div>
    );
}

function Categories() {
    return (
        <div className="card">
            <div className="cardTitle">
                <b>Categories</b>
                <button className="btn btnPrimary">+ Add</button>
            </div>
            <div className="muted">CRUD-и категорияҳо</div>
        </div>
    );
}

function Sales() {
    return (
        <div className="card">
            <div className="cardTitle"><b>Sales</b></div>
            <div className="muted">Рӯйхати фурӯшҳо</div>
        </div>
    );
}

function Users() {
    return (
        <div className="card">
            <div className="cardTitle"><b>Users</b></div>
            <div className="muted">Admin метавонад user-ҳоро идора кунад</div>
        </div>
    );
}

export default function AdminApp() {
    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="sales" element={<Sales />} />
                <Route path="users" element={<Users />} />
            </Route>
        </Routes>
    );
}
