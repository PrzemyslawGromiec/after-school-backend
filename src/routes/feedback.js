import { Router } from 'express';
import { listFeedback, submitFeedback } from '../controllers/feedbackController.js';

const r = Router();
r.post('/', submitFeedback);
r.get('/', listFeedback);

export default r;