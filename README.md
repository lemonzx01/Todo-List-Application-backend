# Todo List API

RESTful API Server สำหรับแอป Todo List (เพิ่ม / ดู / แก้ไข / ลบรายการ todo) เก็บข้อมูลในฐานข้อมูล PostgreSQL
ใช้คู่กับ Frontend (React + Vite) ที่เรียก API นี้ผ่าน `http://localhost:3000/api`
(repo [Todo-List-Application](https://github.com/lemonzx01/Todo-List-Application))

## Tech Stack

- **Node.js** + **TypeScript** (strict mode)
- **Express 5**: web framework
- **pg** (node-postgres): เชื่อมต่อ PostgreSQL ด้วย connection pool
- **dotenv**: อ่านค่าตั้งค่าจากไฟล์ `.env`
- **cors**: อนุญาตให้ frontend ที่รันคนละ port เรียก API ได้
- **tsx**: รัน TypeScript ตรง ๆ ตอนพัฒนา (auto-reload เมื่อแก้ไฟล์)

## สิ่งที่ต้องติดตั้งก่อน

- Node.js 20 ขึ้นไป (แนะนำเวอร์ชัน LTS ล่าสุด)
- PostgreSQL 17 (ติดตั้งแบบปกติบน Windows, รันเป็น service ที่ port 5432)

## วิธีติดตั้งและรัน

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่าไฟล์ `.env`

คัดลอก `.env.example` เป็น `.env` (ถ้ายังไม่มี)

```powershell
Copy-Item .env.example .env
```

แล้วเปิด `.env` ใส่รหัสผ่าน PostgreSQL ของคุณที่บรรทัด `DB_PASSWORD=`

| ตัวแปร        | ค่าเริ่มต้น              | ความหมาย                                  |
| ------------- | ----------------------- | ----------------------------------------- |
| `PORT`        | `3000`                  | port ของ API                              |
| `DB_HOST`     | `localhost`             | ที่อยู่ของ PostgreSQL                       |
| `DB_PORT`     | `5432`                  | port ของ PostgreSQL                       |
| `DB_USER`     | `postgres`              | ชื่อผู้ใช้ PostgreSQL                         |
| `DB_PASSWORD` | (ว่าง)                   | รหัสผ่าน PostgreSQL (ต้องใส่เอง)             |
| `DB_NAME`     | `todo_db`               | ชื่อฐานข้อมูล                                |
| `CORS_ORIGIN` | `http://localhost:5173` | origin ของ frontend ที่อนุญาตให้เรียก API    |

> ไฟล์ `.env` อยู่ใน `.gitignore` แล้ว รหัสผ่านจะไม่ถูกอัปขึ้น GitHub

### 3. สร้างฐานข้อมูลและตาราง

`psql` มักไม่อยู่ใน PATH บน Windows จึงต้องเรียกด้วย path เต็ม (รันใน PowerShell ที่โฟลเดอร์โปรเจกต์นี้ ระบบจะถามรหัสผ่าน postgres)

```powershell
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE todo_db;"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -d todo_db -f database/init.sql
```

ไฟล์ [`database/init.sql`](database/init.sql) จะสร้างตาราง `todos`

| คอลัมน์       | ชนิด          | หมายเหตุ                 |
| ------------ | ------------- | ----------------------- |
| `id`         | `SERIAL`      | primary key             |
| `title`      | `VARCHAR(255)`| ห้ามว่าง                 |
| `completed`  | `BOOLEAN`     | ค่าเริ่มต้น `false`       |
| `created_at` | `TIMESTAMPTZ` | เวลาที่สร้าง              |
| `updated_at` | `TIMESTAMPTZ` | เวลาที่แก้ไขล่าสุด         |

### 4. รันเซิร์ฟเวอร์

```bash
npm run dev
```

ถ้าเชื่อมต่อฐานข้อมูลได้ จะเห็นข้อความ `Todo API is running at http://localhost:3000/api/todos`
(ถ้าเห็น `Cannot connect to PostgreSQL` ให้ตรวจค่า `DB_*` ใน `.env` อีกครั้ง)

คำสั่งอื่น ๆ

| คำสั่ง               | ทำอะไร                                         |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | รันโหมดพัฒนา (รีสตาร์ตอัตโนมัติเมื่อแก้โค้ด)          |
| `npm run typecheck` | ตรวจ type ของ TypeScript อย่างเดียว ไม่สร้างไฟล์    |
| `npm run build`     | คอมไพล์ TypeScript เป็น JavaScript ไว้ที่ `dist/` |
| `npm start`         | รันเวอร์ชันที่ build แล้ว (`dist/index.js`)       |
| `npm run test:api`  | รันชุดทดสอบ Postman ด้วย newman (ต้องเปิดเซิร์ฟเวอร์ไว้ก่อน) |

## API Endpoints

Base URL: `http://localhost:3000/api`
ทุก request ที่มี body ต้องส่ง header `Content-Type: application/json`

หน้าตาของ Todo หนึ่งรายการ

```json
{
  "id": 1,
  "title": "อ่านหนังสือ",
  "completed": false,
  "createdAt": "2026-10-13T08:00:00.000Z",
  "updatedAt": "2026-10-13T08:00:00.000Z"
}
```

| Method   | Path             | Body                                     | สำเร็จ                  | Error ที่เป็นไปได้ |
| -------- | ---------------- | ---------------------------------------- | ---------------------- | ----------------- |
| `GET`    | `/api/todos`     | -                                        | `200` Todo[] (ใหม่สุดก่อน) | `500`             |
| `GET`    | `/api/todos/:id` | -                                        | `200` Todo             | `400`, `404`      |
| `POST`   | `/api/todos`     | `{"title": "..."}`                       | `201` Todo ที่สร้าง      | `400`             |
| `PATCH`  | `/api/todos/:id` | `{"title"?: "...", "completed"?: true}`  | `200` Todo ที่แก้แล้ว      | `400`, `404`      |
| `DELETE` | `/api/todos/:id` | -                                        | `204` (ไม่มี body)       | `400`, `404`      |

### ตัวอย่าง

**เพิ่ม todo**

```http
POST /api/todos
Content-Type: application/json

{ "title": "อ่านหนังสือ" }
```

ตอบกลับ `201 Created`

```json
{ "id": 1, "title": "อ่านหนังสือ", "completed": false, "createdAt": "2026-10-13T08:00:00.000Z", "updatedAt": "2026-10-13T08:00:00.000Z" }
```

**ดูทั้งหมด**: `GET /api/todos` ตอบกลับ `200 OK`

```json
[
  { "id": 2, "title": "ออกกำลังกาย", "completed": false, "createdAt": "2026-10-13T08:05:00.000Z", "updatedAt": "2026-10-13T08:05:00.000Z" },
  { "id": 1, "title": "อ่านหนังสือ", "completed": false, "createdAt": "2026-10-13T08:00:00.000Z", "updatedAt": "2026-10-13T08:00:00.000Z" }
]
```

**ทำเครื่องหมายว่าเสร็จแล้ว**

```http
PATCH /api/todos/1
Content-Type: application/json

{ "completed": true }
```

ตอบกลับ `200 OK` (สังเกตว่า `updatedAt` เปลี่ยน)

```json
{ "id": 1, "title": "อ่านหนังสือ", "completed": true, "createdAt": "2026-10-13T08:00:00.000Z", "updatedAt": "2026-10-13T08:10:00.000Z" }
```

**ลบ todo**: `DELETE /api/todos/1` ตอบกลับ `204 No Content` (body ว่าง)

### กฎการตรวจข้อมูล

- `title` ต้องเป็น string ระบบจะตัดช่องว่างหัว-ท้ายออก แล้วต้องยาว 1-255 ตัวอักษร (นับแบบเดียวกับ `VARCHAR(255)` คือ emoji 1 ตัว = 1 ตัวอักษร)
- `completed` ต้องเป็น boolean (`true` / `false`) เท่านั้น
- `PATCH` ต้องส่งอย่างน้อยหนึ่ง field (`title` หรือ `completed`) field อื่นที่ส่งมาจะถูกละเลย
- `:id` ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 2147483647 (เช่น `abc`, `0`, `-1`, `1.5`, `2147483648`, `%ZZ` จะได้ `400`)

## รูปแบบ Error

ทุก error ตอบกลับเป็น JSON รูปแบบเดียวกัน

```json
{ "message": "title is required" }
```

| Status | เกิดเมื่อ                                                         |
| ------ | --------------------------------------------------------------- |
| `400`  | ข้อมูลไม่ถูกต้อง, `:id` ไม่ถูกต้อง หรือ JSON ใน body ผิดรูปแบบ          |
| `404`  | ไม่พบ todo id นั้น หรือเรียก path ที่ไม่มีอยู่ (`{"message": "Not found"}`) |
| `500`  | error ที่ไม่คาดคิด (`{"message": "Internal server error"}`) รายละเอียดจริงจะ log ไว้ที่ terminal ของเซิร์ฟเวอร์ |

## ทดสอบด้วย Postman

มี Postman collection อยู่ที่ [`postman/Todo-API.postman_collection.json`](postman/Todo-API.postman_collection.json)
มี 25 request แบ่งเป็น 2 โฟลเดอร์: `1. CRUD (happy path)` และ `2. Validation & errors`
ชุดทดสอบจะลบ todo ทุกตัวที่สร้างขึ้นเองเมื่อรันจบ ข้อมูลเดิมในฐานข้อมูลจึงไม่เปลี่ยน

ต้องเปิดเซิร์ฟเวอร์ไว้ก่อน (`npm run dev` ในอีก terminal หนึ่ง) แล้วเลือกวิธีใดวิธีหนึ่ง

- **ใช้ Postman**: เปิด Postman > Import > เลือกไฟล์ด้านบน แล้วกด Run collection
- **ใช้ command line** (ไม่ต้องติดตั้ง Postman, ใช้ [newman](https://www.npmjs.com/package/newman) ผ่าน `npx`):

  ```bash
  npm run test:api
  ```

  ถ้าเซิร์ฟเวอร์ไม่ได้รันที่ port 3000 ให้ระบุ `baseUrl` เอง เช่น

  ```bash
  npx -y newman run postman/Todo-API.postman_collection.json --env-var baseUrl=http://localhost:3001/api
  ```

## โครงสร้างโปรเจกต์

```
Todo-List-Application-backend/
├── database/
│   └── init.sql            # SQL สร้างตาราง todos
├── postman/
│   └── Todo-API.postman_collection.json
├── src/
│   ├── index.ts            # จุดเริ่มโปรแกรม: โหลด .env, เช็กการเชื่อมต่อ DB, เปิดเซิร์ฟเวอร์
│   ├── app.ts              # สร้าง Express app: CORS, JSON parser, routes, 404, error handler
│   ├── db.ts               # connection pool ไปยัง PostgreSQL
│   ├── http-error.ts       # class HttpError สำหรับโยน error พร้อม status code
│   └── routes/
│       └── todos.ts        # 5 endpoints ของ /api/todos + การตรวจข้อมูล
├── .env.example            # ตัวอย่างค่าตั้งค่า (คัดลอกเป็น .env)
├── .gitignore              # ไฟล์ที่ไม่อัปขึ้น GitHub (node_modules, dist, .env)
├── package.json
├── package-lock.json       # ล็อกเวอร์ชันของ dependencies ให้ทุกเครื่องติดตั้งได้เหมือนกัน
└── tsconfig.json
```
