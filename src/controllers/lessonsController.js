import { col, ObjectId } from "../db.js";

// GET /api/lessons?q=&sort=&dir=
export async function listLessons(req, res, next) {
  try {
    const { q, sort = "topic", dir = "asc" } = req.query;
    const filter = q
      ? {
          $or: [
            { topic: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } },
          ],
        }
      : {};
    const sortObj = { [sort]: dir === "desc" ? -1 : 1 };

    const docs = await col("lessons")
      .find(filter)
      .sort(sortObj)
      .limit(500)
      .toArray();

    const items = docs.map((d) => ({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image,
    }));
    res.json(items);
  } catch (e) {
    next(e);
  }
}

// PUT /api/lessons/:id
export async function updateLesson(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson id" });
    }
    const _id = new ObjectId(id);

    // build update object from body
    const patch = req.body || {};
    const update = {};

    // frontend uses: subject, location, price, spaces, image
    // DB uses: topic, location, price, space, image
    if (patch.subject != null) update.topic = patch.subject;
    if (patch.location != null) update.location = patch.location;
    if (patch.price != null) {
      if (typeof patch.price !== "number" || patch.price < 0) {
        return res
          .status(400)
          .json({ error: "price must be a non-negative number" });
      }
      update.price = patch.price;
    }
    if (patch.spaces != null) {
      if (typeof patch.spaces !== "number" || patch.spaces < 0) {
        return res
          .status(400)
          .json({ error: "spaces must be a non-negative number" });
      }
      update.space = patch.spaces;
    }
    if (patch.image != null) update.image = patch.image;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const lessons = col("lessons");

    const upd = await lessons.updateOne({ _id }, { $set: update });

    if (upd.matchedCount === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const d = await lessons.findOne({ _id });

    return res.json({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image,
    });
  } catch (e) {
    next(e);
  }
}

// PATCH /api/lessons/:id/spaces
export async function updateLessonSpaces(req, res, next) {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid lesson id" });
    }
    const _id = new ObjectId(id);

    // validate delta
    const { delta } = req.body;
    if (typeof delta !== "number") {
      return res.status(400).json({ error: "delta (number) is required" });
    }

    const lessons = col("lessons");

    const upd = await lessons.updateOne({ _id }, { $inc: { space: delta } });

    if (upd.matchedCount === 0) {
      // no document with this _id
      return res.status(404).json({ error: "Lesson not found" });
    }

    const d = await lessons.findOne({ _id });

    if (!d) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    return res.json({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image,
    });
  } catch (err) {
    console.error("updateLessonSpaces error:", err);
    next(err);
  }
}
