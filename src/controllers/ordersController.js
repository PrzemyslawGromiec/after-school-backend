import { col, ObjectId } from '../db.js';

function isValidPhone(s) { return /^\+?[0-9\s-]{7,15}$/.test(s || ''); }

// POST /api/orders { customer:{name,phone} | {name,phone}, items:[{id,qty}] }
export async function createOrder(req, res, next) {
  try {
    const body = req.body || {};
    const name  = (body?.customer?.name || body?.name || '').trim();
    const phone = (body?.customer?.phone || body?.phone || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (name.length < 2 || !isValidPhone(phone) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    let total = 0;
    const lessonIDs = [];
    const spacesArr = [];
    const updated = [];

    for (const it of items) {
      const id  = it.id;
      const qty = Math.max(1, Number(it.qty || 1));
      const upd = await col('lessons').findOneAndUpdate(
        { _id: new ObjectId(id), space: { $gte: qty } },
        { $inc: { space: -qty } },
        { returnDocument: 'after' }
      );
      if (!upd.value) return res.status(400).json({ error: `Not enough space for ${id}` });

      total += Number(upd.value.price) * qty;
      lessonIDs.push(new ObjectId(id));
      spacesArr.push(qty);
      updated.push({ id: upd.value._id, space: upd.value.space });
    }

    const doc = { name, phone, lessonIDs, spaces: spacesArr, total, createdAt: new Date() };
    const { insertedId } = await col('orders').insertOne(doc);

    res.status(201).json({ orderId: insertedId, total, updated });
  } catch (e) { next(e); }
}