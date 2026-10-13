// โหลดค่าจากไฟล์ .env เข้า process.env (ต้อง import เป็นบรรทัดแรก ก่อนไฟล์อื่นที่อ่าน process.env)
import "dotenv/config";
import { createApp } from "./app.js";
import { pool } from "./db.js";

const port = Number(process.env.PORT) || 3000;

// ลองเชื่อมต่อฐานข้อมูลก่อนเปิดเซิร์ฟเวอร์ ถ้ารหัสผ่านหรือชื่อ DB ใน .env ผิดจะได้รู้ทันที
try {
  await pool.query("SELECT 1");
} catch (error) {
  console.error("Cannot connect to PostgreSQL. Check the DB_* values in your .env file.");
  console.error(error);
  process.exit(1);
}

const app = createApp();

app.listen(port, (error) => {
  if (error) {
    // เช่น port นี้มีโปรแกรมอื่นใช้อยู่แล้ว (EADDRINUSE)
    console.error(`Cannot start server on port ${port}:`, error.message);
    process.exit(1);
  }
  console.log(`Todo API is running at http://localhost:${port}/api/todos`);
});
