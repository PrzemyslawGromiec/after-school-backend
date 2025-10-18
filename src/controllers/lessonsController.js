import {col, ObjectId} from '../db.js';

// GET /api/lessons?q=&sort=&dir=
export async function listLessons(req, res, next) {
  try {
    const { q, sort = 'topic', dir = 'asc' } = req.query;
    const filter = q ? {
      $or: [
        { topic:    { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } }
      ]
    } : {};
    const sortObj = { [sort]: dir === 'desc' ? -1 : 1 };

    const docs = await col('lessons').find(filter).sort(sortObj).limit(500).toArray();

    const items = docs.map(d => ({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image
    }));
    res.json(items);
  } catch (e) { next(e); }
}

// PUT /api/lessons/:id
export async function updateLesson(req, res, next) {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    if (patch.spaces != null && patch.space == null) {
      patch.space = patch.spaces;
      delete patch.spaces;
    }

    const out = await col('lessons').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: patch },
      { returnDocument: 'after' }
    );
    if (!out.value) return res.status(404).json({ error: 'not found' });

    const d = out.value;
    res.json({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image
    });
  } catch (e) { next(e); }
}