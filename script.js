// ----------- データ読み込み関連 -----------
async function fetchDamageDungeonData() {
    const response = await fetch('./dungeonData.json');
    if (!response.ok) {
        alert('ダメージダンジョンデータの読み込みに失敗しました。');
        return {};
    }
    return await response.json();
}

async function fetchExpData() {
    const response = await fetch('./pad_experience_data.json');
    if (!response.ok) {
        alert('経験値データの読み込みに失敗しました。');
        return {};
    }
    return await response.json();
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
function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const targetId = tab.dataset.tab;
            tabContents.forEach(tc => {
                tc.classList.toggle('hidden', tc.id !== targetId);
            });
            // 各タブの初期化処理を呼ぶ
            if (targetId === 'damage' && !damageTabInitialized) setupDamageTab();
            if (targetId === 'exp' && !expTabInitialized) setupExpTab();
            if (targetId === 'hp' && !hpTabInitialized) setupHpTab();
        });
    });
}

// ----------- 各タブの初期化処理 -----------
let damageTabInitialized = false;
let expTabInitialized = false;
let hpTabInitialized = false;

function setupDamageTab() {
    if (damageTabInitialized) return;
    [dungeonSelect, floorSelect, inputA, inputB, inputC, inputL].forEach(el => {
        el.addEventListener('change', runDamageCalculation);
        if(el.tagName === 'INPUT') el.addEventListener('input', runDamageCalculation);
    });
    damageTabInitialized = true;
}

function setupExpTab() {
    if (expTabInitialized) return;
    [expDungeon, expFloor, leaderMultiplier, friendMultiplier, document.getElementById('padPassBonus'), document.getElementById('adDouble'), document.getElementById('badgeBonus')].forEach(el => {
        el.addEventListener('change', calculateExp);
    });
    dungeonBonusCount.addEventListener('input', calculateExp);
    expTabInitialized = true;
}

function setupHpTab() {
    if (hpTabInitialized) return;
    const inputs = document.querySelectorAll('#hp input');
    inputs.forEach(input => {
        input.addEventListener('input', runHpCalculations);
    });
    runHpCalculations(); // 初期計算
    hpTabInitialized = true;
}

// ----------- 計算処理 -----------
function runDamageCalculation() { /* ... */ }
function calculateExp() { /* ... */ }
function runHpCalculations() { /* ... */ }

// (ここに各計算関数の詳細を記述)

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
// --- 経験値計算 ---
function calculateExp() {
    const dungeonName = expDungeon.value;
    const floorName = expFloor.value;
    if (!dungeonName) { expValueDisplay.textContent = '-'; return; }
    
    const floors = expData[dungeonName];
    let baseExp = (typeof floors === 'object' && !Array.isArray(floors)) ? floors[floorName] : floors;
    
    if (typeof baseExp === 'undefined') { expValueDisplay.textContent = '-'; return; }
    
    const leaderMulti = parseFloat(leaderMultiplier.value);
    const friendMulti = parseFloat(friendMultiplier.value);
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

// --- HP計算 ---
function runHpCalculations() {
    // 1. パーティ合計HP
    const hps = [1,2,3,4,5,6].map(i => parseInt(document.getElementById(`hp${i}`).value) || 0);
    const totalBaseHp = hps.reduce((a, b) => a + b, 0);
    const lMulti = parseFloat(document.getElementById('partyLHpMulti').value) || 1;
    const fMulti = parseFloat(document.getElementById('partyFHpMulti').value) || 1;
    const teamHpAwake = parseInt(document.getElementById('partyTeamHpAwakeCount').value) || 0;
    const teamHpAwakeMulti = 1 + 0.05 * teamHpAwake;
    const avgMulti = (lMulti + fMulti) / 2;
    const afterMulti = Math.floor(totalBaseHp * avgMulti);
    const finalTotalHp = Math.floor(afterMulti * teamHpAwakeMulti);
    document.getElementById('totalHpResult').textContent = totalBaseHp > 0 ? `合計HP: ${finalTotalHp.toLocaleString()}` : '-';

    // 2. チームHP覚醒での増加分
    // ... (他のHP計算も同様にここに追加)
}


// ----------- お知らせ機能関連 -----------
const notificationIcon = document.getElementById('notificationIcon');
const notificationBadge = document.getElementById('notificationBadge');
const notificationPopup = document.getElementById('notificationPopup');
const popupOverlay = document.getElementById('popupOverlay');
const popupCloseButton = document.getElementById('popupCloseButton');
const notificationList = document.getElementById('notification-list');
let latestNotificationDate = '';

// ----------- 外部リンクポップアップ関連 -----------
const linksPopupButton = document.getElementById('external-links-button');
const linksPopup = document.getElementById('links-popup');
const linksPopupOverlay = document.getElementById('links-popup-overlay');
const linksPopupCloseButton = document.getElementById('links-popup-close-button');


// ----------- 背景画像のランダム設定 -----------
async function setRandomBackground() {
    try {
        const response = await fetch('./media-list.json?t=' + new Date().getTime());
        if (!response.ok) throw new Error('背景リストが見つかりません');
        const backgroundImages = await response.json();
        if (!backgroundImages || backgroundImages.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * backgroundImages.length);
        const selectedImage = backgroundImages[randomIndex];
        document.body.style.backgroundImage = `url('${selectedImage}')`;
    } catch (error) {
        console.error('背景画像の設定に失敗しました:', error);
    }
}

// ----------- 初期化処理 -----------
async function initializeAll() {
    await setRandomBackground(); 

    [damageDungeonData, expData] = await Promise.all([
        fetchDamageDungeonData(),
        fetchExpData()
    ]);
    
    // Selectの初期化
    Object.keys(damageDungeonData).forEach(dungeonName => dungeonSelect.add(new Option(dungeonName, dungeonName)));
    Object.keys(expData).forEach(dungeonName => expDungeon.add(new Option(dungeonName, dungeonName)));

    setupTabs();
    const initialTab = document.querySelector('.tab-button.active');
    if (initialTab) {
        const event = new Event('click');
        initialTab.dispatchEvent(event);
    }

    // ポップアップイベントリスナー
    notificationIcon.addEventListener('click', () => { /* ... */ });
    popupOverlay.addEventListener('click', () => notificationPopup.classList.add('hidden'));
    popupCloseButton.addEventListener('click', () => notificationPopup.classList.add('hidden'));
    linksPopupButton.addEventListener('click', () => linksPopup.classList.remove('hidden'));
    linksPopupOverlay.addEventListener('click', () => linksPopup.classList.add('hidden'));
    linksPopupCloseButton.addEventListener('click', () => linksPopup.classList.add('hidden'));

    // お知らせ取得
    // ... (fetchAndShowNotifications)
}

document.addEventListener('DOMContentLoaded', initializeAll);
