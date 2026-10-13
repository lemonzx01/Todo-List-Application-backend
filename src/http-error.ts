// Error ที่รู้ status code แน่นอน (เช่น 400, 404)
// โยน (throw) จากที่ไหนก็ได้ใน route แล้ว error handler ใน app.ts จะตอบกลับเป็น {"message": "..."} ให้เอง
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
