import { Router } from 'express';
import { createOrder } from '../controllers/ordersController.js';

const r = Router();
r.post('/', createOrder);

export default r;