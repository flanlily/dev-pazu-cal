            // ----------- データ読み込み関連 -----------
            async function fetchDamageDungeonData() {
                const response = await fetch('./dungeonData.json');
                if (!response.ok) {
                    alert('ダメージダンジョンデータの読み込みに失敗しました。');
                    return {};
                }
                const data = await response.json();
                for (const dungeon in data) {
                    for (const floor in data[dungeon]) {
                        if (typeof data[dungeon][floor] === 'string') {
                            data[dungeon][floor] = data[dungeon][floor]
                                .split(',')
                                .map(s => parseFloat(s.replace('%', '').trim()))
                                .filter(v => !isNaN(v));
                        }
                    }
                }
                return data;
            }

            async function fetchExpData() {
                const response = await fetch('./pad_experience_data.json');
                if (!response.ok) {
                    alert('経験値データの読み込みに失敗しました。');
                    return {};
                }
                const data = await response.json();
                return data;
            }

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

            let damageDungeonData = {};
            let expData = {};

            // ----------- タブ切り替え処理 -----------

            // タブごとに初期化関数を用意
            let damageTabInitialized = false;
            let expTabInitialized = false;
            let hpTabInitialized = false;

            function setupDamageTab() {
                if (damageTabInitialized) return;
                floorSelect.addEventListener('change', runDamageCalculation);
                [inputA, inputB, inputC, inputL].forEach(el => {
                    el.addEventListener('input', runDamageCalculation);
                    el.addEventListener('change', runDamageCalculation);
                });
                damageTabInitialized = true;
            }

            function setupExpTab() {
                if (expTabInitialized) return;
                expFloor.addEventListener('change', calculateExp);
                leaderMultiplier.addEventListener('change', calculateExp);
                friendMultiplier.addEventListener('change', calculateExp);
                dungeonBonusCount.addEventListener('input', calculateExp);
                document.getElementById('adDouble').addEventListener('change', calculateExp);
                document.getElementById('badgeBonus').addEventListener('change', calculateExp);
                expTabInitialized = true;
            }

            function setupHpTab() {
                if (hpTabInitialized) return;
                // 1. パーティ合計HP計算
                const hpInputs = [1, 2, 3, 4, 5, 6].map(i => document.getElementById('hp' + i));
                const totalHpResult = document.getElementById('totalHpResult');
                const partyLHpMulti = document.getElementById('partyLHpMulti');
                const partyFHpMulti = document.getElementById('partyFHpMulti');
                const partyTeamHpAwakeCount = document.getElementById('partyTeamHpAwakeCount');

                function calcTotalHp() {
                    const hps = hpInputs.map(input => parseInt(input.value) || 0);
                    const total = hps.reduce((a, b) => a + b, 0);
                    const lMulti = parseFloat(partyLHpMulti.value) || 1;
                    const fMulti = parseFloat(partyFHpMulti.value) || 1;
                    const teamHpAwake = parseInt(partyTeamHpAwakeCount.value) || 0;
                    // チームHP覚醒倍率
                    const teamHpAwakeMulti = 1 + 0.05 * teamHpAwake;
                    // L/F平均倍率
                    const avgMulti = (lMulti + fMulti) / 2;
                    // 計算
                    let resultText = '-';
                    if (total > 0) {
                        const afterMulti = Math.floor(total * avgMulti);
                        const afterAwake = Math.floor(afterMulti * teamHpAwakeMulti);
                        resultText = `合計HP: ${total.toLocaleString()} → L/F倍率後: ${afterMulti.toLocaleString()} → チームHP覚醒後: ${afterAwake.toLocaleString()}`;
                    }
                    totalHpResult.textContent = resultText;
                }
                hpInputs.forEach(input => input.addEventListener('input', calcTotalHp));
                partyLHpMulti.addEventListener('input', calcTotalHp);
                partyFHpMulti.addEventListener('input', calcTotalHp);
                partyTeamHpAwakeCount.addEventListener('input', calcTotalHp);
                calcTotalHp();
                hpTabInitialized = true;
            } 

            // タブ切り替え時に該当タブの初期化関数を呼ぶ
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    tabContents.forEach(tc => {
                        if (tc.id === tab.dataset.tab) {
                            tc.classList.remove('hidden');
                        } else {
                            tc.classList.add('hidden');
                        }
                    });
                    if (tab.dataset.tab === 'damage') setupDamageTab();
                    if (tab.dataset.tab === 'exp') setupExpTab();
                    if (tab.dataset.tab === 'hp') setupHpTab();
                });
            });

            // 初期表示時にdamageタブだけでなく、activeなタブの初期化も行う
            const activeTab = document.querySelector('.tab-button.active');
            if (activeTab) {
                if (activeTab.dataset.tab === 'damage') setupDamageTab();
                if (activeTab.dataset.tab === 'exp') setupExpTab();
                if (activeTab.dataset.tab === 'hp') setupHpTab();
                tabContents.forEach(tc => {
                    if (tc.id === activeTab.dataset.tab) {
                        tc.classList.remove('hidden');
                    } else {
                        tc.classList.add('hidden');
                    }
                });
            }

            // ----------- ダメージ軽減処理 -----------
            function initializeDamageDungeonSelect() {
                dungeonSelect.innerHTML = '<option value="">ダンジョンを選択してください</option>';
                for (const dungeonName in damageDungeonData) {
                    const option = document.createElement('option');
                    option.value = dungeonName;
                    option.textContent = dungeonName;
                    dungeonSelect.appendChild(option);
                }
                floorSelect.innerHTML = '<option value="">フロアを選択してください</option>';
                floorSelect.disabled = true;
            }

            dungeonSelect.addEventListener('change', () => {
                const selectedDungeon = dungeonSelect.value;
                floorSelect.innerHTML = '<option value="">フロアを選択してください</option>';
                floorSelect.disabled = true;

                if (selectedDungeon && damageDungeonData[selectedDungeon]) {
                    const floors = damageDungeonData[selectedDungeon];
                    for (const floorName in floors) {
                        const option = document.createElement('option');
                        option.value = floorName;
                        option.textContent = floorName;
                        floorSelect.appendChild(option);
                    }
                    floorSelect.disabled = false;
                }
                runDamageCalculation();
            });

            floorSelect.addEventListener('change', runDamageCalculation);
            [inputA, inputB, inputC, inputL].forEach(el => {
                el.addEventListener('input', runDamageCalculation);
                el.addEventListener('change', runDamageCalculation);
            });

            function runDamageCalculation() {
                const selectedDungeon = dungeonSelect.value;
                const selectedFloor = floorSelect.value;
                const valA = parseFloat(inputA.value);
                const valB = parseFloat(inputB.value);
                const valC = parseFloat(inputC.value);
                const valL = parseInt(inputL.value) || 0;

                resultsTableBody.innerHTML = '';

                if (!selectedDungeon || !selectedFloor) {
                    totalReductionRateDisplay.textContent = '';
                    if (selectedDungeon && selectedFloor && damageDungeonData[selectedDungeon] && damageDungeonData[selectedDungeon][selectedFloor]) {
                        const damageRatios = damageDungeonData[selectedDungeon][selectedFloor];
                        damageRatios.forEach(ratio => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `<td>${ratio}%</td><td>${ratio}%</td><td>-</td>`;
                            resultsTableBody.appendChild(tr);
                        });
                    }
                    return;
                }

                if (isNaN(valA) || isNaN(valB)) {
                    totalReductionRateDisplay.textContent = 'リーダー軽減率と助っ人軽減率は数値で入力してください。';
                    return;
                }

                if (valL < 0) {
                    totalReductionRateDisplay.textContent = '個数は0以上で入力してください。';
                    return;
                }

                // ===== ▼▼▼【今度こそ、ご指定の正しいロジックです】▼▼▼
                // 軽減率計算
                // (1 - A) * (1 - B) * (1 - C) * (1 - 0.05 * L)
                const leaderReduce = 1 - valA;
                const friendReduce = 1 - valB;
                const skillReduce = 1 - valC;
                const lReduce = 1 - 0.05 * valL;

                let totalReduce = leaderReduce * friendReduce * skillReduce * lReduce;
                totalReduce = Math.max(0, Math.min(1, totalReduce));
                const totalReducePercent = ((1 - totalReduce) * 100).toFixed(2);
                totalReductionRateDisplay.textContent = `総軽減率: ${totalReducePercent}%`;


                const damageRatios = damageDungeonData[selectedDungeon][selectedFloor];

                damageRatios.forEach(ratio => {

                    const finalDamagePercent = (ratio * totalReduce).toFixed(2);
                    const canSurvive = finalDamagePercent < 100 ? '耐えられる' : '耐えられない';

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${ratio}%</td>
                        <td>${finalDamagePercent}%</td>
                        <td class="${canSurvive === '耐えられる' ? 'can-withstand' : 'cannot-withstand'}">${canSurvive}</td>
                        `;
                    resultsTableBody.appendChild(tr);
                });
            }


            // ----------- 経験値計算処理 -----------
            function initializeExpDungeonSelect() {
                expDungeon.innerHTML = '<option value="">ダンジョンを選択してください</option>';
                for (const dungeonName in expData) {
                    const option = document.createElement('option');
                    option.value = dungeonName;
                    option.textContent = dungeonName;
                    expDungeon.appendChild(option);
                }
                expFloor.innerHTML = '<option value="">フロアを選択してください</option>';
                expFloor.disabled = true;
            }

            expDungeon.addEventListener('change', () => {
                const dungeonName = expDungeon.value;
                expFloor.innerHTML = '<option value="">フロアを選択してください</option>';
                expFloor.disabled = true;
                expValueDisplay.textContent = '-';

                if (!dungeonName) return;
                const floors = expData[dungeonName];
                if (floors && typeof floors === 'object' && !Array.isArray(floors)) {
                    for (const floorName in floors) {
                        const option = document.createElement('option');
                        option.value = floorName;
                        option.textContent = floorName;
                        expFloor.appendChild(option);
                    }
                    expFloor.disabled = false;
                } else {
                    expFloor.disabled = true;
                }
                calculateExp();
            });

            expFloor.addEventListener('change', calculateExp);
            leaderMultiplier.addEventListener('change', calculateExp);
            friendMultiplier.addEventListener('change', calculateExp);
            dungeonBonusCount.addEventListener('input', calculateExp);

            function calculateExp() {
                const dungeonName = expDungeon.value;
                const floorName = expFloor.value;
                if (!dungeonName) { expValueDisplay.textContent = '-'; return; }
                const floors = expData[dungeonName];
                let baseExp;
                if (typeof floors === 'object' && !Array.isArray(floors)) {
                    if (!floorName) { expValueDisplay.textContent = '-'; return; }
                    baseExp = floors[floorName];
                } else {
                    baseExp = floors;
                }
                if (typeof baseExp === 'undefined') { expValueDisplay.textContent = '-'; return; }
                const leaderMulti = parseFloat(leaderMultiplier.value);
                const friendMulti = parseFloat(friendMultiplier.value);
                const bonusCount = parseInt(dungeonBonusCount.value) || 0;
                const bonusMultiplier = Math.pow(1.02, bonusCount);
                const adDouble = parseFloat(document.getElementById('adDouble').value) || 1;
                const badgeBonus = parseFloat(document.getElementById('badgeBonus').value) || 1;
                const preBadgeExp = baseExp * leaderMulti * friendMulti * bonusMultiplier * adDouble;
                let totalExp;
                if (badgeBonus === 1.1) {
                    totalExp = preBadgeExp * 1.1;
                } else {
                    totalExp = preBadgeExp;
                }
                expValueDisplay.textContent = `獲得経験値: ${Math.round(totalExp).toLocaleString()}`;
            }

            // ----------- お知らせ機能関連 -----------
            const notificationIcon = document.getElementById('notificationIcon');
            const notificationBadge = document.getElementById('notificationBadge');
            const notificationPopup = document.getElementById('notificationPopup');
            const popupOverlay = document.getElementById('popupOverlay');
            const popupCloseButton = document.getElementById('popupCloseButton');
            const notificationList = document.getElementById('notification-list');
            
            let latestNotificationDate = '';

            async function fetchAndShowNotifications() {
                const syncButton = document.getElementById('syncButton');
                if (syncButton) {
                    syncButton.addEventListener('click', async () => {
                        syncButton.disabled = true;
                        syncButton.textContent = '同期中...';
                        const activeTab = document.querySelector('.tab-button.active');
                        if (activeTab) {
                            localStorage.setItem('lastActiveTab', activeTab.dataset.tab);
                        }
                        const lastReadNotificationDate = localStorage.getItem('lastReadNotificationDate');
                        let oldCount = 0;
                        try {
                            const oldData = JSON.parse(localStorage.getItem('dungeonDataCache') || '{}');
                            oldCount = Object.keys(oldData).reduce((sum, k) => sum + Object.keys(oldData[k]||{}).length, 0);
                        } catch(e) {}
                        document.cookie.split(';').forEach(function(c) {
                            document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
                        });
                        if ('caches' in window) {
                            const cacheNames = await caches.keys();
                            for (const name of cacheNames) {
                                await caches.delete(name);
                            }
                        }
                        const bust = '?t=' + new Date().getTime();
                        const files = [
                            'index.html',
                            'dungeonData.json',
                            'pad_experience_data.json',
                            'style.css',
                            'announcements.json',
                            'media-list.json'
                        ];
                        try {
                            await Promise.all(files.map(f => fetch(f + bust, {cache: 'reload'})));
                        } catch (e) {}
                        if (lastReadNotificationDate) {
                            localStorage.setItem('lastReadNotificationDate', lastReadNotificationDate);
                        }
                        let newCount = 0;
                        try {
                            const res = await fetch('dungeonData.json?t=' + new Date().getTime());
                            const newData = await res.json();
                            newCount = Object.keys(newData).reduce((sum, k) => sum + Object.keys(newData[k]||{}).length, 0);
                            localStorage.setItem('dungeonDataCache', JSON.stringify(newData));
                        } catch(e) {}
                        if (newCount > oldCount) {
                            showSyncNotification(`${newCount-oldCount}件の新しいデータを同期しました`);
                        }
                        location.reload(true);
                    });
                    function showSyncNotification(msg) {
                        let bar = document.getElementById('sync-notification-bar');
                        if (!bar) {
                            bar = document.createElement('div');
                            bar.id = 'sync-notification-bar';
                            bar.style.position = 'fixed';
                            bar.style.top = '0';
                            bar.style.left = '0';
                            bar.style.width = '100%';
                            bar.style.background = '#1976d2';
                            bar.style.color = '#fff';
                            bar.style.textAlign = 'center';
                            bar.style.zIndex = '9999';
                            bar.style.padding = '8px 0';
                            document.body.appendChild(bar);
                        }
                        bar.textContent = msg;
                        bar.style.display = 'block';
                        setTimeout(()=>{ bar.style.display = 'none'; }, 6000);
                    }
                    window.addEventListener('DOMContentLoaded', () => {
                        const lastActiveTab = localStorage.getItem('lastActiveTab');
                        if (lastActiveTab) {
                            const tabBtn = document.querySelector(`.tab-button[data-tab="${lastActiveTab}"]`);
                            if (tabBtn) tabBtn.click();
                            localStorage.removeItem('lastActiveTab');
                        }
                    });
                }
                try {
                    const response = await fetch(`./announcements.json?t=${new Date().getTime()}`);
                    if (!response.ok) throw new Error('お知らせファイルの読み込みに失敗');
                    
                    const notifications = await response.json();
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

                            if (!lastReadDate || item.date > lastReadDate) {
                                unreadCount++;
                            }
                        });

                        if (unreadCount > 0) {
                            notificationBadge.textContent = unreadCount;
                            notificationBadge.classList.remove('hidden');
                            notificationIcon.classList.add('active');
                        } else {
                            notificationBadge.classList.add('hidden');
                            notificationIcon.classList.remove('active');
                        }

                    } else {
                        notificationList.innerHTML = '<p>新しいお知らせはありません。</p>';
                        notificationBadge.classList.add('hidden');
                        notificationIcon.classList.remove('active');
                    }
                } catch (error) {
                    console.error('お知らせ機能エラー:', error);
                    notificationList.innerHTML = '<p>お知らせの読み込みに失敗しました。</p>';
                }
            }

            notificationIcon.addEventListener('click', () => {
                notificationPopup.classList.remove('hidden');
                notificationBadge.classList.add('hidden');
                notificationIcon.classList.remove('active');

                if (latestNotificationDate) {
                    localStorage.setItem('lastReadNotificationDate', latestNotificationDate);
                }
            });

            popupOverlay.addEventListener('click', () => notificationPopup.classList.add('hidden'));
            popupCloseButton.addEventListener('click', () => popupCloseButton.parentElement.parentElement.classList.add('hidden'));
            
            // ----------- PWA と 初期化処理 -----------
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('./sw.js')
                        .then(registration => console.log('Service Worker: 登録成功', registration))
                        .catch(error => console.error('Service Worker: 登録失敗', error));
                });
            }

            // ----------- 背景画像のランダム設定【修正箇所】 -----------
            async function setRandomBackground() {
                try {
                    const response = await fetch('./media-list.json?t=' + new Date().getTime());
                    if (!response.ok) {
                        console.error('背景画像リストの読み込みに失敗しました。');
                        return;
                    }
                    const backgroundImages = await response.json();

                    if (!backgroundImages || backgroundImages.length === 0) return;
                    
                    const randomIndex = Math.floor(Math.random() * backgroundImages.length);
                    const selectedImage = backgroundImages[randomIndex];
                    document.body.style.backgroundImage = `url('${selectedImage}')`;
                    document.body.style.backgroundSize = 'cover';
                    document.body.style.backgroundPosition = 'center center';
                    document.body.style.backgroundRepeat = 'no-repeat';
                    document.body.style.backgroundAttachment = 'fixed';

                } catch (error) {
                    console.error('背景画像の設定中にエラーが発生しました:', error);
                }
            }
            
            // ----------- 全体の初期化処理【修正箇所】 -----------
            async function initializeAll() {
                // 先に背景を設定する
                await setRandomBackground(); 
                
                // 他のデータ取得と初期化を並行して行う
                await Promise.all([
                    fetchDamageDungeonData(),
                    fetchExpData(),
                    fetchAndShowNotifications()
                ]).then(([damageData, expDataValue, _]) => {
                    damageDungeonData = damageData;
                    expData = expDataValue;

                    initializeDamageDungeonSelect();
                    initializeExpDungeonSelect();
                    
                    runDamageCalculation();
                    calculateExp();
                });
            }

            // ページの読み込みが完了したら初期化処理を実行
            window.addEventListener('load', initializeAll);
