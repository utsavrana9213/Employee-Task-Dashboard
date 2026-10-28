import 'dotenv/config';
import app from './app.js';
import { initDb } from './db.js';

const port = Number(process.env.PORT || 4000);
await initDb();
app.listen(port, () => console.log(`TaskFlow API listening on http://localhost:${port}`));
