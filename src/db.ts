import { Pool } from "pg";

// Pool = กลุ่ม connection ไปยัง PostgreSQL ที่เปิดค้างไว้แล้วหยิบมาใช้ซ้ำ
// ไม่ต้องเปิด-ปิด connection ใหม่ทุกครั้งที่มี request เข้ามา
// ค่าทั้งหมดอ่านจากไฟล์ .env (ถ้าไม่ได้ตั้งไว้จะใช้ค่า default ด้านขวา)
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "todo_db",
});

// ถ้า connection ที่ว่างอยู่หลุด (เช่น DB ถูกปิด) ให้แค่ log ไว้ ไม่ให้ทั้งเซิร์ฟเวอร์ crash
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
