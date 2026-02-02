import mongoose from "mongoose";
import Sale from "../models/Sale.js";

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI;

async function run() {
    await mongoose.connect(MONGO);
    console.log("DB connected");

    // ин ID-ро ба admin-и худат мон (аз users коллексия гир)
    const ADMIN_ID = "PASTE_ADMIN_USER_ID_HERE";

    const r = await Sale.updateMany(
        { createdById: { $exists: false } },
        {
            $set: {
                createdById: ADMIN_ID,
                createdByUsername: "admin",
                createdByRole: "admin",
            },
        }
    );

    console.log("Updated:", r.modifiedCount);
    await mongoose.disconnect();
}
run().catch((e) => {
    console.error(e);
    process.exit(1);
});
