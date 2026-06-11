import sqlite3

conn = sqlite3.connect('temples.db')

temples_to_add = [
    {
        "serial_no": "101",
        "name": "臺北稻荷神社",
        "new_name": "西門紅樓旁（原址今為民居，已不存）",
        "address": "臺北市萬華區成都路（西門紅樓旁）",
        "lat": 25.0435,
        "lng": 121.5085,
        "start_year": 1911,
        "end_year": 1945,      # 現存的話填 None
        "description": "1910年籌建、1911年6月25日鎮座，位於西門市場（今西門紅樓）旁，主祀倉稻魂命（稻荷神）。為日治時期民間創建神社中首座升格鄉社者（1937年列格）。二戰台北大空襲受損，戰後拆除，今已不存，原址一帶為成都路民居。",
    },
    # 繼續加更多筆...
]

for t in temples_to_add:
    conn.execute('''
        INSERT INTO temples 
            (serial_no, name, new_name, address, lat, lng, start_year, end_year, description)
        VALUES 
            (:serial_no, :name, :new_name, :address, :lat, :lng, :start_year, :end_year, :description)
    ''', t)

conn.commit()
conn.close()
print("新增完成！")
