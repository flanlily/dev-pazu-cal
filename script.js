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
 