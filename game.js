// ====== 遊戲設定與狀態變數 ======
const GAME_WIDTH = 400; // 遊戲區塊寬度
const GAME_HEIGHT = 600; // 遊戲區塊高度 (用於掉落動畫)
const PANCAKE_HEIGHT = 25; // 與 CSS 中 .pancake 的 height 一致
const PLATE_WIDTH = 150;
const PANCAKE_INITIAL_WIDTH = PLATE_WIDTH; // 第一個鬆餅與盤子同寬
const MOVING_CONTAINER_TOP = 50; // 與 CSS #moving-pancake-container 的 top 值一致

let isGameRunning = false;
// 分數改為以已堆疊的鬆餅數表示（不包含盤子）
let score = 0; // 仍保留變數供 UI 使用，但會以 stack 計算更新
let timeRemaining = 30;
let intervalId; 
let animationFrameId; 

// 鬆餅相關
let currentPancake; 
let currentPancakeX = 0; 
let currentPancakeWidth = PANCAKE_INITIAL_WIDTH; // 鬆餅的當前寬度
let direction = 1; 
let speed = 2; 
let stack = []; 

// DOM 元素
const scoreDisplay = document.getElementById('score-display');
const timerDisplay = document.getElementById('timer-display');
const stackArea = document.getElementById('stack-area');
const movingPancakeContainer = document.getElementById('moving-pancake-container');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreDisplay = document.getElementById('final-score');
const endTitle = document.getElementById('end-title');
const endMessage = document.getElementById('end-message');
const plateElement = document.getElementById('plate');


// ====== 遊戲主邏輯函數 ======

/** 啟動新一輪遊戲 */
function startGame() {
    // 停止所有動畫和計時器
    if (intervalId) clearInterval(intervalId);
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    // 重設狀態
    isGameRunning = true;
    // 初始時沒有堆疊的鬆餅（只有盤子）
    score = 0;
    timeRemaining = 30;
    stack = [];
    // 將盤子作為基底物件加入 stack，並記錄 centerX
    stack.push({ width: PLATE_WIDTH, isPlate: true, element: plateElement, centerX: GAME_WIDTH / 2 });
    currentPancake = null;
    direction = 1;
    speed = 2; 
    
    // << 修正點：重設鬆餅寬度 >>
    currentPancakeWidth = PANCAKE_INITIAL_WIDTH; 

    // 清空堆疊區和移動區
    stackArea.querySelectorAll('.stacked-pancake').forEach(p => p.remove());
    // 移除任何可能殘留的碰撞箱 (以前的實作)
    stackArea.querySelectorAll('.bbox').forEach(b => b.remove());
    movingPancakeContainer.innerHTML = '';

    // 隱藏介面，顯示遊戲
    startScreen.classList.add('hidden');
    endScreen.classList.add('hidden');

    // 更新顯示
    scoreDisplay.textContent = `鬆餅數: ${getPancakeCount()}`;
    timerDisplay.textContent = `時間: ${timeRemaining}`;

    // 建立第一個鬆餅
    createNewPancake();

    // 啟動計時器
    startTimer();

    // 啟動移動動畫
    movePancake();
}

/** 建立一個新的移動中鬆餅 */
function createNewPancake() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    currentPancake = document.createElement('div');
    currentPancake.classList.add('pancake');

    currentPancake.style.width = `${currentPancakeWidth}px`;
    currentPancakeX = 0;
    currentPancake.style.left = `${currentPancakeX}px`;

    currentPancake.style.top = '0px';
    currentPancake.style.transform = 'translateY(0px)';

    movingPancakeContainer.appendChild(currentPancake);

    // 在目前移動中的鬆餅上加入紅色外框，讓碰撞框跟隨元素
    currentPancake.classList.add('bbox-outline');
}

/** 鬆餅左右移動的動畫循環 */
function movePancake() {
    if (!isGameRunning || !currentPancake) return;

    currentPancakeX += speed * direction;

    // 邊界碰撞檢測
    if (currentPancakeX + currentPancakeWidth > GAME_WIDTH) {
        direction = -1;
        currentPancakeX = GAME_WIDTH - currentPancakeWidth;
    }
    else if (currentPancakeX < 0) {
        direction = 1;
        currentPancakeX = 0;
    }

    currentPancake.style.left = `${currentPancakeX}px`;

    animationFrameId = requestAnimationFrame(movePancake);
}

/** 處理鬆餅掉落 (觸發視覺動畫) */
function dropPancake() {
    if (!isGameRunning || !currentPancake) return;

    // 1. 停止移動動畫
    cancelAnimationFrame(animationFrameId);

    // 儲存掉落時的精確位置和寬度
    const droppedX = currentPancakeX;
    const droppedWidth = currentPancakeWidth;

    // 計算目前已堆疊的鬆餅數量 (不包含盤子)
    const pancakeCount = stack.filter(s => !s.isPlate).length;

    // 已堆疊鬆餅數量 * 每個鬆餅的高度 + 盤子的高度
    const stackHeight = pancakeCount * PANCAKE_HEIGHT + plateElement.offsetHeight;

    // 鬆餅最終的 top 值 = 遊戲容器總高 - 堆疊高度 - 鬆餅自身高度
    // 減去移動容器的 top 偏移 (MOVING_CONTAINER_TOP)
    const finalPancakeY = GAME_HEIGHT - stackHeight - PANCAKE_HEIGHT - MOVING_CONTAINER_TOP;

    // 3. 應用掉落動畫樣式
    // 使用 transform translateY 進行掉落動畫（比改 top 更平滑且較少 layout）
    currentPancake.classList.add('dropping');
    currentPancake.style.transform = `translateY(${finalPancakeY}px)`;

    // 4. 延遲執行堆疊邏輯，等待視覺動畫完成
    // 紅色外框已經附在元素上，top 動畫會一起發生

    setTimeout(() => {
        // 將計算出的最終 Y 座標也傳入，以備將來擴展用途
        handlePancakeDrop(droppedX, droppedWidth, stackHeight);
    }, 300); // 300ms 必須與 style.css 中的 transition: transform 0.3s 一致
}

/** 處理鬆餅堆疊或遊戲結束的邏輯 */
function handlePancakeDrop(droppedX, droppedWidth, stackHeight) {
    if (!currentPancake) return;

    // 1. 清理視覺元素 (在視覺停靠後，將其轉換為靜態的堆疊鬆餅)
    if (currentPancake.parentElement === movingPancakeContainer) {
        movingPancakeContainer.removeChild(currentPancake);
    }
    currentPancake = null; 

    // 2. 進行堆疊檢測
    // 目前堆疊的基底寬度為最上層物件的寬度（若只有盤子則使用盤子寬度）
    const topStack = stack[stack.length - 1];
    const baseWidth = topStack ? topStack.width : PLATE_WIDTH;
    const baseCenterX = topStack ? topStack.centerX : GAME_WIDTH / 2;

    const fallingLeft = droppedX;
    const fallingRight = droppedX + droppedWidth;
    const baseLeft = baseCenterX - (baseWidth / 2);
    const baseRight = baseCenterX + (baseWidth / 2);

    // 使用擴張矩形碰撞檢測以增加容錯
    // margin 會根據基底寬度調整，並至少保有一個固定的最小值
    const margin = Math.max(8, Math.floor(0.06 * baseWidth)); // 動態容錯 (6%)，最少 8px

    const fallingRectLeft = fallingLeft - margin;
    const fallingRectRight = fallingRight + margin;
    const baseRectLeft = baseLeft;
    const baseRectRight = baseRight;

    const overlap = Math.min(fallingRectRight, baseRectRight) - Math.max(fallingRectLeft, baseRectLeft);

    if (overlap > 0) {
        // --- 堆疊成功 ---

        const newLeft = Math.max(fallingLeft, baseLeft);
        const newRight = Math.min(fallingRight, baseRight);
        const newWidth = newRight - newLeft;
        const newCenterX = newLeft + (newWidth / 2);

        const isPerfect = Math.abs(newWidth - baseWidth) < 2;

        // 3. 建立堆疊好的鬆餅
        const stackedPancake = document.createElement('div');
        stackedPancake.classList.add('stacked-pancake');

        // 為了保留原始被切割後的形狀（含原始兩側的圓角），
        // 我們將元素寬度設為掉落鬆餅的原始寬度 (droppedWidth)，
        // 並把它定位在 fallingLeft。接著用 clip-path 將左右非重疊部分裁剪掉，
        // 這樣能保留真實的圓弧邊緣而非強制變形。
        stackedPancake.style.width = `${droppedWidth}px`;
        stackedPancake.style.left = `${fallingLeft}px`;

        // 計算目前已堆疊的鬆餅數量 (不包含盤子)
        const pancakeCount = stack.filter(s => !s.isPlate).length;
        // 新加入的鬆餅 bottom = 盤子高度 + 已堆疊鬆餅數 * 每個鬆餅高度
        const bottomY = plateElement.offsetHeight + (pancakeCount * PANCAKE_HEIGHT);
        stackedPancake.style.bottom = `${bottomY}px`;

        // clip-path 的左右 inset 值（px）
        const leftInset = Math.max(0, newLeft - fallingLeft);
        const rightInset = Math.max(0, fallingRight - newRight);
        stackedPancake.style.clipPath = `inset(0px ${rightInset}px 0px ${leftInset}px round 50%)`;
        stackedPancake.style.borderRadius = '50%';

        // 儲存元資料（newWidth 為下一層的基底寬度，centerX 也存起來）
        stack.push({ width: newWidth, element: stackedPancake, isPlate: false, centerX: newCenterX });
        stackArea.appendChild(stackedPancake);

        // 4. 更新鬆餅數與難度
        if (isPerfect) {
            stackedPancake.classList.add('perfect-stack');
        }
        // 以 stack 的資料來計算目前的鬆餅數（不包含盤子）
        scoreDisplay.textContent = `鬆餅數: ${getPancakeCount()}`;

        // 檢查是否達成通關條件（10 片鬆餅）
        if (getPancakeCount() >= 10) {
            // 顯示通關畫面
            winGame();
            return; // 不再產生下一片
        }

        currentPancakeWidth = newWidth; 
        speed = Math.min(speed + 0.1, 5); 
        
        // 5. 準備下一個鬆餅
        createNewPancake();
        movePancake(); 

    } else {
        // --- 堆疊失敗 ---
        gameOver();
    }
}

/** 取得目前已堆疊的鬆餅數（不包含盤子） */
function getPancakeCount() {
    return stack.filter(s => !s.isPlate).length;
}


/** 啟動計時器 */
function startTimer() {
    if (intervalId) clearInterval(intervalId); 

    intervalId = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = `時間: ${timeRemaining}`;

        if (timeRemaining <= 0) {
            gameOver();
        }
    }, 1000); 
}

/** 處理遊戲結束 */
function gameOver() {
    isGameRunning = false;
    clearInterval(intervalId); 
    cancelAnimationFrame(animationFrameId); 

    // 如果還有一個正在掉落但還沒處理邏輯的鬆餅，將其刪除
    if (currentPancake && currentPancake.parentElement === movingPancakeContainer) {
        movingPancakeContainer.removeChild(currentPancake);
    }

    // 顯示結束畫面（失敗或時間到）
    if (endTitle) endTitle.textContent = '遊戲結束！';
    if (endMessage) endMessage.innerHTML = `你總共疊了 ${getPancakeCount()} 個鬆餅。`;
    finalScoreDisplay.textContent = getPancakeCount();
    endScreen.classList.remove('hidden');
}

/** 玩家通關 */
function winGame() {
    isGameRunning = false;
    clearInterval(intervalId);
    cancelAnimationFrame(animationFrameId);

    // 移除目前移動中的鬆餅（若存在）
    if (currentPancake && currentPancake.parentElement === movingPancakeContainer) {
        movingPancakeContainer.removeChild(currentPancake);
        currentPancake = null;
    }

    // 顯示客製化通關訊息
    if (endTitle) endTitle.textContent = '恭喜通關!';
    if (endMessage) endMessage.innerHTML = '下面<br>第8個神祕數字是5!';

    endScreen.classList.remove('hidden');
}


// ====== 事件監聽器 ======

// 1. 開始按鈕
startButton.addEventListener('click', startGame);

// 2. 重新開始按鈕
restartButton.addEventListener('click', startGame);

// 3. 滑鼠點擊或空白鍵控制掉落
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && isGameRunning) {
        e.preventDefault(); // 阻止空白鍵捲動頁面
        dropPancake();
    }
    // debug: 按 b 隱藏/顯示碰撞外框
    if (e.key === 'b' || e.key === 'B') {
        const gameContainer = document.getElementById('game-container');
        gameContainer.classList.toggle('hide-bbox');
    }
});
document.addEventListener('mousedown', () => {
    if (isGameRunning) {
        dropPancake();
    }
});

// 首次載入時，先顯示開始畫面
document.addEventListener('DOMContentLoaded', () => {
    startScreen.classList.remove('hidden');
});
