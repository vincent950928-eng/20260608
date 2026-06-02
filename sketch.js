// 宣告一個全域變數來儲存攝影機擷取的影像
let capture;
let handPose;
let lessonImages = [];
let hands = [];
let recognitionProgress = 0; // 識別進度 (0-100)
let isModelReady = false;
let isSuccess = false; // 是否剛辨識成功
let feedbackMsg = "等待模型載入...";

// 初級手語教學內容
let lessons = [
  { word: "你好", desc: "【請握拳】右手握拳，大拇指伸出（示範為簡化版：握拳）。", imgUrl: "https://dummyimage.com/400x300/5000a0/fff.png&text=" + encodeURIComponent("Hello") },
  { word: "謝謝", desc: "【請開掌】右手平伸，指尖向上（示範為簡化版：五指伸直）。", imgUrl: "https://dummyimage.com/400x300/5000a0/fff.png&text=" + encodeURIComponent("Thank You") },
  { word: "我愛你", desc: "【搖滾手勢】伸出大拇指、食指和小指，收起中指與無名指。", imgUrl: "https://dummyimage.com/400x300/5000a0/fff.png&text=" + encodeURIComponent("I Love You") },
  { word: "對不起", desc: "【請握拳】右手握拳，大拇指伸出，放在額頭前點兩下。", imgUrl: "https://dummyimage.com/400x300/5000a0/fff.png&text=" + encodeURIComponent("Sorry") },
  { word: "漂亮", desc: "【請開掌】五指併攏，掌心向臉部，在臉前輕輕繞一圈。", imgUrl: "https://dummyimage.com/400x300/5000a0/fff.png&text=" + encodeURIComponent("Beautiful") }
];
let currentLesson = 0;

function setup() {
  // 建立一個全螢幕的畫布
  createCanvas(windowWidth, windowHeight);
  
  // 確保即使發生錯誤，也能在 3 秒後嘗試強制隱藏載入畫面
  setTimeout(hideLoadingScreen, 3000);

  // 將圖片載入移到 setup 中，改為非同步載入，避免阻塞 preload
  lessons.forEach((lesson, i) => {
    loadImage(lesson.imgUrl, img => {
      lessonImages[i] = img;
      console.log(`圖片【${lesson.word}】載入成功`);
      // 每載入一張圖就檢查一次是否可以隱藏載入畫面
      hideLoadingScreen();
    }, err => {
      console.error(`圖片【${lesson.word}】載入失敗:`, err);
    });
  });
  
  // 建立攝影機擷取
  capture = createCapture(VIDEO, (stream) => {
    console.log("攝影機已成功啟動");
  }, (err) => {
    console.error("攝影機啟動失敗:", err);
    feedbackMsg = "錯誤：找不到攝影機，請檢查權限或連線";
  });
  
  capture.size(640, 480);
  
  // 檢查 ml5 是否成功載入
  if (typeof window.ml5 !== 'undefined') {
    // 初始化 ml5 handPose
    handPose = ml5.handPose(() => {
      isModelReady = true;
      feedbackMsg = "請對準攝影機比出手語";
      console.log("ml5 模型已就緒");
      // 確保模型準備好後才開始偵測
      handPose.detectStart(capture, (results) => { hands = results; });
      hideLoadingScreen();
    });
  } else {
    feedbackMsg = "錯誤：無法載入 AI 模型，請檢查網路連線";
    console.error("ml5.js library is not loaded.");
    hideLoadingScreen();
  }

  // 隱藏預設的 HTML 影片元素，因為我們將在畫布上繪製它
  capture.hide();
}

// 強制隱藏載入畫面的函式
function hideLoadingScreen() {
  let loadingDiv = document.getElementById('p5_loading');
  if (loadingDiv) {
    // 只有當模型準備好或是已經過了強制的 3 秒，才移除
    if (isModelReady || (typeof millis !== 'undefined' && millis() > 3000)) {
      loadingDiv.style.display = 'none';
    }
  }
}

function draw() {
  // 每一幀開始時重設模式，避免 drawUI 裡的設定影響到下一幀的佈局
  rectMode(CORNER);
  imageMode(CORNER);

  // 設定畫布背景顏色為 e7c6ff
  background('#e7c6ff');
  
  // 調整佈局：將畫面分為左右兩區
  let displayW = width * 0.4;     // 單個顯示區域的寬度
  let displayH = displayW * 0.75; // 保持 4:3 比例
  let gap = 40;                  // 左右畫面之間的間距
  
  // 計算整體置中的起始座標
  let totalW = displayW * 2 + gap;
  let startX = (width - totalW) / 2;
  let startY = (height - displayH) / 2;

  // 1. 繪製左側：正確示範模型
  fill(255);
  noStroke();
  rect(startX, startY, displayW, displayH, 10); // 加上圓角背景
  if (lessonImages[currentLesson]) {
    // 如果圖片載入成功則顯示
    image(lessonImages[currentLesson], startX, startY, displayW, displayH);
  } else {
    // 如果圖片還在載入或失敗，顯示提示文字
    fill(150);
    textAlign(CENTER, CENTER);
    text("範例圖片載入中...", startX + displayW / 2, startY + displayH / 2);
  }

  // 2. 繪製右側：玩家即時畫面 (攝影機)
  let camX = startX + displayW + gap;
  
  push();
  translate(camX + displayW, startY); // 將原點移動到右側影像的右邊緣，以便進行水平翻轉
  scale(-1, 1);
  image(capture, 0, 0, displayW, displayH);
  
  if (!isSuccess) {
    if (hands.length > 0 && checkGesture()) {
      drawKeypoints(displayW, displayH);
      
      recognitionProgress += 5;
      feedbackMsg = "偵測中... 保持住！";
      
      // 檢查是否達到 100%
      if (recognitionProgress >= 100) {
        handleSuccess();
      }
    } else {
      // 沒偵測到正確手勢時，進度快速下降
      recognitionProgress = max(0, recognitionProgress - 2);
      if(isModelReady) feedbackMsg = "請比出：「" + lessons[currentLesson].word + "」";
    }
  }
  pop(); // 恢復之前的繪圖狀態

  // 繪製標籤
  textAlign(CENTER, TOP);
  textSize(20);
  fill(80, 0, 150);
  text("【 正確示範 】", startX + displayW / 2, startY - 30);
  text("【 你的畫面 】", camX + displayW / 2, startY - 30);

  drawUI(camX, startY, displayW, displayH);
}

// 繪製 UI 介面
function drawUI(x, y, videoW, videoH) {
  // 繪製識別進度條背景
  noStroke();
  rectMode(CORNER); 
  fill(0, 0, 0, 50);
  rect(x, y + videoH - 10, videoW, 10, 5);
  
  // 繪製進度條
  fill(isSuccess ? '#4CAF50' : '#00bcd4'); // 成功時變綠色，平時藍色
  let progressW = map(min(recognitionProgress, 100), 0, 100, 0, videoW);
  rect(x, y + videoH - 10, progressW, 10, 5); // 進度條使用 CORNER 模式繪製

  // 繪製手語教學文字介面
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  
  // 顯示當前詞彙
  fill(80, 0, 150); // 深紫色文字
  textSize(height * 0.05);
  text("手語練習：" + lessons[currentLesson].word, width / 2, y - height * 0.08);

  // 顯示動作指引
  fill(50);
  textSize(22);
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

// 核心識別邏輯：判斷手指狀態
function checkGesture() {
  if (hands.length === 0) return false;

  let keypoints = hands[0].keypoints;
  
  // 判斷手指是否伸直 (Y 座標越小代表越高)
  // index: 8(tip), 6(pip) | middle: 12, 10 | ring: 16, 14 | pinky: 20, 18
  let indexUp = keypoints[8].y < keypoints[6].y;
  let middleUp = keypoints[12].y < keypoints[10].y;
  let ringUp = keypoints[16].y < keypoints[14].y;
  let pinkyUp = keypoints[20].y < keypoints[18].y;
  
  let currentWord = lessons[currentLesson].word;

  if (currentWord === "我愛你") {
    // 食指、小指要伸直，中指、無名指要收起
    return indexUp && !middleUp && !ringUp && pinkyUp;
  } 
  
  if (currentWord === "你好" || currentWord === "對不起") {
    // 握拳：所有手指都要收起
    return !indexUp && !middleUp && !ringUp && !pinkyUp;
  }

  if (currentWord === "謝謝" || currentWord === "漂亮") {
    // 開掌：所有手指都要伸直
    return indexUp && middleUp && ringUp && pinkyUp;
  }

  return false;
}

// 處理辨識成功的邏輯
function handleSuccess() {
  isSuccess = true;
  recognitionProgress = 100;
  feedbackMsg = "✨ 太棒了！辨識正確 ✨";
  
  // 延遲 1.5 秒後自動進入下一課，讓玩家看清楚反饋
  setTimeout(() => {
    nextLesson();
    isSuccess = false;
  }, 1500);
}

function nextLesson() {
  currentLesson = (currentLesson + 1) % lessons.length;
  recognitionProgress = 0;
  // 確保在下一課開始時重置狀態
  if(!isSuccess) feedbackMsg = "請比出：「" + lessons[currentLesson].word + "」";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 點擊滑鼠切換教學內容
function mousePressed() {
  nextLesson();
}
