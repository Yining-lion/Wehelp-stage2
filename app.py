from fastapi import *
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import mysql.connector.pooling
from typing import Annotated
import json
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
import os
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
import jwt

# 載入環境變數
load_dotenv()

app = FastAPI()

# 建立連線池
dbconfig = {
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME")
}
cnxpool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=int(os.getenv("DB_POOL_SIZE")),
    **dbconfig
)

# 密碼使用 bcrypt 加鹽雜湊加密
pwd_context = CryptContext(
    schemes=["bcrypt"],
    bcrypt__rounds=10,
    deprecated="auto"
)

# 從 HTTP Header 的 Authorization 抓出 token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/auth")

# 定義 Schema
class UserSignUp(BaseModel):
    name: str
    email: str
    password: str

class UserSignIn(BaseModel):
    email: str
    password: str

# 設置 JWT 參數
SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("JWT_ALGORITHM")
ACCESS_TOKEN_EXPIRE_DAYS = 7

# 產生 JWT Token
def create_access_token(data: dict, expires_delta: timedelta = timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)):
    to_encode = data.copy()  # 創建一個 data 字典的淺拷貝，避免修改原始 data 字典
    expire = datetime.now(timezone.utc) + expires_delta  # 計算過期時間
    to_encode.update({"exp": expire})  # 更新過期時間
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)  # 編碼 JWT
    return encoded_jwt  # print 出 Header.Payload.Signature

# 驗證 token 並回傳使用者資料
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    # 建立例外錯誤物件
    credentials_exception = HTTPException(
        status_code=401,
        detail="無效的驗證憑證",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)  # 解碼 JWT token，驗證它的 signature 是否正確
        user_id = payload.get("id")  # 取得登入時 create_access_token() 傳入至 payload 的 data id
        if user_id is None:
            raise credentials_exception
    except InvalidTokenError:
        raise credentials_exception

    # 成功解析 token 後，從資料庫取得使用者資訊
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if user is None:
            raise credentials_exception
        return user
    finally:
        cursor.close()
        cnx.close()

# 註冊 API
@app.post("/api/user")
async def signUp(user: UserSignUp):
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor()
        cursor.execute("SELECT id FROM users WHERE email = %s", (user.email,))
        if cursor.fetchone():
            return {"error": True, "message": "註冊失敗，Email已被註冊過"}

        hashed_password = pwd_context.hash(user.password)
        cursor.execute("INSERT INTO users (name, email, hashed_password) VALUES (%s, %s, %s)", (user.name, user.email, hashed_password))
        cnx.commit()
        return {"ok": True}

    except Exception as e:
        return {"error": True, "message": str(e)}

    finally:
        cursor.close()
        cnx.close()

# 登入 API
@app.put("/api/user/auth")
async def signIn(user: UserSignIn):
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, hashed_password FROM users WHERE email = %s", (user.email,))
        user_data = cursor.fetchone()
        if user_data == None or pwd_context.verify(user.password, user_data['hashed_password']) == False:
            return {"error": True, "message": "登入失敗，帳號或密碼輸入錯誤"}
        token = create_access_token({"id": user_data["id"], "name": user_data["name"], "email": user_data["email"]})
        return {"token": token}

    except Exception as e:
        return {"error": True, "message": str(e)}

    finally:
        cursor.close()
        cnx.close()

# 取得當前登入的會員資訊
@app.get("/api/user/auth")
async def getUser(current_user: Annotated[dict, Depends(get_current_user)]): 
    return {"data": current_user}

base_sql = "SELECT id, name, description, category, address, transport, mrt, images FROM taipei_attractions "

@app.get("/api/attractions")
async def getAttractions(
    request: Request,
    page: Annotated[int, Query(ge=0)] = 0,
    keyword: Annotated[str, Query()] = None
):
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        # 處理 page：要取得的分頁，每頁 12 筆資料
        data_count = 12
        offset = data_count * page
        cursor.execute(base_sql + "LIMIT %s OFFSET %s", (data_count, offset))
        result = cursor.fetchall()

        # 計算 table 總數量
        cursor.execute("SELECT COUNT(*) FROM taipei_attractions")
        table_len = cursor.fetchone()["COUNT(*)"]

        # 處理 keyword：用來完全比對捷運站名稱、或模糊比對景點名稱的關鍵字，沒有給定則不做篩選
        if keyword:
            cursor.execute(base_sql + "WHERE mrt = %s OR name LIKE %s LIMIT %s OFFSET %s", (keyword, f"%{keyword}%", data_count, offset))
            result = cursor.fetchall()
            # 計算符合 keyword 條件的總數量
            cursor.execute("SELECT COUNT(*) FROM taipei_attractions WHERE mrt = %s OR name LIKE %s", (keyword, f"%{keyword}%"))
            table_len = cursor.fetchone()["COUNT(*)"]

        # 解析 images JSON 格式
        for row in result:
            row["images"] = json.loads(row["images"])

        # 處理 nextPage
        next_page = page + 1
        if data_count * (page + 1) >= table_len:
            next_page = None
        return {"nextPage": next_page, "data": result}

    except Exception as e:
        return {"error": True, "message": str(e)}

    finally:
        cursor.close()
        cnx.close()

@app.get("/api/attraction/{attractionId}")
async def getAttraction(
    request: Request,
    attractionId: Annotated[int, Path()]
):
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute(base_sql + "WHERE id = %s", (attractionId,))
        attraction = cursor.fetchone()
        attraction["images"] = json.loads(attraction["images"])
        if attraction == None:
            return {"error": True, "message": "景點編號不正確"}

        return {"data": attraction}

    except Exception as e:
        return {"error": True, "message": str(e)}

    finally:
        cursor.close()
        cnx.close()

@app.get("/api/mrts")
async def getMrts(request: Request):
    try:
        cnx = cnxpool.get_connection()
        cursor = cnx.cursor(dictionary=True)
        cursor.execute("""SELECT mrt, COUNT(*) AS attraction_count FROM taipei_attractions
                          GROUP BY mrt ORDER BY attraction_count DESC""")
        result = cursor.fetchall()  # [{'mrt': '新北投', 'attraction_count': 6}, ...]
        mrts = [row["mrt"] for row in result if row["mrt"] is not None]
        return {"data": mrts}

    except Exception as e:
        return {"error": True, "message": str(e)}

    finally:
        cursor.close()
        cnx.close()

app.mount("/static", StaticFiles(directory="static"), name="static")

# Static Pages (Never Modify Code in this Block)
@app.get("/", include_in_schema=False)
async def index(request: Request):
    return FileResponse("./static/index.html", media_type="text/html")

@app.get("/attraction/{id}", include_in_schema=False)
async def attraction(request: Request, id: int):
    return FileResponse("./static/attraction.html", media_type="text/html")

@app.get("/booking", include_in_schema=False)
async def booking(request: Request):
    return FileResponse("./static/booking.html", media_type="text/html")

@app.get("/thankyou", include_in_schema=False)
async def thankyou(request: Request):
    return FileResponse("./static/thankyou.html", media_type="text/html")
