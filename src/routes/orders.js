import { Router } from 'express';
import { createOrder, getOrders, getOrdersByName, getOrderSummaryByName } from '../controllers/ordersController.js';

const r = Router();

r.get('/', getOrders);
r.get('/search', getOrdersByName);
r.get('/summary', getOrderSummaryByName);
r.post('/', createOrder);
r.get('/_ping', (req,res)=>res.json({ ok:true }));

export default r;