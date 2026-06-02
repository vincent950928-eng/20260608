// 宣告一個全域變數來儲存攝影機擷取的影像
let capture;

// 初級手語教學內容
let lessons = [
  { word: "你好", desc: "右手握拳，大拇指伸出並向下彎曲兩次 (點頭狀)。" },
  { word: "謝謝", desc: "右手平伸，掌心向內，指尖向上，從額頭附近向前下方移動。" },
  { word: "我愛你", desc: "伸出大拇指、食指和小指 (經典 ILY 手勢)。" },
  { word: "對不起", desc: "右手握拳，大拇指伸出，放在額頭前點兩下。" },
  { word: "漂亮", desc: "五指併攏，掌心向臉部，在臉前輕輕繞一圈。" }
];
let currentLesson = 0;

function setup() {
  // 建立一個全螢幕的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 建立攝影機擷取物件
  capture = createCapture(VIDEO);
  // 隱藏預設的 HTML 影片元素，因為我們將在畫布上繪製它
  capture.hide();
}

function draw() {
  // 設定畫布背景顏色為 e7c6ff
  background('#e7c6ff');
  
  // 計算影像的寬度和高度，為全螢幕的 50%
  let videoW = width * 0.5;
  let videoH = height * 0.5;
  
  // 計算影像在畫布中央的 x 和 y 座標
  let x = (width - videoW) / 2;
  let y = (height - videoH) / 2;
  
  // 儲存目前的繪圖狀態
  push();
  translate(x + videoW, y); // 將原點移動到影像的右邊緣，以便進行水平翻轉
  scale(-1, 1);            // 水平翻轉影像（鏡像效果）
  image(capture, 0, 0, videoW, videoH);
  pop(); // 恢復之前的繪圖狀態

  // 繪製手語教學文字介面
  textAlign(CENTER, CENTER);
  
  // 顯示當前詞彙
  fill(80, 0, 150); // 深紫色文字
  textSize(height * 0.05);
  text("手語練習：" + lessons[currentLesson].word, width / 2, y - height * 0.08);

  // 顯示動作指引
  fill(50);
  textSize(height * 0.03);
  text(lessons[currentLesson].desc, width / 2, y + videoH + height * 0.05);

  // 顯示提示
  textSize(height * 0.02);
  text("點擊滑鼠或螢幕切換下一個動作", width / 2, height - 30);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 點擊滑鼠切換教學內容
function mousePressed() {
  currentLesson = (currentLesson + 1) % lessons.length;
}
