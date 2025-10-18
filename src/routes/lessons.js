import { Router } from 'express';
import { listLessons, updateLesson } from '../controllers/lessons.controller.js';

const r = Router();
r.get('/', listLessons);
r.put('/:id', updateLesson);

export default r;
