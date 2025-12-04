import { col, ObjectId } from "../db.js";

export async function submitFeedback(req, res, next) {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res
        .status(400)
        .json({ error: "Name, email, and message are required" });
    }

    const fields = [name, email, message];

    if (fields.some((f) => typeof f !== "string" || f.trim().length === 0)) {
      console.log("Invalid input data:", req.body);
      return res.status(400).json({ error: "Invalid input data" });
    }

    const doc = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: new Date(),
    };

    const result = await col("feedback").insertOne(doc);
    return res
      .status(201)
      .json({
        message: "Feedback submitted successfully",
        id: result.insertedId,
      });
  } catch (e) {
    next(e);
  }
}

export async function listFeedback(req, res, next) {
  try {
    const feedbacks = await col("feedback")
      .find()
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
    return res.json(feedbacks);
  } catch (e) {
    next(e);
  }
}

export async function deleteFeedbackById(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid id format" });
    }

    const objectId = ObjectId.createFromHexString(id);

    const result = await col("feedback").findOneAndDelete({ _id: objectId });
    console.log("findOneAndDelete result:", result);

    const deletedDoc = result?.value ?? result;

    if (!deletedDoc) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    return res.json({
      message: `Feedback from ${deletedDoc.email} deleted successfully`,
      id: deletedDoc._id,
    });
  } catch (e) {
    next(e);
  }
}

export async function deleteAllFeedback(req, res, next) {
  try {
    const { confirm } = req.query;

    // Extra confirmation layer
    if (confirm !== "DELETE_ALL_FEEDBACK") {
      return res.status(400).json({
        error: "Confirmation required. Use ?confirm=DELETE_ALL_FEEDBACK"
      });
    }

    const result = await col("feedback").deleteMany({});

    return res.json({
      message: "All feedback deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (e) {
    next(e);
  }
}
