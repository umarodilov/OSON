import express from "express";
import Product from "../models/Product.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// 📌 ҲАМА БИНАНД (admin + user)
router.get("/", async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// 🔒 ТАНҲО ADMIN → CREATE
router.post(
    "/",
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
        const product = await Product.create(req.body);
        res.json(product);
    }
);

// 🔒 ТАНҲО ADMIN → UPDATE
router.put(
    "/:id",
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        res.json(updated);
    }
);

// 🔒 ТАНҲО ADMIN → DELETE
router.delete(
    "/:id",
    requireAuth,
    requireRole("admin"),
    async (req, res) => {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    }
);

export default router;
