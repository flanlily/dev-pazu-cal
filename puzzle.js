document.addEventListener('DOMContentLoaded', () => {
    // パズルタブがクリックされたら初期化
    const puzzleTabButton = document.querySelector('.tab-button[data-tab="puzzle"]');
    let isPuzzleInitialized = false;

    puzzleTabButton.addEventListener('click', () => {
        if (!isPuzzleInitialized) {
            initializePuzzle();
            isPuzzleInitialized = true;
        }
    });

    function initializePuzzle() {
        const boardElement = document.getElementById('puzzle-board');
        const comboCounter = document.getElementById('combo-counter');
        const resetButton = document.getElementById('reset-board-button');

        const ROWS = 5;
        const COLS = 6;
        const ORB_TYPES = ['fire', 'water', 'wood', 'light', 'dark', 'heart'];

        let board = [];
        let draggingOrb = null; // { element, row, col }

        // 盤面を生成
        function createBoard() {
            board = [];
            boardElement.innerHTML = '';
            for (let r = 0; r < ROWS; r++) {
                const row = [];
                for (let c = 0; c < COLS; c++) {
                    const orbType = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
                    row.push(orbType);
                    const orbElement = createOrbElement(r, c, orbType);
                    boardElement.appendChild(orbElement);
                }
                board.push(row);
            }
        }

        function createOrbElement(row, col, type) {
            const orb = document.createElement('div');
            orb.classList.add('orb');
            orb.dataset.row = row;
            orb.dataset.col = col;
            orb.dataset.orb = type;
            return orb;
        }
        
        // ドラッグ開始
        function onDragStart(e) {
            e.preventDefault();
            const target = e.target;
            if (!target.classList.contains('orb')) return;
            
            draggingOrb = {
                element: target,
                row: parseInt(target.dataset.row),
                col: parseInt(target.dataset.col)
            };
            target.classList.add('dragging');
        }

        // ドラッグ中
        function onDragMove(e) {
            if (!draggingOrb) return;
            e.preventDefault();

            const { clientX, clientY } = e.touches ? e.touches[0] : e;
            const targetElement = document.elementFromPoint(clientX, clientY);

            if (targetElement && targetElement.classList.contains('orb') && targetElement !== draggingOrb.element) {
                swapOrbs(draggingOrb.element, targetElement);
            }
        }

        // ドラッグ終了
        function onDragEnd(e) {
            if (!draggingOrb) return;
            e.preventDefault();
            
            draggingOrb.element.classList.remove('dragging');
            draggingOrb = null;
            
            // 少し待ってからコンボ計算を開始（見た目のため）
            setTimeout(solveBoard, 100);
        }

        // ドロップを交換する
        function swapOrbs(orb1, orb2) {
            const r1 = parseInt(orb1.dataset.row);
            const c1 = parseInt(orb1.dataset.col);
            const r2 = parseInt(orb2.dataset.row);
            const c2 = parseInt(orb2.dataset.col);

            // データ配列を交換
            [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
            
            // 見た目を交換
            [orb1.dataset.orb, orb2.dataset.orb] = [orb2.dataset.orb, orb1.dataset.orb];
            
            // ドラッグ中のオーブ情報を更新
            draggingOrb.row = r2;
            draggingOrb.col = c2;
        }

        // コンボ計算と処理
        async function solveBoard() {
            let totalCombos = 0;
            let foundMatch = true;

            while (foundMatch) {
                const matches = findMatches();
                if (matches.size === 0) {
                    foundMatch = false;
                    continue;
                }

                totalCombos += countCombos(matches);
                comboCounter.textContent = `コンボ: ${totalCombos}`;

                await removeMatches(matches);
                await dropOrbs();
                await fillBoard();
            }
        }

        function findMatches() {
            const matches = new Set();
            // 横方向
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS - 2; c++) {
                    if (board[r][c] && board[r][c] === board[r][c+1] && board[r][c] === board[r][c+2]) {
                        matches.add(`${r}-${c}`);
                        matches.add(`${r}-${c+1}`);
                        matches.add(`${r}-${c+2}`);
                    }
                }
            }
            // 縦方向
            for (let r = 0; r < ROWS - 2; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c] && board[r][c] === board[r+1][c] && board[r][c] === board[r+2][c]) {
                        matches.add(`${r}-${c}`);
                        matches.add(`${r+1}-${c}`);
                        matches.add(`${r+2}-${c}`);
                    }
                }
            }
            return matches;
        }
        
        // 繋がったマッチを1コンボとして数えるための補助関数
        function countCombos(matches) {
           // 簡単のため、マッチしたドロップの集合の数で代用（厳密ではない）
           return 1; // ここは簡略化。厳密なコンボ計算はより複雑なアルゴリズムが必要。
        }

        function removeMatches(matches) {
            matches.forEach(key => {
                const [r, c] = key.split('-').map(Number);
                board[r][c] = null; // データから削除
                const orb = boardElement.querySelector(`[data-row='${r}'][data-col='${c}']`);
                if (orb) {
                    orb.dataset.orb = ''; // 見た目を消す
                }
            });
            return new Promise(resolve => setTimeout(resolve, 300));
        }

        function dropOrbs() {
            for (let c = 0; c < COLS; c++) {
                let emptyRow = -1;
                for (let r = ROWS - 1; r >= 0; r--) {
                    if (board[r][c] === null && emptyRow === -1) {
                        emptyRow = r;
                    } else if (board[r][c] !== null && emptyRow !== -1) {
                        // データ移動
                        board[emptyRow][c] = board[r][c];
                        board[r][c] = null;
                        
                        // 見た目移動
                        const orbToMove = boardElement.querySelector(`[data-row='${r}'][data-col='${c}']`);
                        const targetOrb = boardElement.querySelector(`[data-row='${emptyRow}'][data-col='${c}']`);
                        if (orbToMove && targetOrb) {
                            targetOrb.dataset.orb = orbToMove.dataset.orb;
                            orbToMove.dataset.orb = '';
                        }
                        emptyRow--;
                    }
                }
            }
            return new Promise(resolve => setTimeout(resolve, 300));
        }

        function fillBoard() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c] === null) {
                        const newType = ORB_TYPES[Math.floor(Math.random() * ORB_TYPES.length)];
                        board[r][c] = newType;
                        const orb = boardElement.querySelector(`[data-row='${r}'][data-col='${c}']`);
                        if (orb) orb.dataset.orb = newType;
                    }
                }
            }
            return new Promise(resolve => setTimeout(resolve, 100));
        }

        // リセット処理
        function resetBoard() {
            comboCounter.textContent = 'コンボ: 0';
            createBoard();
        }

        // イベントリスナー設定
        boardElement.addEventListener('mousedown', onDragStart);
        document.addEventListener('mousemove', onDragMove);
        document.addEventListener('mouseup', onDragEnd);
        boardElement.addEventListener('touchstart', onDragStart, { passive: false });
        document.addEventListener('touchmove', onDragMove, { passive: false });
        document.addEventListener('touchend', onDragEnd);
        resetButton.addEventListener('click', resetBoard);

        // 初期盤面作成
        createBoard();
    }
});
