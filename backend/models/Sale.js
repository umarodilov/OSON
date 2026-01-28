import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
    {
            method: {
                    type: String,
                    enum: ["cash", "dc", "card", "alif"],
                    required: true,
            },
            amount: { type: Number, required: true, min: 0 },
            txnId: { type: String, default: "" },

            // ✅ кӣ ин пардохтро қабул кард (кассир/админ)
            receivedById: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
            receivedByUsername: { type: String, default: "" },
            receivedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const SaleItemSchema = new mongoose.Schema(
    {
            productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
            },
            name: { type: String, default: "" },
            price: { type: Number, required: true },
            qty: { type: Number, required: true, min: 1 },
            subtotal: { type: Number, required: true },
    },
    { _id: false }
);

const SaleSchema = new mongoose.Schema(
    {
            items: { type: [SaleItemSchema], default: [] },
            total: { type: Number, required: true, min: 0 },

            payments: { type: [PaymentSchema], default: [] },
            paidTotal: { type: Number, default: 0, min: 0 },
            balance: { type: Number, default: 0, min: 0 },

            status: {
                    type: String,
                    enum: ["paid", "partial", "credit"],
                    default: "paid",
            },

            // ✅ кӣ sale-ро сохт (кассир/админ)
            createdById: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
            createdByUsername: { type: String, default: "" },
            createdByRole: { type: String, enum: ["admin", "user"], default: "user" },

            // ✅ маълумоти муштарӣ (барои насия)
            customerName: { type: String, default: "" },
            customerPhone: { type: String, default: "" },
            dueDate: { type: Date, default: null },
            note: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.model("Sale", SaleSchema);
