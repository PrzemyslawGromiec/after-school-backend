import { col, ObjectId } from "../db.js";

function sanitizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " "); // collapse multiple spaces
}

function validateName(name) {
  const sanitized = sanitizeName(name);
  if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(sanitized)) return null;
  if (sanitized.length < 2) return null;

  return sanitized;
}

function sanitizePhone(phone) {
  return String(phone || "").trim();
}

function isValidPhone(phone) {
  // allow +, digits, spaces, -, () between 7–15 chars
  return /^\+?[0-9\s\-()]{7,15}$/.test(phone);
}

// POST /api/orders  { customer:{name,phone}, items:[{id,qty}] }
export async function createOrder(req, res, next) {
  try {
    const body = req.body || {};

    const rawName = body?.customer?.name || body?.name || "";
    const rawPhone = body?.customer?.phone || body?.phone || "";

    const name = validateName(rawName);
    const phone = sanitizePhone(rawPhone);
    const items = Array.isArray(body?.items) ? body.items : [];

    if (!name) {
      return res.status(400).json({
        error:
          "Invalid name. Name must contain only letters and single separators.",
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        error:
          "Invalid phone number. Use digits, spaces, +, -, () with 7–15 characters.",
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        error: "No items provided in the order.",
      });
    }

    console.log("BODY:", req.body);

    let total = 0;
    const lessonIDs = [];
    const spacesArr = [];
    const updated = [];

    for (const it of items) {
      const id = String(it.id);
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: `Invalid lesson id: ${id}` });
      }

      const _id = ObjectId.createFromHexString(id);
      const lesson = await col("lessons").findOne({ _id });
      if (!lesson) {
        return res.status(404).json({ error: `Lesson not found: ${id}` });
      }

      const qtyNum = Number(it.qty);
      const qty = Number.isFinite(qtyNum) ? Math.floor(qtyNum) : NaN;

      if (!Number.isFinite(qty) || qty < 1) {
        return res.status(400).json({
          error: `Invalid quantity for "${lesson.topic}" (ID: ${id}): qty must be >= 1`,
        });
      }

      const updResult = await col("lessons").updateOne(
        { _id, space: { $gte: qty } },
        { $inc: { space: -qty } }
      );

      console.log("updateOne result:", updResult);

      if (updResult.matchedCount === 0) {
        return res.status(400).json({
          error: `Not enough space for "${lesson.topic}" (ID: ${id})`,
        });
      }

      const updatedLesson = await col("lessons").findOne({ _id });
      console.log("Updated lesson:", updatedLesson);

      if (!updatedLesson) {
        return res
          .status(400)
          .json({ error: `Lesson ${id} not found after update` });
      }

      total += Number(lesson.price) * qty;
      lessonIDs.push(_id);
      spacesArr.push(qty);
      updated.push({ id: updatedLesson._id, space: updatedLesson.space });
    }

    const doc = {
      name,
      phone,
      lessonIDs,
      spaces: spacesArr,
      total,
      createdAt: new Date(),
    };

    console.log("Inserting order:", doc);

    const { insertedId } = await col("orders").insertOne(doc);
    console.log("Inserted order id:", insertedId);

    res.status(201).json({ orderId: insertedId, total, updated });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders
export async function getOrders(req, res, next) {
  try {
    const orders = await col("orders")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/search?name=...
export async function getOrdersByName(req, res, next) {
  try {
    console.log("QUERY:", req.query);
    const { name } = req.query;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        error: "Invalid name parameter and it must be min 2 characters.",
      });
    }

    const regex = new RegExp(`^${name.trim()}`, "i");
    const orders = await col("orders")
      .find({ name: { $regex: regex } })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    if (orders.length === 0) {
      return res
        .status(404)
        .json({ message: `No orders found for name starting with "${name}"` });
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/summary?name=...
export async function getOrderSummaryByName(req, res, next) {
  try {
    const { name } = req.query;
    if (!name || name.length < 2) {
      return res.status(400).json({
        error:
          'Query parameter "name" is required and must have at least 2 characters.',
      });
    }

    const regex = new RegExp(`^${name}`, "i");
    const pipeline = [
      { $match: { name: { $regex: regex } } },
      { $unwind: { path: "$lessonIDs", includeArrayIndex: "index" } },
      {
        $lookup: {
          from: "lessons",
          localField: "lessonIDs",
          foreignField: "_id",
          as: "lessonInfo",
        },
      },
      { $unwind: "$lessonInfo" },
      {
        $project: {
          _id: 0,
          customer: "$name",
          lesson: "$lessonInfo.topic",
          spacesBooked: { $arrayElemAt: ["$spaces", "$index"] },
        },
      },
    ];

    const results = await col("orders").aggregate(pipeline).toArray();

    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: `No orders found for name starting with "${name}"` });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
}

export async function deleteOrderWithRestore(req, res, next) {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid ID" });
    const _id = ObjectId.createFromHexString(id);

    const order = await col("orders").findOne({ _id });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const ops = (order.lessonIDs || []).map((lessonId, i) => ({
      updateOne: {
        filter: { _id: lessonId },
        update: {
          $inc: { space: Math.max(1, Number(order.spaces?.[i] ?? 1)) },
        },
      },
    }));

    let lessonsResult = { matchedCount: 0, modifiedCount: 0 };
    if (ops.length) {
      const r = await col("lessons").bulkWrite(ops, { ordered: false });
      lessonsResult = {
        matchedCount: r.matchedCount ?? 0,
        modifiedCount: r.modifiedCount ?? 0,
      };
    }

    const del = await col("orders").deleteOne({ _id });

    return res.json({
      message: "Order deleted and lesson spaces restored",
      orderId: id,
      restoredSpaces: (order.lessonIDs || []).map((lid, i) => ({
        lessonId: lid.toString(),
        spaceDelta: Math.max(1, Number(order.spaces?.[i] ?? 1)),
      })),
      stats: lessonsResult,
      deletedCount: del.deletedCount || 0,
    });
  } catch (err) {
    next(err);
  }
}
