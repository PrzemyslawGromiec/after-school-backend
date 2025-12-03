import { col } from "../db";

export async function submitFeedback(req, res, next) {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: "Name, email, and message are required" });
        }

        if (typeof name !== "string" || typeof email !== "string" || typeof message !== "string"
            || name.trim() === "" || email.trim() === "" || message.trim() === ""
            || message.trim.length === 0) {
            return res.status(400).json({ error: "Invalid input data" });
        }
        const doc = {
            name: name.trim(),
            email: email.trim(),
            message: message.trim(),
            submittedAt: new Date()
        };

        const result = await col("feedback").insertOne(doc);
        return res.status(201).json({ message: "Feedback submitted successfully", id: result.insertedId });
    } catch (e) {
        next(e);
    }
}

export async function listFeedback(req, res, next) {
    try {
        const feedbacks = await col("feedback")
        .find()
        .sort({ submittedAt: -1 })
        .limit(100)
        .toArray();
        return res.json(feedbacks);
    } catch (e) {
        next(e);
    }
}