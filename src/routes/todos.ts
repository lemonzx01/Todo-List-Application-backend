import { Router } from "express";
import { pool } from "../db.js";
import { HttpError } from "../http-error.js";

// หน้าตาของ todo ที่ส่งกลับไปให้ client
// createdAt/updatedAt เป็น Date ใน JS แต่ตอนแปลงเป็น JSON จะกลายเป็น ISO string เช่น "2026-10-13T08:00:00.000Z"
interface Todo {
  id: number;
  title: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// คอลัมน์ที่ใช้ทุก query: เปลี่ยนชื่อ snake_case ใน DB ให้เป็น camelCase ตามรูปแบบ JSON ของ API
const TODO_COLUMNS = `id, title, completed, created_at AS "createdAt", updated_at AS "updatedAt"`;

const MAX_ID = 2147483647; // ค่าสูงสุดของคอลัมน์ SERIAL (integer) ใน PostgreSQL
const MAX_TITLE_LENGTH = 255; // ตรงกับ VARCHAR(255) ในตาราง

// ---------- ตัวช่วยตรวจข้อมูล (validation) ----------
// ถ้าข้อมูลไม่ถูกต้องจะ throw HttpError(400) แล้ว error handler ใน app.ts จะตอบกลับให้เอง

// :id ใน URL ต้องเป็นจำนวนเต็ม 1..MAX_ID เท่านั้น ("abc", "0", "-1", "1.5" => 400)
function parseId(raw: string): number {
  const id = Number(raw);
  if (!/^\d+$/.test(raw) || id < 1 || id > MAX_ID) {
    throw new HttpError(400, "Invalid id");
  }
  return id;
}

// body ต้องเป็น JSON object (ถ้า client ไม่ได้ส่ง JSON มา req.body จะเป็น undefined)
function readBody(body: unknown): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}

// title ต้องเป็น string และหลังตัดช่องว่างหัว-ท้ายแล้วต้องยาว 1..255 ตัวอักษร
function parseTitle(value: unknown): string {
  if (typeof value !== "string") {
    throw new HttpError(400, "title must be a string");
  }
  const title = value.trim();
  // นับเป็น "ตัวอักษร" แบบเดียวกับ VARCHAR(255) ของ PostgreSQL
  // (title.length นับ emoji 1 ตัวเป็น 2 จึงใช้ [...title].length ที่แยกทีละตัวอักษรแทน)
  const length = [...title].length;
  if (length < 1 || length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `title must be 1-${MAX_TITLE_LENGTH} characters long`);
  }
  // PostgreSQL เก็บตัวอักษร NUL (\u0000) ไม่ได้ ถ้าปล่อยผ่านไปจะกลายเป็น error 500
  if (title.includes("\u0000")) {
    throw new HttpError(400, "title contains an invalid character");
  }
  return title;
}

function parseCompleted(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new HttpError(400, "completed must be a boolean");
  }
  return value;
}

// ถ้า query ไม่เจอแถวไหนเลย แปลว่าไม่มี todo id นี้ => 404
function firstRowOr404(rows: Todo[]): Todo {
  const todo = rows[0];
  if (!todo) {
    throw new HttpError(404, "Todo not found");
  }
  return todo;
}

// ---------- Routes (ทุก path ในไฟล์นี้จะอยู่ใต้ /api/todos ดูที่ app.ts) ----------
// Express 5 ส่ง error ที่ throw ใน async function ไปให้ error handler อัตโนมัติ ไม่ต้องเขียน try/catch เอง
// ทุก query ใช้ $1, $2 (parameterized query) เพื่อกัน SQL injection ห้ามต่อ string ค่าจาก user เข้าไปใน SQL ตรง ๆ

export const todosRouter = Router();

// GET /api/todos - ดึงทั้งหมด เรียงจากใหม่ไปเก่า
todosRouter.get("/", async (_req, res) => {
  const result = await pool.query<Todo>(
    `SELECT ${TODO_COLUMNS} FROM todos ORDER BY created_at DESC, id DESC`,
  );
  res.json(result.rows);
});

// GET /api/todos/:id - ดึงรายการเดียว
todosRouter.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const result = await pool.query<Todo>(`SELECT ${TODO_COLUMNS} FROM todos WHERE id = $1`, [id]);
  res.json(firstRowOr404(result.rows));
});

// POST /api/todos - เพิ่ม todo ใหม่ (completed เริ่มต้นเป็น false จาก DEFAULT ของตาราง)
todosRouter.post("/", async (req, res) => {
  const body = readBody(req.body);
  if (body.title === undefined) {
    throw new HttpError(400, "title is required");
  }
  const title = parseTitle(body.title);

  const result = await pool.query<Todo>(
    `INSERT INTO todos (title) VALUES ($1) RETURNING ${TODO_COLUMNS}`,
    [title],
  );
  res.status(201).json(result.rows[0]);
});

// PATCH /api/todos/:id - แก้ title และ/หรือ completed (ส่งมาเฉพาะ field ที่ต้องการแก้)
todosRouter.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const body = readBody(req.body);
  if (body.title === undefined && body.completed === undefined) {
    throw new HttpError(400, "Provide at least one of: title, completed");
  }
  // null = "ไม่ต้องแก้ field นี้"
  const title = body.title === undefined ? null : parseTitle(body.title);
  const completed = body.completed === undefined ? null : parseCompleted(body.completed);

  // COALESCE($1, title) = ถ้า $1 เป็น null ให้ใช้ค่าเดิมในตาราง
  const result = await pool.query<Todo>(
    `UPDATE todos
     SET title = COALESCE($1, title),
         completed = COALESCE($2, completed),
         updated_at = NOW()
     WHERE id = $3
     RETURNING ${TODO_COLUMNS}`,
    [title, completed, id],
  );
  res.json(firstRowOr404(result.rows));
});

// DELETE /api/todos/:id - ลบ todo สำเร็จตอบ 204 (ไม่มี body)
todosRouter.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
  if (result.rowCount === 0) {
    throw new HttpError(404, "Todo not found");
  }
  res.status(204).end();
});
