import { Router } from 'express';
import { createOrder } from '../controllers/ordersController.js';

const r = Router();
r.post('/', createOrder);
r.get('/_ping', (req,res)=>res.json({ ok:true }));

export default r;