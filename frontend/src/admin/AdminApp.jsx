import { Routes, Route } from "react-router-dom";
import AdminLayout from "./AdminLayout.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Products from "./pages/Products.jsx";
import Categories from "./pages/Categories.jsx";
import Sales from "./pages/Sales.jsx";
import Users from "./pages/Users.jsx";

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
