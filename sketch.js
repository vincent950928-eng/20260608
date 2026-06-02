// 宣告一個全域變數來儲存攝影機擷取的影像
let capture;
let handPose;
let hands = [];
let recognitionProgress = 0; // 識別進度 (0-100)
let isModelReady = false;
let feedbackMsg = "等待模型載入...";

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
  
  // 建立攝影機擷取
  capture = createCapture(VIDEO);
  capture.size(640, 480);
  
  // 初始化 ml5 handPose
  handPose = ml5.handPose(() => {
    isModelReady = true;
    feedbackMsg = "請對準攝影機比出手語";
  });
  // 開始持續偵測
  handPose.detectStart(capture, (results) => { hands = results; });

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
  scale(-1, 1);
  image(capture, 0, 0, videoW, videoH);
  
  // 繪製手部關鍵點 (選配，讓玩家知道電腦有抓到手)
  if (hands.length > 0) {
    drawKeypoints(videoW, videoH);
    
    // 簡單識別邏輯：如果畫面中有手，進度條就增加
    // 在專業版本中，這裡會根據 hands[0].keypoints 的座標來判斷特定姿勢
    recognitionProgress += 1.5; 
    feedbackMsg = "偵測中...保持動作！";
  } else {
    recognitionProgress = max(0, recognitionProgress - 2);
    if(isModelReady) feedbackMsg = "請比出：「" + lessons[currentLesson].word + "」";
  }
  pop(); // 恢復之前的繪圖狀態

  // 檢查是否識別成功
  if (recognitionProgress >= 100) {
    nextLesson();
  }

  drawUI(x, y, videoW, videoH);
}

// 繪製 UI 介面
function drawUI(x, y, videoW, videoH) {
  // 繪製識別進度條背景
  noStroke();
  fill(255, 255, 255, 150);
  rect(x, y + videoH - 10, videoW, 10);
  
  // 繪製進度條
  fill(0, 200, 100);
  let progressW = map(recognitionProgress, 0, 100, 0, videoW);
  rect(x, y + videoH - 10, progressW, 10);

  // 繪製手語教學文字介面
  textAlign(CENTER, CENTER);
  
  // 顯示當前詞彙
  fill(80, 0, 150); // 深紫色文字
  textSize(height * 0.05);
  text("手語練習：" + lessons[currentLesson].word, width / 2, y - height * 0.08);

  // 顯示動作指引
  fill(50);
  textSize(height * 0.025);
  text(lessons[currentLesson].desc, width / 2, y + videoH + height * 0.05);

  // 顯示當前狀態提示
  fill(100, 50, 200);
  text(feedbackMsg, width / 2, height - 50);
}

// 繪製手部特徵點輔助玩家
function drawKeypoints(vW, vH) {
  fill(0, 255, 0);
  for (let i = 0; i < hands[0].keypoints.length; i++) {
    let keypoint = hands[0].keypoints[i];
    // 映射座標到顯示區域
    let mappedX = map(keypoint.x, 0, capture.width, 0, vW);
    let mappedY = map(keypoint.y, 0, capture.height, 0, vH);
    ellipse(mappedX, mappedY, 8, 8);
  }
}

function nextLesson() {
  currentLesson = (currentLesson + 1) % lessons.length;
  recognitionProgress = 0;
  feedbackMsg = "太棒了！下一個動作";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 點擊滑鼠切換教學內容
function mousePressed() {
  nextLesson();
}
