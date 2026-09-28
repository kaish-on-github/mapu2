/**
 * story.js — 各神社的劇情
 * ------------------------------------------------------------
 * key = 神社編號（和 temple.csv 的「編號」相同）
 *
 * 每個劇情：
 *   title      章節名稱（可省略，省略時顯示神社名）
 *   background 預設背景圖（可省略，省略時用該神社的「過去」照片）
 *   lines      台詞陣列，每一句：
 *     speaker  說話的人；留空 '' = 旁白
 *     text     內容（可用 \n 換行）
 *     image    這一句開始換成這張背景（可省略，會沿用上一張）
 *
 * 沒寫在這裡的神社 → 不會出現劇情按鈕，集章照常運作。
 */
const STORIES = {
  101: {
    title: '第一章・鳥居下',
    lines: [
      { speaker: '', text: '（範例劇情，請改成你自己的內容）\n石階的盡頭，只剩下一座孤零零的鳥居。' },
      { speaker: '老人', text: '你手上那本……是印帳？好久沒看到有人拿著它走到這裡了。' },
      { speaker: '我', text: '這裡以前，是什麼樣子？' },
      { speaker: '老人', text: '你把章蓋下去，就看得到了。', image: 'images/1011.jpeg' },
    ],
  },

  // 102: {
  //   title: '第二章・……',
  //   lines: [
  //     { speaker: '', text: '……' },
  //   ],
  // },
};

function getStory(id) {
  const s = STORIES[id];
  return s && Array.isArray(s.lines) && s.lines.length ? s : null;
}
