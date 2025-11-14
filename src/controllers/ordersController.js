import { col, ObjectId } from "../db.js";

function isValidPhone(s) {
  return /^\+?[0-9\s-]{7,15}$/.test(s || "");
}

// POST /api/orders  { customer:{name,phone}, items:[{id,qty}] }
export async function createOrder(req, res, next) {
  try {
    const body = req.body || {};
    const name = (body?.customer?.name || body?.name || "").trim();
    const phone = (body?.customer?.phone || body?.phone || "").trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (name.length < 2 || !isValidPhone(phone) || items.length === 0) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log("BODY:", req.body);

    let total = 0;
    const lessonIDs = [];
    const spacesArr = [];
    const updated = [];

    for (const it of items) {
      const id = String(it.id);
      const qty = Math.max(1, Number(it.qty || 1));

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: `Invalid lesson id: ${id}` });
      }

      const _id = ObjectId.createFromHexString(id);

      console.log("Checking lesson:", {
        id,
        qty,
        filter: { _id, space: { $gte: qty } },
      });

      // 1) Try to decrement space if enough is available
      const updResult = await col("lessons").updateOne(
        { _id, space: { $gte: qty } },
        { $inc: { space: -qty } }
      );

      console.log("updateOne result:", updResult);

      // If no doc matched, either lesson not found or not enough space
      if (updResult.matchedCount === 0) {
        return res
          .status(400)
          .json({ error: `Not enough space for lesson ${id}` });
      }

      // 2) Read updated lesson
      const doc = await col("lessons").findOne({ _id });
      console.log("Updated lesson:", doc);

      if (!doc) {
        return res
          .status(400)
          .json({ error: `Lesson ${id} not found after update` });
      }

      // 3) Use updated doc to compute totals
      total += Number(doc.price) * qty;
      lessonIDs.push(_id);
      spacesArr.push(qty);
      updated.push({ id: doc._id, space: doc.space });
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
