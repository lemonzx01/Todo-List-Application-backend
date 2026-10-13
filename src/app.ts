import cors from "cors";
import express from "express";
import type { Express, NextFunction, Request, Response } from "express";
import { HttpError } from "./http-error.js";
import { todosRouter } from "./routes/todos.js";

// สร้าง Express app พร้อม middleware และ routes ทั้งหมด
// แยกออกจาก index.ts (ที่สั่ง listen) เพื่อให้อ่านง่าย และนำ app ไปทดสอบได้โดยไม่ต้องเปิด port
export function createApp(): Express {
  const app = express();

  // CORS: อนุญาตให้ frontend ที่รันคนละ port (เช่น Vite :5173) เรียก API นี้ได้
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type"],
    }),
  );

  // อ่าน body ที่เป็น JSON มาไว้ใน req.body
  app.use(express.json());

  app.use("/api/todos", todosRouter);

  // ไม่ตรงกับ route ไหนเลย => 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(errorHandler);

  return app;
}

// error ที่ Express สร้างเองเมื่อ client ส่ง request ผิด จะมี status 4xx ติดมาด้วย เช่น
// - express.json() อ่าน body ที่เป็น JSON ผิดรูปแบบไม่ได้ (status 400, type = "entity.parse.failed")
// - router ถอดรหัส % ใน URL ไม่ได้ เช่น /api/todos/%ZZ (status 400, เป็น URIError)
function isClientError(error: unknown): error is Error & { status: number } {
  return (
    error instanceof Error &&
    "status" in error &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}

// เลือกข้อความ error ที่อ่านเข้าใจง่ายให้ client แทนข้อความเทคนิคจาก library
function clientErrorMessage(error: Error): string {
  if ("type" in error && error.type === "entity.parse.failed") {
    return "Malformed JSON body";
  }
  if (error instanceof URIError) {
    return "Invalid id"; // route เดียวที่มี parameter ใน URL คือ /:id
  }
  return error.message;
}

// Error handler กลาง: Express รู้ว่าเป็นตัวจัดการ error เพราะมี 4 parameter
// ทุก error จะถูกตอบกลับในรูปแบบเดียวกันคือ {"message": "..."}
function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // error ที่เราโยนเองใน routes (400 ข้อมูลไม่ถูกต้อง, 404 ไม่พบ todo)
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (isClientError(error)) {
    res.status(error.status).json({ message: clientErrorMessage(error) });
    return;
  }

  // error ที่ไม่คาดคิด (เช่น ต่อ DB ไม่ได้): log ตัวจริงไว้ดูที่ server แต่ไม่ส่งรายละเอียดให้ client
  console.error(error);
  res.status(500).json({ message: "Internal server error" });
}
