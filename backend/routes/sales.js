import express from "express";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
const n = (x) => Number(x || 0);

router.post("/", requireAuth, async (req, res) => {
    try {
        const {
            items = [],
            payments = [],
            customerName = "",
            customerPhone = "",
            dueDate = null,
            note = "",
            paymentMethod, // back-compat (агар фронт кӯҳна бошад)
        } = req.body || {};

        // ✅ user-и воридшуда
        const createdById = req.user?.id;
        const createdByUsername = req.user?.username || "";
        const createdByRole = req.user?.role || "user";

        if (!createdById) {
            return res.status(401).json({ message: "No token" });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "items холӣ аст" });
        }

        // 1) Пайментҳо
        let payList = Array.isArray(payments) ? payments : [];

        // 2) Бор кардани маҳсулотҳо
        const ids = items.map((i) => i.productId);
        const products = await Product.find({ _id: { $in: ids } });

        const map = new Map(products.map((p) => [String(p._id), p]));

        // 3) Тайёр кардани items + total
        const saleItems = [];
        let total = 0;

        for (const it of items) {
            const p = map.get(String(it.productId));
            if (!p) {
                return res
                    .status(400)
                    .json({ message: "Product ёфт нашуд: " + it.productId });
            }

            const qty = Math.max(1, n(it.qty));
            const price = n(p.price);
            const stock = n(p.stock);

            if (stock < qty) {
                return res.status(400).json({
                    message: `Склад намерасад: ${p.name} (қол: ${stock}, дархост: ${qty})`,
                });
            }

            const subtotal = price * qty;
            total += subtotal;

            saleItems.push({
                productId: p._id,
                name: p.name,
                price,
                qty,
                subtotal,
            });
        }

        // Агар фронти кӯҳна paymentMethod фиристад:
        if ((!payList || payList.length === 0) && paymentMethod) {
            payList = [{ method: String(paymentMethod), amount: total }];
        }

        // 4) Валидатсия / тоза кардани payList
        payList = (payList || [])
            .map((p) => ({
                method: String(p.method || "").toLowerCase(),
                amount: n(p.amount),
                txnId: p?.txnId ? String(p.txnId) : "",
            }))
            .filter(
                (p) =>
                    ["cash", "dc", "card", "alif"].includes(p.method) && p.amount > 0
            );

        const paidTotal = payList.reduce((s, p) => s + n(p.amount), 0);
        const balance = Math.max(0, total - paidTotal);

        if (paidTotal - total > 0.0001) {
            return res
                .status(400)
                .json({ message: "Пардохт аз суммаи умумӣ зиёд аст" });
        }

        let status = "paid";
        if (balance > 0 && paidTotal > 0) status = "partial";
        if (balance > 0 && paidTotal === 0) status = "credit";

        // Агар насия бошад → барои тартиб: ҳадди ақал телефон/ном талаб кун (ихтиёрӣ)
        if (status !== "paid") {
            if (!String(customerName || "").trim() || !String(customerPhone || "").trim()) {
                return res.status(400).json({
                    message: "Барои насия: customerName ва customerPhone ҳатмист.",
                });
            }
        }

        // 5) Кам кардани склад (atomic per product)
        for (const si of saleItems) {
            const r = await Product.updateOne(
                { _id: si.productId, stock: { $gte: si.qty } },
                { $inc: { stock: -si.qty } }
            );

            if (r.modifiedCount !== 1) {
                return res
                    .status(400)
                    .json({ message: `Склад намерасад: ${si.name}` });
            }
        }

        // 6) Сабти sale
        // Барои payments-и ибтидоӣ ҳам "receivedBy" мегузорем
        const paymentsWithReceiver = payList.map((p) => ({
            ...p,
            receivedById: createdById,
            receivedByUsername: createdByUsername,
            receivedAt: new Date(),
        }));

        const saleDoc = await Sale.create({
            items: saleItems,
            total,
            payments: paymentsWithReceiver,
            paidTotal,
            balance,
            status,

            createdById,
            createdByUsername,
            createdByRole,

            customerName,
            customerPhone,
            dueDate: dueDate ? new Date(dueDate) : null,
            note,
        });

        return res.json({
            message: "ok",
            saleId: saleDoc?._id,
            total: saleDoc?.total,
            paidTotal: saleDoc?.paidTotal,
            balance: saleDoc?.balance,
            status: saleDoc?.status,
        });
    } catch (e) {
        console.error("SALE CREATE ERROR:", e);
        return res.status(500).json({ message: e.message || "Server error" });
    }
});

// Пардохти қарз: /api/sales/:id/pay
router.post("/:id/pay", requireAuth, async (req, res) => {
    try {
        const { method = "cash", amount = 0, txnId = "" } = req.body || {};
        const m = String(method).toLowerCase();
        const a = Number(amount || 0);

        const receivedById = req.user?.id;
        const receivedByUsername = req.user?.username || "";

        if (!receivedById) return res.status(401).json({ message: "No token" });

        if (!["cash", "dc", "card", "alif"].includes(m)) {
            return res.status(400).json({ message: "method нодуруст аст" });
        }
        if (a <= 0) return res.status(400).json({ message: "amount нодуруст аст" });

        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.status(404).json({ message: "Sale ёфт нашуд" });

        if (sale.balance <= 0) {
            return res
                .status(400)
                .json({ message: "Ин фурӯш аллакай пурра пардохт шудааст" });
        }

        if (a > sale.balance) {
            return res.status(400).json({ message: "amount аз balance зиёд аст" });
        }

        sale.payments.push({
            method: m,
            amount: a,
            txnId: String(txnId || ""),
            receivedById,
            receivedByUsername,
            receivedAt: new Date(),
        });

        sale.paidTotal = Number(sale.paidTotal || 0) + a;
        sale.balance = Math.max(
            0,
            Number(sale.total || 0) - Number(sale.paidTotal || 0)
        );
        sale.status = sale.balance === 0 ? "paid" : "partial";

        await sale.save();

        return res.json({
            message: "ok",
            saleId: sale._id,
            total: sale.total,
            paidTotal: sale.paidTotal,
            balance: sale.balance,
            status: sale.status,
        });
    } catch (e) {
        console.error("SALE PAY ERROR:", e);
        return res.status(500).json({ message: e.message || "Server error" });
    }
});

export default router;
