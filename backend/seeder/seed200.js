// backend/seeder/seed200.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";

dotenv.config();

const CATEGORIES = [
    { name: "Электроника", order: 1 },
    { name: "Хозтовар", order: 2 },
    { name: "Сантехника", order: 3 },
    { name: "Авто", order: 4 },
    { name: "Асбобҳо", order: 5 }, // tools
    { name: "Омехта", order: 6 },
];

// генератори номҳои оддӣ барои “мағозаи омехта”
const NAME_BANK = {
    Электроника: [
        "Лампа LED 9W", "Лампа 60W", "Розетка", "Вилка", "Удлинитель", "Автомат 16A",
        "Провод 2x1.5", "Провод 2x2.5", "Патрон E27", "Выключатель 1кл", "Выключатель 2кл",
        "Фонарь", "Батарейка AA", "Батарейка AAA", "Зарядка USB", "Переходник"
    ],
    Хозтовар: [
        "Мех 40мм", "Мех 60мм", "Шуруп 4x50", "Шуруп 4x70", "Дюбель 6", "Дюбель 8",
        "Изолента", "Скотч", "Клей Момент", "Щетка", "Перчатки", "Веревка", "Пакет",
        "Краска 1кг", "Кисточка", "Ведро"
    ],
    Сантехника: [
        "Кран 1/2", "Кран 3/4", "Шланг душ", "Лейка душ", "Фум-лента", "Сифон",
        "Прокладка", "Переходник 1/2-3/4", "Тройник", "Колено", "Труба ПП 20мм",
        "Муфта", "Клей ПВХ", "Герметик"
    ],
    Авто: [
        "Масло 1л", "Антифриз 1л", "Тосол 1л", "Омывайка", "Лампочка авто", "Предохранитель",
        "Щетка дворник", "Полироль", "Тряпка микрофибра", "Компрессор переходник"
    ],
    "Асбобҳо": [
        "Отвертка", "Плоскогубцы", "Ключ 10", "Ключ 12", "Ключ 14", "Молоток",
        "Ножовка", "Рулетка 3м", "Рулетка 5м", "Набор бит", "Шуруповерт насадка"
    ],
    Омехта: [
        "Собун", "Шампун", "Крем", "Лампочка ночник", "Карандаш", "Тетрадь",
        "Замок", "Петля дверная", "Коврик", "Сетка", "Таз"
    ],
};

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[randInt(0, arr.length - 1)];
}

function makeProductName(catName, i) {
    const base = pick(NAME_BANK[catName] || ["Мол"]);
    // каме гуногун кунем
    const suffix =
        Math.random() < 0.25 ? ` (${randInt(1, 5)})` :
            Math.random() < 0.10 ? ` - ${randInt(2024, 2026)}` :
                "";
    return `${base}${suffix}`;
}

function priceByCategory(catName) {
    // диапазонҳои нарх (см) — тағйир деҳ, агар хоҳӣ
    const ranges = {
        Электроника: [5, 120],
        Хозтовар: [1, 80],
        Сантехника: [5, 150],
        Авто: [10, 200],
        "Асбобҳо": [10, 250],
        Омехта: [1, 120],
    };
    const [min, max] = ranges[catName] || [1, 100];
    return randInt(min, max);
}

async function ensureCategories() {
    const map = new Map();
    for (const c of CATEGORIES) {
        let existing = await Category.findOne({ name: c.name });
        if (!existing) {
            existing = await Category.create(c);
        }
        map.set(c.name, existing._id);
    }
    return map;
}

async function main() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI missing in .env");

    await mongoose.connect(mongoUri);
    console.log("✅ Mongo connected");

    const catMap = await ensureCategories();
    console.log("✅ Categories ready:", [...catMap.keys()].join(", "));

    // Агар мехоҳӣ пешинаро пок кунӣ, инро кушо:
    // await Product.deleteMany({});
    // console.log("🧹 Products cleared");

    const target = 200;
    const cats = [...catMap.keys()];

    const docs = [];
    for (let i = 0; i < target; i++) {
        const catName = cats[i % cats.length]; // баробар тақсим
        const categoryId = catMap.get(catName);

        const name = makeProductName(catName, i);
        const price = priceByCategory(catName);
        const stock = randInt(0, 200);

        docs.push({
            name,
            price,
            stock,
            categoryId,
            favorite: Math.random() < 0.12, // ~12% favorites
        });
    }

    // Барои avoid duplicate name (агар unique надорӣ, мушкил нест)
    const inserted = await Product.insertMany(docs, { ordered: false });
    console.log(`🎉 Inserted products: ${inserted.length}`);

    await mongoose.disconnect();
    console.log("✅ Done");
}

main().catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
});
