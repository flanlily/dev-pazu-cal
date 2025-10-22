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
    const expValueDisplay = document.getElementById('expValue');

    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const notificationIcon = document.getElementById('notificationIcon');
    const notificationBadge = document.getElementById('notificationBadge');
    const notificationPopup = document.getElementById('notificationPopup');
    const popupOverlay = document.getElementById('popupOverlay');
    const popupCloseButton = document.getElementById('popupCloseButton');
    const notificationList = document.getElementById('notification-list');

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
            if (!response.ok) throw new Error(`${url}の読み込みに失敗しました。`);
            return await response.json();
        } catch (error) {
            console.error(error);
            // alert(error.message); // エラー表示は一旦コメントアウト
            return {};
        }
    }

    // ----------- 背景画像のランダム設定 -----------
    async function setRandomBackground() {
        try {
            const backgroundImages = await fetchData('./media-list.json');
            if (!backgroundImages || backgroundImages.length === 0) return;
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

                if (targetId === 'damage' && !damageTabInitialized) setupDamageTab();
                if (targetId === 'exp' && !expTabInitialized) setupExpTab();
                if (targetId === 'hp' && !hpTabInitialized) setupHpTab();
            });
        });
    }

    // ----------- 各タブの初期化 -----------
    function setupDamageTab() {
        if (damageTabInitialized) return;
        [dungeonSelect, floorSelect, inputA, inputB, inputC, inputL].forEach(el => {
            el.addEventListener('change', runDamageCalculation);
            if (el.tagName === 'INPUT') el.addEventListener('input', runDamageCalculation);
        });
        runDamageCalculation();
        damageTabInitialized = true;
    }

    function setupExpTab() {
        if (expTabInitialized) return;
        [expDungeon, expFloor, leaderMultiplier, friendMultiplier, document.getElementById('padPassBonus'), document.getElementById('adDouble'), document.getElementById('badgeBonus')].forEach(el => {
            el.addEventListener('change', calculateExp);
        });
        dungeonBonusCount.addEventListener('input', calculateExp);
        calculateExp();
        expTabInitialized = true;
    }

    function setupHpTab() {
        if (hpTabInitialized) return;
        document.querySelectorAll('#hp input').forEach(input => {
            input.addEventListener('input', runHpCalculations);
        });
        runHpCalculations();
        hpTabInitialized = true;
    }

    // ----------- 計算処理 -----------
    function runDamageCalculation() {
        const selectedDungeon = dungeonSelect.value;
        const selectedFloor = floorSelect.value;
        resultsTableBody.innerHTML = '';
        if (!selectedDungeon || !selectedFloor) {
            totalReductionRateDisplay.textContent = '';
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
        const damageRatios = typeof damageData === 'string'
             ? damageData.split(',').map(s => parseFloat(s.replace('%', '')))
             : (Array.isArray(damageData) ? damageData : []);

        damageRatios.forEach(ratio => {
            if (isNaN(ratio)) return;
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
        if (!dungeonName) { expValueDisplay.textContent = '-'; return; }

        const floors = expData[dungeonName];
        let baseExp = (typeof floors === 'object' && !Array.isArray(floors)) ? floors[floorName] : floors;

        if (typeof baseExp === 'undefined' || baseExp === null || isNaN(baseExp)) {
             expValueDisplay.textContent = '-';
             return;
        }

        const leaderMulti = parseFloat(leaderMultiplier.value) || 1;
        const friendMulti = parseFloat(friendMultiplier.value) || 1;
        const bonusCount = parseInt(dungeonBonusCount.value) || 0;
        const bonusMultiplier = Math.pow(1.02, bonusCount);
        const padPassBonus = parseFloat(document.getElementById('padPassBonus').value) || 1;
        const adDouble = parseFloat(document.getElementById('adDouble').value) || 1;
        const badgeBonus = parseFloat(document.getElementById('badgeBonus').value) || 1;

        const baseWithMultipliers = baseExp * leaderMulti * friendMulti * bonusMultiplier;
        const withPadPass = baseWithMultipliers * padPassBonus;
        const withAd = withPadPass * adDouble;
        const totalExp = (badgeBonus === 1.1) ? (withAd * 1.1) : withAd;

        expValueDisplay.textContent = `獲得経験値: ${Math.round(totalExp).toLocaleString()}`;
    }

    function runHpCalculations() {
        // --- 1. パーティ合計HP計算 ---
        const hps = [1,2,3,4,5,6].map(i => parseInt(document.getElementById(`hp${i}`).value) || 0);
        const totalBaseHp = hps.reduce((a, b) => a + b, 0);
        const lMulti1 = parseFloat(document.getElementById('partyLHpMulti').value) || 1;
        const fMulti1 = parseFloat(document.getElementById('partyFHpMulti').value) || 1;
        const teamHpAwake1 = parseInt(document.getElementById('partyTeamHpAwakeCount').value) || 0;
        const teamHpAwakeMulti1 = 1 + 0.05 * teamHpAwake1;
        const avgMulti1 = (lMulti1 + fMulti1) / 2;
        const afterMulti1 = Math.floor(totalBaseHp * avgMulti1);
        const finalTotalHp1 = Math.floor(afterMulti1 * teamHpAwakeMulti1);
        document.getElementById('totalHpResult').textContent = totalBaseHp > 0 ? `合計HP: ${finalTotalHp1.toLocaleString()}` : '-';

        // --- 2. チームHP覚醒で盛れているHP ---
        const teamTotalHp2 = parseInt(document.getElementById('teamTotalHp').value) || 0;
        const teamHpAwakeCount2 = parseInt(document.getElementById('teamHpAwakeCount').value) || 0;
        let awakeHpIncreaseText = '-';
        if (teamTotalHp2 > 0 && teamHpAwakeCount2 > 0) {
            const teamHpAwakeMulti2 = 1 + 0.05 * teamHpAwakeCount2;
            const hpBeforeAwake = teamTotalHp2 / teamHpAwakeMulti2;
            const increaseAmount = Math.round(teamTotalHp2 - hpBeforeAwake);
            awakeHpIncreaseText = `覚醒による増加分: ${increaseAmount.toLocaleString()} HP`;
        }
        document.getElementById('teamHpAwakeResult').textContent = awakeHpIncreaseText;

        // --- 3. 実質HP計算 ---
        const lMulti3 = parseFloat(document.getElementById('actualLHpMulti').value) || 1;
        const lReduce3 = parseFloat(document.getElementById('actualLReduce').value) || 0;
        const fMulti3 = parseFloat(document.getElementById('actualFHpMulti').value) || 1;
        const fReduce3 = parseFloat(document.getElementById('actualFReduce').value) || 0;
        const skillReduce3 = parseFloat(document.getElementById('actualSkillReduce').value) || 0;

        const effectiveLRate = (1 - lReduce3 > 0) ? lMulti3 / (1 - lReduce3) : Infinity;
        const effectiveFRate = (1 - fReduce3 > 0) ? fMulti3 / (1 - fReduce3) : Infinity;
        const totalEffectiveHpRate = (1 - lReduce3 > 0 && 1 - fReduce3 > 0 && 1 - skillReduce3 > 0)
            ? (lMulti3 * fMulti3) / ((1 - lReduce3) * (1 - fReduce3) * (1 - skillReduce3))
            : Infinity;

        document.getElementById('actualLHpResult').textContent = (effectiveLRate !== Infinity) ? `リーダー実質HP: ${effectiveLRate.toFixed(2)}倍` : '軽減100%';
        document.getElementById('actualFHpResult').textContent = (effectiveFRate !== Infinity) ? `フレンド実質HP: ${effectiveFRate.toFixed(2)}倍` : '軽減100%';
        document.getElementById('actualHpRateResult').textContent = (totalEffectiveHpRate !== Infinity) ? `総合実質HP倍率: ${totalEffectiveHpRate.toFixed(2)}倍` : '完全耐性';

        // --- 4. チームHP覚醒個数逆算 ---
        const targetHp4 = parseInt(document.getElementById('targetHp').value) || 0;
        const currentHp4 = parseInt(document.getElementById('currentHp').value) || 0;
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

        linksPopupButton.addEventListener('click', () => linksPopup.classList.remove('hidden'));
        linksPopupOverlay.addEventListener('click', () => linksPopup.classList.add('hidden'));
        linksPopupCloseButton.addEventListener('click', () => linksPopup.classList.add('hidden'));

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
            location.reload(true);
        });
    }

    async function fetchAndShowNotifications() {
        try {
            const notifications = await fetchData('./announcements.json');
            notificationList.innerHTML = '';
            if (notifications && notifications.length > 0) {
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
            }
        } catch (error) {
            notificationList.innerHTML = '<p>お知らせの読み込みに失敗しました。</p>';
        }
    }

    // ----------- 初期化処理 -----------
    async function initializeAll() {
        await setRandomBackground();

        [damageDungeonData, expData] = await Promise.all([
            fetchData('./dungeonData.json'),
            fetchData('./pad_experience_data.json')
        ]);

        // ▼▼▼【ここから修正】▼▼▼
        // プルダウンの初期化関数
        function initializeSelect(selectElement, placeholderText) {
            selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
            selectElement.disabled = true;
        }

        initializeSelect(dungeonSelect, 'ダンジョンを選択してください');
        initializeSelect(floorSelect, 'フロアを選択してください');
        initializeSelect(expDungeon, 'ダンジョンを選択してください');
        initializeSelect(expFloor, 'フロアを選択してください');
        // ▲▲▲【ここまで修正】▲▲▲

        Object.keys(damageDungeonData).forEach(name => dungeonSelect.add(new Option(name, name)));
        dungeonSelect.addEventListener('change', () => {
            floorSelect.innerHTML = '<option value="">フロアを選択してください</option>';
            const selected = dungeonSelect.value;
            if (selected && damageDungeonData[selected]) {
                Object.keys(damageDungeonData[selected]).forEach(name => floorSelect.add(new Option(name, name)));
                floorSelect.disabled = false;
            } else {
                floorSelect.disabled = true;
            }
             runDamageCalculation();
        });

        Object.keys(expData).forEach(name => expDungeon.add(new Option(name, name)));
        expDungeon.addEventListener('change', () => {
            expFloor.innerHTML = '<option value="">フロアを選択してください</option>';
            const selected = expDungeon.value;
            if (selected && typeof expData[selected] === 'object' && !Array.isArray(expData[selected])) {
                Object.keys(expData[selected]).forEach(name => expFloor.add(new Option(name, name)));
                expFloor.disabled = false;
            } else {
                expFloor.disabled = true;
            }
            calculateExp();
        });

        // ▼▼▼【ここを追加】▼▼▼
        // 初期状態ではダンジョンプルダウンを有効化
        dungeonSelect.disabled = false;
        expDungeon.disabled = false;
        // ▲▲▲【ここまで追加】▲▲▲

        setupTabs();
        setupPopupsAndSync();

        const lastTab = localStorage.getItem('lastActiveTab');
        const initialTab = lastTab ? document.querySelector(`.tab-button[data-tab="${lastTab}"]`) : document.querySelector('.tab-button.active');
        if (initialTab) {
            initialTab.click();
        }
        localStorage.removeItem('lastActiveTab');

        fetchAndShowNotifications();
    }

    initializeAll();
});
