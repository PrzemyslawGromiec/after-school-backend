import { connectDB, col } from '../src/db.js';

const data = [
  { topic:'Math',    location:'Hendon',    price:100, space:5, image:'math.png' },
  { topic:'Music',   location:'Colindale', price: 80, space:5, image:'music.png' },
  { topic:'English', location:'Hendon',    price: 90, space:5, image:'eng.png' },
  { topic:'Art',     location:'Brent',     price: 70, space:5, image:'art.png' },
  { topic:'Drama',   location:'Brent',     price: 85, space:5, image:'drama.png' },
  { topic:'Physics', location:'Hendon',    price:110, space:5, image:'physics.png' },
  { topic:'Chem',    location:'Colindale', price:105, space:5, image:'chem.png' },
  { topic:'Bio',     location:'Hendon',    price: 95, space:5, image:'bio.png' },
  { topic:'CS',      location:'Online',    price:120, space:5, image:'cs.png' },
  { topic:'Geo',     location:'Online',    price: 75, space:5, image:'geo.png' }
];

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || 'after_school';

if (!MONGODB_URI) { console.error('Missing MONGODB_URI'); process.exit(1); }

await connectDB(MONGODB_URI, DB_NAME);
await col('lessons').deleteMany({});
await col('lessons').insertMany(data);
console.log('lessons loaded:', await col('lessons').countDocuments());
process.exit(0);
