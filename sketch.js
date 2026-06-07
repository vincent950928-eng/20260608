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
  { word: "你好", desc: "右手握拳，大拇指伸出。請對準鏡頭比出「讚」的手勢。", imgUrl: "https://img.icons8.com/color/400/null/thumbs-up.png" },
  { word: "謝謝", desc: "右手五指併攏伸直。請對準鏡頭平伸手掌。", imgUrl: "https://img.icons8.com/color/400/null/hand.png" },
  { word: "我愛你", desc: "同時伸出大拇指、食指和小指，其餘手指收起。", imgUrl: "https://img.icons8.com/color/400/null/i-love-you-hand-gesture.png" },
  { word: "對不起", desc: "右手握拳（暫以握拳識別）。請對著鏡頭握緊拳頭。", imgUrl: "https://img.icons8.com/color/400/null/clenched-fist.png" },
  { word: "漂亮", desc: "開掌手勢。請將五指張開對準攝影機。", imgUrl: "https://img.icons8.com/color/400/null/palm-up.png" }
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
      recognitionProgress += 5; // 稍微提高增長速度
      // 加入百分比顯示，讓玩家知道進度
      feedbackMsg = "偵測成功！請保持住... " + floor(recognitionProgress) + "%";
      if (recognitionProgress >= 100) handleSuccess();
    } else {
      // 大幅調降扣分速度
      recognitionProgress = max(0, recognitionProgress - 1); 
      
      if(isModelReady) {
        // 當進度還在倒退時，給予不同的文字提示
        feedbackMsg = recognitionProgress > 0 ? "稍微偏了，請調整手勢！" : "請比出：「" + lessons[currentLesson].word + "」";
      }
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
  rect(x, y + videoH - 15, videoW, 15, 5); // 加厚進度條
  
  // 繪製進度條
  fill(isSuccess ? '#4CAF50' : '#00bcd4'); // 成功時變綠色，平時藍色
  let progressW = map(min(recognitionProgress, 100), 0, 100, 0, videoW);
  rect(x, y + videoH - 15, progressW, 15, 5); // 加厚進度條

  // 繪製手語教學文字介面
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  
  // 顯示當前詞彙
  fill(80, 0, 150); 
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

// 計算手掌旋轉角度 (弧度)
// 使用手腕 (0) 到中指根部 (9) 的向量作為手掌朝向基準
function getHandRotation() {
  if (hands.length === 0) return 0;
  let kp = hands[0].keypoints;
  return atan2(kp[9].y - kp[0].y, kp[9].x - kp[0].x);
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

// 改良版識別邏輯：使用距離法
function checkGesture() {
  if (hands.length === 0) return false;

  let keypoints = hands[0].keypoints;

  // 改進的伸展判斷：比較 Tip-MCP 與 PIP-MCP 的距離
  const isExtended = (tip, pip, mcp, threshold = 1.3) => {
    return dist(keypoints[tip].x, keypoints[tip].y, keypoints[mcp].x, keypoints[mcp].y) > 
           dist(keypoints[pip].x, keypoints[pip].y, keypoints[mcp].x, keypoints[mcp].y) * threshold;
  };

  // 取得手掌旋轉狀態
  let rot = getHandRotation();
  let isUpright = (rot < -PI/4 && rot > -3*PI/4);

  // 取得各指狀態 (使用 MCP 點 5, 9, 13, 17 作為根部)
  let thumbUp = isExtended(4, 3, 2, 1.2); 
  let indexUp = isExtended(8, 6, 5);
  let middleUp = isExtended(12, 10, 9);
  let ringUp = isExtended(16, 14, 13);
  let pinkyUp = isExtended(20, 18, 17);
  
  let currentWord = lessons[currentLesson].word;

  if (currentWord === "你好") {
    // 放寬判定：只要大拇指伸出，且主要的食指、中指有收起即可
    let isUprightWide = (rot < -PI/8 && rot > -7*PI/8); // 放寬角度到正負 67.5 度
    return thumbUp && !indexUp && !middleUp && isUprightWide;
  }

  if (currentWord === "我愛你") {
    // 我愛你：指定手指伸直，且手掌方向需正常向上
    return thumbUp && indexUp && !middleUp && !ringUp && pinkyUp && isUpright;
  } 
  
  if (currentWord === "對不起") {
    // 握拳：所有手指都要收起
    return !thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp;
  }

  if (currentWord === "謝謝" || currentWord === "漂亮") {
    // 開掌：所有手指伸直，手掌向上
    return indexUp && middleUp && ringUp && pinkyUp && isUpright;
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
