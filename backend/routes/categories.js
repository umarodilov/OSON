import express from "express";
import Category from "../models/Category.js";

const router = express.Router();

// GET all
router.get("/", async (req, res) => {
    const cats = await Category.find().sort({ order: 1, name: 1 });
    res.json(cats);
});

// POST create
router.post("/", async (req, res) => {
    const created = await Category.create({ name: req.body.name, order: req.body.order ?? 0 });
    res.status(201).json(created);
});

export default router;
