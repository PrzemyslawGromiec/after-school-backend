import { Router } from 'express';
import { listFeedback, submitFeedback, deleteFeedbackById ,deleteAllFeedback } from '../controllers/feedbackController.js';
import { requireAdminKey } from '../middleware/auth.js';

const r = Router();
r.post('/', submitFeedback);
r.get('/', listFeedback);
r.delete("/all", requireAdminKey, deleteAllFeedback);
r.delete('/:id', deleteFeedbackById);

export default r;