# 🎓 After School Backend

A lightweight **Node.js + Express + MongoDB Atlas** REST API that powers the [After School Frontend](https://przemyslawgromiec.github.io/after-school-frontend/).  
This backend manages lessons and orders for an after-school booking platform.

---

## Features

 **Lessons API**
- Retrieve all lessons (`GET /api/lessons`)
- Update lesson availability (`PUT /api/lessons/:id`)

 **Orders API**
- Create new orders and decrease lesson spaces (`POST /api/orders`)
- Retrieve all orders (`GET /api/orders`)
- Search orders by customer name (`GET /api/orders/summary?name=...`)
- Delete orders and restore spaces (`DELETE /api/orders/:id`)

 **Extras**
- Logger middleware using **morgan**
- Static file serving for lesson images
- CORS configuration for both **localhost** and **GitHub Pages**
- Seed script to populate the database

---

##  Tech Stack
- **Node.js** – runtime environment  
- **Express.js** – web framework for API routing  
- **MongoDB Atlas** – cloud database  
- **dotenv** – environment configuration  
- **morgan** – request logging  
- **cors** – cross-origin resource sharing  