import sqlite3
import glob
import os
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles  # 新增這個用來提供靜態圖片

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 💡 掛載圖片資料夾：讓前端可以透過 /images/檔名 來存取圖片
# 只要確保專案目錄下有一個名為 images 的資料夾即可
app.mount("/images", StaticFiles(directory="images"), name="images")

def get_db_connection():
    conn = sqlite3.connect('temples.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/api/temples")
def get_temples(year: int = Query(None, description="查詢特定年份存在的廟宇")):
    conn = get_db_connection()
    
    if year is not None:
        query = '''
            SELECT * FROM temples 
            WHERE start_year <= ? 
            AND (end_year IS NULL OR end_year >= ?)
        '''
        temples = conn.execute(query, (year, year)).fetchall()
    else:
        temples = conn.execute('SELECT * FROM temples').fetchall()
        
    conn.close()
    
    places_data = []
    for row in temples:
        place_dict = dict(row)
        
        # 處理座標精度
        if place_dict['lat'] is not None:
            place_dict['lat'] = round(place_dict['lat'], 6)
        if place_dict['lng'] is not None:
            place_dict['lng'] = round(place_dict['lng'], 6)
            
        # 💡 動態尋找圖片
        # 💡 將原本的 id 改為使用 serial_no
        temple_serial = place_dict['serial_no'] 
        
        # 去 images 資料夾尋找符合 "編號_任何字元.任何副檔名" 的檔案
        # 例如找 302_1.jpg, 102_2.png
        image_paths = glob.glob(f"images/{temple_serial}_*.*")
        
        # 將找到的檔案路徑轉換成前端可以讀取的 URL 網址
        image_urls = []
        for path in image_paths:
            # 替換掉 Windows 可能產生的反斜線，確保網址正確
            clean_path = path.replace("\\", "/") 
            image_urls.append(f"http://127.0.0.1:8000/{clean_path}")
            
        # 把找到的圖片網址陣列加進這筆廟宇資料中
        place_dict['images'] = image_urls
        
        places_data.append(place_dict)
    
    return places_data