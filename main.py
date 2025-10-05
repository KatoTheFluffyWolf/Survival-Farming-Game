from google import genai
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

# === Supabase and Gemini Config ===


GEM_KEY = os.getenv("GEM_KEY")
if not GEM_KEY:
    raise RuntimeError("Missing API_KEY env var")
    
# === FastAPI app ===
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://katothefluffywolf.github.io",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_methods=["GET","POST","OPTIONS"],
    allow_headers=["Content-Type"],
)
@app.get("/")
def read_root():
    return {"status": "ok", "message": "Web service is on"}

@app.get("/hint/ai-generated")
def generate_hint():
  client = genai.Client(api_key=GEM_KEY)

  response = client.models.generate_content(
      model="gemini-2.5-flash",
      contents=f"""
        Viết một gợi ý hấp dẫn (chỉ một câu, không tiết lộ trực tiếp) về một Mã Bí Mật trong trò chơi, có phong cách giống như các game 8-bit cổ điển.



        Mã Bí Mật này được kích hoạt bằng cách nhập các phím sau:

        Lên, Lên, Xuống, Xuống, Trái, Phải, Trái, Phải

        (tương đương với chuỗi phím: W W S S A D A D)



        Yêu cầu: Gợi ý phải bằng tiếng Việt. Sử dụng cách nói của thời phong kiến. Khá rõ ràng nhưng không tiết lộ trực tiếp.
        """)
  return response.text

