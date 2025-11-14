import { Router } from 'express';
import { listLessons, updateLesson, updateLessonSpaces } from '../controllers/lessonsController.js';

const r = Router();
r.get('/', listLessons);
r.put('/:id', updateLesson);
r.patch('/:id/spaces', updateLessonSpaces);

export default r;