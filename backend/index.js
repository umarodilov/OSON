import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import salesRouter from "./routes/sales.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";
import authRouter from "./routes/auth.js";
dotenv.config();


const app = express();


app.use(cors());

app.use(express.json());
app.use("/api/sales", salesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);
app.use("/api/auth", authRouter);

app.get("/", (req, res) => res.send("OSON API OK"));

const mongoUri = process.env.MONGO_URI;
if (!mongoUri || (!mongoUri.startsWith("mongodb://") && !mongoUri.startsWith("mongodb+srv://"))) {
    console.error('❌ Invalid MONGO_URI. It must start with "mongodb://" or "mongodb+srv://".');
} else {
    mongoose
        .connect(mongoUri)
        .then(() => console.log("✅ MongoDB connected"))
        .catch((e) => console.error("Mongo error:", e));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("API running on", PORT));
