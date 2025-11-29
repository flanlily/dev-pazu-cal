document.addEventListener('DOMContentLoaded', () => {

    // ----------- HTML要素取得 -----------
    const dungeonSelect = document.getElementById('dungeonSelect');
    const floorSelect = document.getElementById('floorSelect');
    const inputA = document.getElementById('inputA');
    const inputB = document.getElementById('inputB');
    const inputC = document.getElementById('inputC');
    const inputL = document.getElementById('inputL');
    const totalReductionRateDisplay = document.getElementById('totalReductionRate');
    const resultsTableBody = document.querySelector('#resultsTable tbody');

    const expDungeon = document.getElementById('expDungeon');
    const expFloor = document.getElementById('expFloor');
    const leaderMultiplier = document.getElementById('leaderMultiplier');
    const friendMultiplier = document.getElementById('friendMultiplier');
    const dungeonBonusCount = document.getElementById('dungeonBonusCount');
    const padPassBonusSelect = document.getElementById('padPassBonus'); // パズパス要素取得
    const adDoubleSelect = document.getElementById('adDouble');       // 広告視聴要素取得
    const badgeBonusSelect = document.getElementById('badgeBonus');     // バッジ効果要素取得
    const expValueDisplay = document.getElementById('expValue');

    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const notificationIcon = document.getElementById('notificationIcon');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationPopup = document.getElementById('notificationPopup');
    const popupOverlay = document.getElementById('popupOverlay');
    const popupCloseButton = document.getElementById('popupCloseButton');
    const notificationList = document.getElementById('notification-list');

    // 存在しない場合もあるのでnull許容で取得
    const linksPopupButton = document.getElementById('external-links-button');
    const linksPopup = document.getElementById('links-popup');
    const linksPopupOverlay = document.getElementById('links-popup-overlay');
    const linksPopupCloseButton = document.getElementById('links-popup-close-button');

    const syncButton = document.getElementById('syncButton');

    let damageDungeonData = {};
    let expData = {};
    let latestNotificationDate = '';

    let damageTabInitialized = false;
    let expTabInitialized = false;
    let hpTabInitialized = false;

    // ----------- データ読み込み -----------
    async function fetchData(url) {
        try {
            const response = await fetch(`${url}?t=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`${url}の読み込みに失敗しました。(${response.status})`);
            return await response.json();
        } catch (error) {
            console.error(error);
            // alert(error.message); // エラー表示は開発時以外コメントアウト推奨
            return null; // エラー時はnullを返す
        }
    }

    // ----------- 背景画像のランダム設定 -----------
    async function setRandomBackground() {
        try {
            const backgroundImages = await fetchData('./media-list.json');
            // fetchDataがnullを返す可能性があるのでチェック
            if (!backgroundImages || backgroundImages.length === 0) {
                console.warn('背景画像リストが見つからないか空です。');
                return;
            }
            const randomIndex = Math.floor(Math.random() * backgroundImages.length);
            const selectedImage = backgroundImages[randomIndex];
            document.body.style.backgroundImage = `url('${selectedImage}')`;
        } catch (error) {
            console.error('背景画像の設定に失敗しました:', error);
        }
    }

    // ----------- タブ切り替え処理 -----------
    function setupTabs() {
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const targetId = tab.dataset.tab;
                tabContents.forEach(tc => {
                    tc.classList.toggle('hidden', tc.id !== targetId);
                });

                // 各タブの初回クリック時に初期化処理を実行
                if (targetId === 'damage' && !damageTabInitialized) setupDamageTab();
                if (targetId === 'exp' && !expTabInitialized) setupExpTab();
                if (targetId === 'hp' && !hpTabInitialized) setupHpTab();
            });
        });
    }

    // ----------- 各タブの初期化 -----------
    function setupDamageTab() {
        if (damageTabInitialized) return;
        // イベントリスナー設定
        [dungeonSelect, floorSelect, inputA, inputB, inputC, inputL].forEach(el => {
            el.addEventListener('change', runDamageCalculation);
            if (el.tagName === 'INPUT') el.addEventListener('input', runDamageCalculation);
        });
        // 初期計算実行
        runDamageCalculation();
        damageTabInitialized = true;
    }

    function setupExpTab() {
        if (expTabInitialized) return;
        // イベントリスナー設定
        [expDungeon, expFloor, leaderMultiplier, friendMultiplier, padPassBonusSelect, adDoubleSelect, badgeBonusSelect].forEach(el => {
            el.addEventListener('change', calculateExp);
        });
        dungeonBonusCount.addEventListener('input', calculateExp);
        // 初期計算実行
        calculateExp();
        expTabInitialized = true;
    }

    function setupHpTab() {
        if (hpTabInitialized) return;
        // イベントリスナー設定
        document.querySelectorAll('#hp input').forEach(input => {
            input.addEventListener('input', runHpCalculations);
        });
        // 初期計算実行
        runHpCalculations();
        hpTabInitialized = true;
    }

    // ----------- 計算処理 -----------
    function runDamageCalculation() {
        const selectedDungeon = dungeonSelect.value;
        const selectedFloor = floorSelect.value;
        resultsTableBody.innerHTML = ''; // 計算結果をクリア

        if (!selectedDungeon || !selectedFloor) {
            totalReductionRateDisplay.textContent = ''; // 総軽減率表示もクリア
            return;
        }

        const valA = parseFloat(inputA.value) || 0;
        const valB = parseFloat(inputB.value) || 0;
        const valC = parseFloat(inputC.value) || 0;
        const valL = parseInt(inputL.value) || 0;

        const leaderReduce = 1 - valA;
        const friendReduce = 1 - valB;
        const skillReduce = 1 - valC;
        const lReduce = 1 - 0.05 * valL;
        const totalReduce = Math.max(0, leaderReduce * friendReduce * skillReduce * lReduce);
        totalReductionRateDisplay.textContent = `総軽減率: ${((1 - totalReduce) * 100).toFixed(2)}%`;

        const damageData = damageDungeonData[selectedDungeon][selectedFloor];
        // データが文字列の場合、数値の配列に変換。それ以外（配列など）ならそのまま使うか空配列に。
        const damageRatios = typeof damageData === 'string'
            ? damageData.split(',').map(s => parseFloat(s.replace('%', '')))
            : (Array.isArray(damageData) ? damageData : []);

        damageRatios.forEach(ratio => {
            if (isNaN(ratio)) return; // 無効なデータはスキップ
            const finalDamagePercent = (ratio * totalReduce).toFixed(2);
            const canSurvive = finalDamagePercent < 100;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${ratio}%</td>
                <td>${finalDamagePercent}%</td>
                <td class="${canSurvive ? 'can-withstand' : 'cannot-withstand'}">${canSurvive ? '耐えられる' : '耐えられない'}</td>
            `;
            resultsTableBody.appendChild(tr);
        });
    }

    function calculateExp() {
        const dungeonName = expDungeon.value;
        const floorName = expFloor.value;

        // ダンジョン未選択時は計算しない
        if (!dungeonName) {
            expValueDisplay.textContent = '-';
            return;
        }

        const floors = expData[dungeonName];
        let baseExp;
        // フロア選択が必要な場合（データがオブジェクト）とそうでない場合（データが数値）
        if (typeof floors === 'object' && !Array.isArray(floors)) {
            if (!floorName) { // フロアが未選択
                expValueDisplay.textContent = '-';
                return;
            }
            baseExp = floors[floorName];
        } else {
            baseExp = floors; // データ自体が経験値
        }

        // baseExpが取得できなかったり数値でない場合は計算しない
        if (typeof baseExp === 'undefined' || baseExp === null || isNaN(baseExp)) {
             expValueDisplay.textContent = '-';
             return;
        }

        const leaderMulti = parseFloat(leaderMultiplier.value);
        const friendMulti = parseFloat(friendMultiplier.value);
        const bonusCount = parseInt(dungeonBonusCount.value) || 0;
        const bonusMultiplier = 1 + 0.02 * bonusCount;
        const padPassBonus = padPassBonusSelect ? parseFloat(padPassBonusSelect.value) || 1 : 1;
        const badgeBonus = badgeBonusSelect ? parseFloat(badgeBonusSelect.value) || 1 : 1;
        const adDouble = adDoubleSelect ? parseFloat(adDoubleSelect.value) || 1 : 1;

        // 計算順: リーダー→助っ人→ダンジョンボーナス→パズパス→バッジ→広告2倍
        let result = baseExp;
        result *= leaderMulti; // リーダー経験値倍率
        result *= friendMulti; // 助っ人経験値倍率
        result *= bonusMultiplier; // ダンジョンボーナス覚醒
        result *= padPassBonus; // パズパスボーナス
        result *= badgeBonus; // バッジ効果
        result *= adDouble; // 広告2倍

        expValueDisplay.textContent = `獲得経験値: ${Math.round(result).toLocaleString()}`;

    function runHpCalculations() {
        // --- 1. パーティ合計HP計算 ---
        const hps = [1,2,3,4,5,6].map(i => parseInt(document.getElementById(`hp${i}`)?.value) || 0);
        const totalBaseHp = hps.reduce((a, b) => a + b, 0);
        const lMulti1 = parseFloat(document.getElementById('partyLHpMulti')?.value) || 1;
        const fMulti1 = parseFloat(document.getElementById('partyFHpMulti')?.value) || 1;
        const teamHpAwake1 = parseInt(document.getElementById('partyTeamHpAwakeCount')?.value) || 0;
        const teamHpAwakeMulti1 = 1 + 0.05 * teamHpAwake1;
        const avgMulti1 = (lMulti1 + fMulti1) / 2;
        const afterMulti1 = Math.floor(totalBaseHp * avgMulti1);
        const finalTotalHp1 = Math.floor(afterMulti1 * teamHpAwakeMulti1);
        document.getElementById('totalHpResult').textContent = totalBaseHp > 0 ? `合計HP: ${finalTotalHp1.toLocaleString()}` : '-';

        // --- 2. チームHP覚醒で盛れているHP ---
        const teamTotalHp2 = parseInt(document.getElementById('teamTotalHp')?.value) || 0;
        const teamHpAwakeCount2 = parseInt(document.getElementById('teamHpAwakeCount')?.value) || 0;
        let awakeHpIncreaseText = '-';
        if (teamTotalHp2 > 0 && teamHpAwakeCount2 > 0) {
            const teamHpAwakeMulti2 = 1 + 0.05 * teamHpAwakeCount2;
            const hpBeforeAwake = teamTotalHp2 / teamHpAwakeMulti2;
            const increaseAmount = Math.round(teamTotalHp2 - hpBeforeAwake);
            awakeHpIncreaseText = `覚醒による増加分: ${increaseAmount.toLocaleString()} HP`;
        }
        document.getElementById('teamHpAwakeResult').textContent = awakeHpIncreaseText;

        // --- 3. 実質HP計算 ---
        const lMulti3 = parseFloat(document.getElementById('actualLHpMulti')?.value) || 1;
        const lReduce3 = parseFloat(document.getElementById('actualLReduce')?.value) || 0;
        const fMulti3 = parseFloat(document.getElementById('actualFHpMulti')?.value) || 1;
        const fReduce3 = parseFloat(document.getElementById('actualFReduce')?.value) || 0;
        const skillReduce3 = parseFloat(document.getElementById('actualSkillReduce')?.value) || 0;

        const effectiveLRate = (1 - lReduce3 > 0) ? lMulti3 / (1 - lReduce3) : Infinity;
        const effectiveFRate = (1 - fReduce3 > 0) ? fMulti3 / (1 - fReduce3) : Infinity;
        const totalEffectiveHpRate = (1 - lReduce3 > 0 && 1 - fReduce3 > 0 && 1 - skillReduce3 > 0)
            ? (lMulti3 * fMulti3) / ((1 - lReduce3) * (1 - fReduce3) * (1 - skillReduce3))
            : Infinity;

        document.getElementById('actualLHpResult').textContent = (effectiveLRate !== Infinity) ? `リーダー実質HP: ${effectiveLRate.toFixed(2)}倍` : '軽減100%';
        document.getElementById('actualFHpResult').textContent = (effectiveFRate !== Infinity) ? `フレンド実質HP: ${effectiveFRate.toFixed(2)}倍` : '軽減100%';
        document.getElementById('actualHpRateResult').textContent = (totalEffectiveHpRate !== Infinity) ? `総合実質HP倍率: ${totalEffectiveHpRate.toFixed(2)}倍` : '完全耐性';

        // --- 4. チームHP覚醒個数逆算 ---
        const targetHp4 = parseInt(document.getElementById('targetHp')?.value) || 0;
        const currentHp4 = parseInt(document.getElementById('currentHp')?.value) || 0;
        let neededAwakeText = '-';
        if (targetHp4 > 0 && currentHp4 > 0 && targetHp4 > currentHp4) {
            const neededMultiplier = targetHp4 / currentHp4;
            const neededAwakeCount = Math.ceil((neededMultiplier - 1) / 0.05);
            neededAwakeText = `目標達成に必要な覚醒数: 約 ${neededAwakeCount} 個`;
        } else if (targetHp4 > 0 && currentHp4 > 0 && targetHp4 <= currentHp4) {
            neededAwakeText = '目標HPに到達済みか、上回っています';
        }
        document.getElementById('neededAwakeResult').textContent = neededAwakeText;
    }

    // ----------- ポップアップと同期ボタンの処理 -----------
    function setupPopupsAndSync() {
        notificationIcon.addEventListener('click', () => {
            notificationPopup.classList.remove('hidden');
            notificationBadge.classList.add('hidden');
            notificationIcon.classList.remove('active');
            if (latestNotificationDate) {
                localStorage.setItem('lastReadNotificationDate', latestNotificationDate);
            }
        });
        popupOverlay.addEventListener('click', () => notificationPopup.classList.add('hidden'));
        popupCloseButton.addEventListener('click', () => notificationPopup.classList.add('hidden'));

        // 存在する場合のみイベント登録
        if (linksPopupButton && linksPopup) {
            linksPopupButton.addEventListener('click', () => linksPopup.classList.remove('hidden'));
        }
        if (linksPopupOverlay && linksPopup) {
            linksPopupOverlay.addEventListener('click', () => linksPopup.classList.add('hidden'));
        }
        if (linksPopupCloseButton && linksPopup) {
            linksPopupCloseButton.addEventListener('click', () => linksPopup.classList.add('hidden'));
        }

        syncButton.addEventListener('click', async () => {
            syncButton.disabled = true;
            syncButton.textContent = '同期中...';

            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                localStorage.setItem('lastActiveTab', activeTab.dataset.tab);
            }
            if ('caches' in window) {
                const names = await caches.keys();
                await Promise.all(names.map(name => caches.delete(name)));
            }
            // Service Workerの登録解除（必要であれば）
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    await registration.unregister();
                }
            }
            location.reload(true); // 強制リロード
        });
    }

    async function fetchAndShowNotifications() {
        try {
            const notifications = await fetchData('./announcements.json');
             // fetchDataがnullを返す可能性があるのでチェック
            if (!notifications || !Array.isArray(notifications)) {
                notificationList.innerHTML = '<p>お知らせの読み込みに失敗しました。</p>';
                return;
            }
            notificationList.innerHTML = ''; // リストをクリア
            if (notifications.length > 0) {
                latestNotificationDate = notifications[0].date;
                const lastReadDate = localStorage.getItem('lastReadNotificationDate');
                let unreadCount = 0;

                notifications.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'notification-item';
                    div.innerHTML = `<strong>${item.date}</strong><p>${item.content}</p>`;
                    notificationList.appendChild(div);
                    if (!lastReadDate || item.date > lastReadDate) unreadCount++;
                });

                notificationBadge.classList.toggle('hidden', unreadCount === 0);
                notificationIcon.classList.toggle('active', unreadCount > 0);
                if (unreadCount > 0) notificationBadge.textContent = unreadCount;
            } else {
                notificationList.innerHTML = '<p>新しいお知らせはありません。</p>';
                notificationBadge.classList.add('hidden'); // お知らせがない場合もバッジを隠す
                notificationIcon.classList.remove('active');
            }
        } catch (error) {
            console.error('お知らせ取得エラー:', error);
            notificationList.innerHTML = '<p>お知らせの読み込みに失敗しました。</p>';
        }
    }

    // ----------- 初期化処理 -----------
    async function initializeAll() {
        await setRandomBackground();

        // データの取得を待つ
        [damageDungeonData, expData] = await Promise.all([
            fetchData('./dungeonData.json'),
            fetchData('./pad_experience_data.json')
        ]);

        // ▼▼▼【ここから修正】▼▼▼
        // プルダウンの初期化関数
        function initializeSelectWithOptions(selectElement, placeholderText, data) {
            selectElement.innerHTML = `<option value="">${placeholderText}</option>`; // プレースホルダーを追加
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(name => selectElement.add(new Option(name, name)));
                selectElement.disabled = false; // データがあれば有効化
            } else {
                selectElement.disabled = true; // データがなければ無効化
            }
        }

        // ダメージ計算タブのプルダウン初期化
        initializeSelectWithOptions(dungeonSelect, 'ダンジョンを選択してください', damageDungeonData);
        initializeSelect(floorSelect, 'フロアを選択してください'); // フロアはダンジョン選択後に有効化

        // 経験値計算タブのプルダウン初期化
        initializeSelectWithOptions(expDungeon, 'ダンジョンを選択してください', expData);
        initializeSelect(expFloor, 'フロアを選択してください'); // フロアはダンジョン選択後に有効化
        // ▲▲▲【ここまで修正】▲▲▲

        // ダンジョン選択時のイベントリスナー
        dungeonSelect.addEventListener('change', () => {
            const selectedDungeon = dungeonSelect.value;
            initializeSelect(floorSelect, 'フロアを選択してください'); // フロアをリセット
            if (selectedDungeon && damageDungeonData[selectedDungeon]) {
                Object.keys(damageDungeonData[selectedDungeon]).forEach(name => floorSelect.add(new Option(name, name)));
                floorSelect.disabled = false;
            } else {
                floorSelect.disabled = true;
            }
             runDamageCalculation(); // ダンジョン変更時も計算実行
        });

        expDungeon.addEventListener('change', () => {
            const selectedDungeon = expDungeon.value;
            initializeSelect(expFloor, 'フロアを選択してください'); // フロアをリセット
            if (selectedDungeon && typeof expData[selectedDungeon] === 'object' && !Array.isArray(expData[selectedDungeon])) {
                Object.keys(expData[selectedDungeon]).forEach(name => expFloor.add(new Option(name, name)));
                expFloor.disabled = false;
            } else {
                expFloor.disabled = true; // フロア選択が不要な場合も無効化
            }
            calculateExp(); // ダンジョン変更時も計算実行
        });

        // 補助的な初期化関数（プレースホルダーのみ設定）
        function initializeSelect(selectElement, placeholderText) {
             selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
             selectElement.disabled = true;
        }


        setupTabs();
        setupPopupsAndSync();

        // 前回表示していたタブを復元、またはデフォルトタブを表示
        const lastTab = localStorage.getItem('lastActiveTab');
        const initialTab = lastTab ? document.querySelector(`.tab-button[data-tab="${lastTab}"]`) : document.querySelector('.tab-button.active');
        if (initialTab) {
            initialTab.click(); // 保存されたタブ、またはデフォルトのアクティブタブをクリックして初期化
        }
        localStorage.removeItem('lastActiveTab'); // 復元後は削除

        fetchAndShowNotifications();
    }

    initializeAll();
});
