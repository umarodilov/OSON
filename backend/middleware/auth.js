import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
    try {
        const h = req.headers.authorization || "";
        const token = h.startsWith("Bearer ") ? h.slice(7) : "";
        if (!token) return res.status(401).json({ message: "No token" });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ message: "Invalid token" });
    }
}

export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: "No token" });
        if (req.user.role !== role) return res.status(403).json({ message: "Forbidden" });
        next();
    };
}
