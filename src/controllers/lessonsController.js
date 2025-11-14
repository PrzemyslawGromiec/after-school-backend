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

// PATCH /api/lessons/:id/spaces
export async function updateLessonSpaces(req, res, next) {
  try {
    const { id } = req.params;

    // 1) validate id
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid lesson id' });
    }
    const _id = new ObjectId(id);

    // 2) validate delta
    const { delta } = req.body;
    if (typeof delta !== 'number') {
      return res.status(400).json({ error: 'delta (number) is required' });
    }

    const lessons = col('lessons');

    // 3) update the document
    const upd = await lessons.updateOne(
      { _id },
      { $inc: { space: delta } }
    );

    if (upd.matchedCount === 0) {
      // no document with this _id
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 4) read the updated document
    const d = await lessons.findOne({ _id });

    if (!d) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // 5) map DB → API shape
    return res.json({
      _id: d._id,
      subject: d.topic,
      location: d.location,
      price: d.price,
      spaces: d.space,
      image: d.image
    });

  } catch (err) {
    console.error('updateLessonSpaces error:', err);
    next(err);
  }
}