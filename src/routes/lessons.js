import { Router } from 'express';
import { listLessons, updateLesson } from '../controllers/lessonsController.js';

const r = Router();
r.get('/', listLessons);
r.put('/:id', updateLesson);

export default r;
