到data開啟終端機
執行
pip install -r requirements.txt
uvicorn main:app --reload

如果第二個不行，請用：
python -m uvicorn main:app --reload
然後再開網頁