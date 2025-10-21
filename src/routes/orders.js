import { Router } from 'express';
import { createOrder, getOrders, getOrdersByName, getOrderSummaryByName, deleteOrderWithRestore } from '../controllers/ordersController.js';

const r = Router();

r.get('/', getOrders);
r.get('/search', getOrdersByName);
r.get('/summary', getOrderSummaryByName);
r.post('/', createOrder);
r.delete('/:id', deleteOrderWithRestore);

export default r;