import { Router } from 'express';
import { listFeedback, submitFeedback, deleteFeedbackById } from '../controllers/feedbackController.js';

const r = Router();
r.post('/', submitFeedback);
r.get('/', listFeedback);
r.delete('/:id', deleteFeedbackById);

export default r;