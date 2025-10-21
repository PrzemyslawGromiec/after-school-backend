import { col, ObjectId } from '../db.js';

function isValidPhone(s) {
  return /^\+?[0-9\s-]{7,15}$/.test(s || '');
}

// POST /api/orders  { customer:{name,phone}, items:[{id,qty}] }
export async function createOrder(req, res, next) {
  try {
    const body = req.body || {};
    const name  = (body?.customer?.name || body?.name || '').trim();
    const phone = (body?.customer?.phone || body?.phone || '').trim();
    const items = Array.isArray(body?.items) ? body.items : [];

    if (name.length < 2 || !isValidPhone(phone) || items.length === 0) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('BODY:', req.body);

    let total = 0;
    const lessonIDs = [];
    const spacesArr = [];
    const updated = [];

    for (const it of items) {
      const id  = String(it.id);
      const qty = Math.max(1, Number(it.qty || 1));

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: `Invalid lesson id: ${id}` });
      }
      
      const _id = ObjectId.createFromHexString(id);

      console.log('Checking lesson:', {
      id, qty,
      filter: { _id, space: { $gte: qty } }
      });

      const check = await col('lessons').findOne({ _id });
      console.log('Found in DB:', check);

      const upd = await col('lessons').findOneAndUpdate(
        { _id, space: { $gte: qty } },
        { $inc: { space: -qty } },
        { returnDocument: 'after' }
      );

      console.log('>> upd:', upd.space, upd.price);

      if (!upd.space) {
        return res.status(400).json({ error: `Not enough space for lesson ${id}` });
      }

      total += Number(upd.price) * qty;
      lessonIDs.push(_id);
      spacesArr.push(qty);
      updated.push({ id: upd._id, space: upd.space });
    }

    const doc = {
      name,
      phone,
      lessonIDs,
      spaces: spacesArr,
      total,
      createdAt: new Date()
    };

    console.log('Inserting order:', doc);

    const { insertedId } = await col('orders').insertOne(doc);
    console.log('Inserted order id:', insertedId);

    res.status(201).json({ orderId: insertedId, total, updated });

  } catch (err) {
    next(err);
  }
}

// GET /api/orders
export async function getOrders(req, res, next) {
  try {
    const orders = await col('orders')
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

export async function getOrdersByName(req, res, next) {
  try {
    const {name} = req.query;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Invalid name parameter and it must be min 2 characters.' });
    }

    const regex = new RegExp(`^${name.trim()}`, 'i');
    const orders = await col('orders')
    .find({ name: { $regex: regex} })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

    if (orders.length === 0) {
      return res.status(404).json({ message: `No orders found for name starting with "${name}"` });
    }

    res.json(orders);
  } catch (err) {
    next(err);
  }
}
