// --- API PROXY ENDPOINTS ---
const API_BASE = ''; // Use relative path for same-origin requests
const API = {
    USERS: `${API_BASE}/api/users`,
    ADS: `${API_BASE}/api/ads`,
    CHAT: `${API_BASE}/api/chat`,
    CHAT_LOGS: `${API_BASE}/api/chat-logs`,
    AI_ANALYSIS: `${API_BASE}/api/analyze`
};

// --- DOM ELEMENTS ---
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSubmitText = document.getElementById('auth-submit-text');
const authError = document.getElementById('auth-error');
const authLoader = document.getElementById('authLoader');
const registerNameField = document.getElementById('register-name-field');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEmail = document.getElementById('currentUserEmail');
const sidebarNav = document.getElementById('sidebar-nav');
const mainContentArea = document.getElementById('main-content-area');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const recordModal = document.getElementById('recordModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalContainer = recordModal.querySelector('.modal-container');
const modalTitle = document.getElementById('modalTitle');
const recordForm = document.getElementById('recordForm');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const submitFormBtn = document.getElementById('submitFormBtn');
const formLoader = document.getElementById('formLoader');
const deleteConfirmModal = document.getElementById('deleteConfirmModal');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const errorMessage = document.getElementById('error-message');
const confirmationPopup = document.getElementById('confirmationPopup');

// --- STATE ---
let currentUser = null;
let allAdsData = [], displayedAdsData = [];
let allUsersData = [], displayedUsersData = [];
let allChatLogsData = [], displayedConversations = [];
let charts = {};
let isProcessing = false;
let authMode = 'login';
let itemToEdit = null;
let itemToDelete = null;
let adsSortConfig = { key: 'campaign', direction: 'ascending' };
let usersSortConfig = { key: 'Name', direction: 'ascending' };
let activeThreadId = crypto.randomUUID();

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    buildInitialUI();
    addEventListeners();
    checkAuth();
});

function buildInitialUI() {
    const menuStructure = {
        "Giao tiếp": [
            { view: 'chatbot', icon: 'fa-robot', text: 'Chatbot' },
            { view: 'chat-logs', icon: 'fa-history', text: 'Chatlogs' },
            { view: 'profiles', icon: 'fa-users-cog', text: 'Profiles' }
        ],
        "Kế hoạch": [
            { view: 'planner', icon: 'fa-calendar-days', text: 'Planner' },
            { view: 'tasklist', icon: 'fa-tasks', text: 'Tasklist' },
            { view: 'postlist', icon: 'fa-share-square', text: 'Postlist' }
        ],
        "Cơ sở dữ liệu": [
            { view: 'ads-db', icon: 'fa-chart-line', text: 'Ads DB' },
            { view: 'sales-db', icon: 'fa-headset', text: 'Sales DB' },
            { view: 'acc-db', icon: 'fa-file-invoice-dollar', text: 'Accounting DB' },
            { view: 'hr-db', icon: 'fa-user-tie', text: 'HR DB' },
            { view: 'product-db', icon: 'fa-boxes-stacked', text: 'Product DB' }
        ]
    };

    let sidebarHtml = '';
    Object.keys(menuStructure).forEach(group => {
        sidebarHtml += `<h3 class="px-2 py-2 text-xs font-semibold text-slate-500 uppercase mt-4">${group}</h3>`;
        menuStructure[group].forEach(item => {
            sidebarHtml += `
                <button data-view="${item.view}" class="sidebar-btn w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-slate-700 ${item.view === 'chatbot' ? 'active' : ''}">
                    <i class="fa-solid ${item.icon} w-5 text-center"></i> ${item.text}
                </button>`;
        });
    });
    sidebarNav.innerHTML = sidebarHtml;
    
    Object.values(menuStructure).flat().forEach(item => {
        const viewDiv = document.createElement('div');
        viewDiv.id = `view-${item.view}`;
        viewDiv.className = `view-container ${item.view === 'chatbot' ? 'active h-full' : ''}`;
        mainContentWrapper.appendChild(viewDiv);
    });

    initializeViewContent();
}

function initializeViewContent() {
    document.getElementById('view-chatbot').innerHTML = `
        <div class="bg-white rounded-lg shadow-sm p-4 flex flex-col h-full">
            <div class="flex justify-between items-center mb-2 pb-2 border-b">
                <h2 class="text-xl font-bold">Chatbot</h2>
                <span class="text-xs text-slate-500">ID: <code id="thread-id-display" class="font-mono"></code></span>
                <button id="new-chat-btn" class="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-md hover:bg-indigo-200 transition-colors">+ Cuộc trò chuyện mới</button>
            </div>
            <div id="chat-messages" class="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
                <div class="flex justify-start"><div class="chat-bubble-ai p-3 rounded-lg max-w-lg">Xin chào! Tôi có thể giúp gì cho bạn?</div></div>
            </div>
            <div class="flex gap-2 border-t pt-4">
                <input type="text" id="chat-input" placeholder="Hỏi AI..." class="flex-grow w-full px-4 py-2 border rounded-lg">
                <button id="chat-send-btn" class="bg-indigo-600 text-white font-semibold px-5 py-2 rounded-lg">Gửi</button>
            </div>
        </div>`;
    
    document.getElementById('view-ads-db').innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold text-slate-900">Ads Database</h1>
            <div class="flex items-center gap-2">
                <button data-db-type="ads" class="db-add-record-btn bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700">Thêm Bản ghi</button>
                <button id="refreshDataBtn" class="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">Làm mới</button>
            </div>
        </div>
        <p id="lastUpdated" class="text-slate-600 mb-4 text-sm">Đang tải...</p>
        <div id="dashboard-content">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div class="kpi-card bg-white p-6 rounded-lg shadow-sm"><div><p>Tổng chi tiêu</p><p id="kpi-spend" class="text-2xl font-bold">0</p></div></div>
                <div class="kpi-card bg-white p-6 rounded-lg shadow-sm"><div><p>Lượt hiển thị</p><p id="kpi-impressions" class="text-2xl font-bold">0</p></div></div>
                <div class="kpi-card bg-white p-6 rounded-lg shadow-sm"><div><p>CPC Trung bình</p><p id="kpi-cpc" class="text-2xl font-bold">0</p></div></div>
                <div class="kpi-card bg-white p-6 rounded-lg shadow-sm"><div><p>Tổng Click</p><p id="kpi-clicks" class="text-2xl font-bold">0</p></div></div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="bg-white p-4 rounded-lg shadow-sm chart-container flex flex-col"><h3 class="font-semibold mb-4">Hiệu suất</h3><div class="flex-grow"><canvas id="performanceChart"></canvas></div></div>
                <div class="bg-white p-4 rounded-lg shadow-sm chart-container flex flex-col"><h3 class="font-semibold mb-4">Phân bổ chi tiêu</h3><div class="flex-grow"><canvas id="campaignSpendChart"></canvas></div></div>
            </div>
            <div class="bg-white p-4 rounded-lg shadow-sm">
                 <div class="overflow-x-auto"><table class="min-w-full divide-y"><thead class="bg-slate-50"><tr>
                    <th class="sortable-header px-6 py-3 text-left" data-sort-key="campaign">Nhóm quảng cáo <span class="sort-icon"></span></th>
                    <th class="sortable-header px-6 py-3 text-left" data-sort-key="spend">Chi tiêu <span class="sort-icon"></span></th>
                    <th class="px-6 py-3 text-left">Hành động</th>
                </tr></thead><tbody id="adsDataTableBody"></tbody></table></div>
            </div>
        </div>`;
    // Other views can be populated here in a similar fashion
    
    injectAiSections();
}

function addEventListeners() {
    authForm.addEventListener('submit', handleAuthSubmit);
    authToggleBtn.addEventListener('click', toggleAuthMode);
    logoutBtn.addEventListener('click', handleLogout);
    sidebarNav.addEventListener('click', (e) => {
        const button = e.target.closest('.sidebar-btn');
        if (button) switchView(button.dataset.view);
    });
    mainContentWrapper.addEventListener('click', handleMainContentClick);
    cancelModalBtn.addEventListener('click', hideModal);
    modalOverlay.addEventListener('click', hideModal);
    recordForm.addEventListener('submit', handleFormSubmit);
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    confirmDeleteBtn.addEventListener('click', processDelete);
}

function handleMainContentClick(e) {
    const aiButton = e.target.closest('.ai-refresh-btn');
    const addDbButton = e.target.closest('.db-add-record-btn');
    const chatSendBtn = e.target.closest('#chat-send-btn');
    const newChatBtn = e.target.closest('#new-chat-btn');

    if (aiButton) handleAiRefresh(aiButton);
    if (addDbButton) openModal(addDbButton.dataset.dbType);
    if (chatSendBtn) handleChatSubmit();
    if (newChatBtn) startNewChat();
}

function checkAuth() {
    const user = sessionStorage.getItem('currentUser');
    if (user) {
        currentUser = JSON.parse(user);
        showAppView();
    } else {
        showAuthView();
    }
}

function showAppView() {
    authView.classList.add('hidden');
    appView.style.display = 'flex';
    currentUserEmail.textContent = currentUser.Email;
    loadAdsFromWebhook();
    updateThreadIdDisplay();
}

function showAuthView() {
    appView.style.display = 'none';
    authView.classList.remove('hidden');
    sessionStorage.removeItem('currentUser');
    currentUser = null;
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    setLoadingState(true, 'auth');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(`${API.USERS}/${authMode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Authentication failed');

        if (authMode === 'login') {
            currentUser = result.user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showAppView();
        } else {
            toggleAuthMode();
            authError.textContent = 'Đăng ký thành công! Vui lòng đăng nhập.';
            authError.className = 'text-sm text-green-600';
        }
    } catch (error) {
        authError.textContent = error.message;
    } finally {
        setLoadingState(false, 'auth');
    }
}

function handleLogout() {
    showAuthView();
}

function toggleAuthMode() {
    authMode = authMode === 'login' ? 'register' : 'login';
    authError.textContent = '';
    if (authMode === 'register') {
        authTitle.textContent = 'Tạo tài khoản';
        authToggleBtn.textContent = 'đăng nhập vào tài khoản đã có';
        authSubmitText.textContent = 'Đăng ký';
        registerNameField.classList.remove('hidden');
        registerNameField.querySelector('input').required = true;
    } else {
        authTitle.textContent = 'Đăng nhập';
        authToggleBtn.textContent = 'tạo một tài khoản mới';
        authSubmitText.textContent = 'Đăng nhập';
        registerNameField.classList.add('hidden');
        registerNameField.querySelector('input').required = false;
    }
}

function switchView(viewName) {
    document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    document.querySelector(`.sidebar-btn[data-view=${viewName}]`).classList.add('active');
}

async function loadAdsFromWebhook() {
    if (isProcessing) return;
    setLoadingState(true, 'data', document.getElementById('refreshDataBtn'));
    hideError();
    try {
        const response = await fetch(API.ADS);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to fetch ads data');
        }
        allAdsData = (await response.json()).map((item, index) => ({
            row_number: index + 2,
            campaign: item['Ad Set Name'],
            spend: parseFloat(item['Amount Spent'] || 0),
        }));
        applyAdsFiltersAndSorting();
        document.getElementById('lastUpdated').textContent = `Cập nhật lần cuối lúc: ${new Date().toLocaleTimeString('vi-VN')}`;
    } catch (error) {
        showError(`Tải dữ liệu QC thất bại: ${error.message}`);
    } finally {
        setLoadingState(false, 'data', document.getElementById('refreshDataBtn'));
    }
}

function applyAdsFiltersAndSorting() {
    displayedAdsData = [...allAdsData];
    updateDashboardUI(displayedAdsData);
}

function updateDashboardUI(data) {
    updateAdsDataTable(data);
}

function updateAdsDataTable(data) {
    const tableBody = document.getElementById('adsDataTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4">${item.campaign}</td>
            <td class="px-6 py-4">${item.spend.toLocaleString()}</td>
            <td class="px-6 py-4"><button class="text-indigo-600">Sửa</button></td>
        `;
        tableBody.appendChild(row);
    });
}

function startNewChat() {
    activeThreadId = crypto.randomUUID();
    updateThreadIdDisplay();
    document.getElementById('chat-messages').innerHTML = '<div class="flex justify-start"><div class="chat-bubble-ai p-3 rounded-lg max-w-lg">Bắt đầu cuộc trò chuyện mới. Tôi có thể giúp gì cho bạn?</div></div>';
}

function updateThreadIdDisplay() {
    const display = document.getElementById('thread-id-display');
    if (display) display.textContent = activeThreadId.substring(0, 8);
}

async function handleChatSubmit() {
    const chatInput = document.getElementById('chat-input');
    const userInput = chatInput.value.trim();
    if (!userInput || isProcessing) return;
    
    appendChatMessage(userInput, 'user');
    chatInput.value = '';
    setLoadingState(true, 'chat');

    try {
        const response = await fetch(API.CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: userInput, 
                email: currentUser.Email, 
                threadId: activeThreadId 
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Error from chatbot');
        appendChatMessage(result.reply, 'ai');
    } catch (error) {
        appendChatMessage(`Lỗi: ${error.message}`, 'ai');
    } finally {
        setLoadingState(false, 'chat');
    }
}

function appendChatMessage(message, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const wrapper = document.createElement('div');
    wrapper.className = `flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`;
    const bubble = document.createElement('div');
    bubble.className = `p-3 rounded-lg max-w-lg ${sender === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`;
    bubble.innerHTML = marked.parse(message);
    wrapper.appendChild(bubble);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function injectAiSections() {
    document.querySelectorAll('.view-container').forEach(view => {
        if(view.id === 'view-chatbot') return;
        const viewId = view.id.replace('view-', '');
        const aiSectionHtml = `
            <div class="ai-analysis-container mb-6 bg-white p-6 rounded-lg shadow-sm border">
                <div class="flex justify-between items-center">
                    <h2 class="text-xl font-bold">AI Phân tích & Đề xuất</h2>
                    <button class="ai-refresh-btn bg-indigo-600 text-white font-semibold px-4 py-2 rounded-lg" data-view-id="${viewId}">Phân tích AI</button>
                </div>
                <div class="ai-summary text-slate-700 prose mt-4"><p>Nhấn nút để nhận đề xuất.</p></div>
            </div>`;
        view.insertAdjacentHTML('afterbegin', aiSectionHtml);
    });
}

async function handleAiRefresh(button) {
    const summaryDiv = button.closest('.ai-analysis-container').querySelector('.ai-summary');
    summaryDiv.innerHTML = `<p>Phân tích AI đang được thực hiện...</p>`;
}

function setLoadingState(isLoading, type, element = null) {
    isProcessing = isLoading;
    if (type === 'auth') {
        authSubmitBtn.disabled = isLoading;
        authLoader.classList.toggle('hidden', !isLoading);
    } else if (element) {
        element.disabled = isLoading;
    }
}

function showError(msg) {
    errorMessage.textContent = `Lỗi: ${msg}`;
    errorMessage.classList.remove('hidden');
    setTimeout(() => errorMessage.classList.add('hidden'), 5000);
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function openModal(type, item = null) {
    modalTitle.textContent = item ? `Sửa ${type}` : `Thêm ${type}`;
    recordModal.classList.remove('hidden');
}

function hideModal() {
    recordModal.classList.add('hidden');
}

function handleFormSubmit(e) { e.preventDefault(); }
function handleDeleteClick(type, item) { deleteConfirmModal.classList.remove('hidden'); }
function hideDeleteModal() { deleteConfirmModal.classList.add('hidden'); }
function processDelete() {}
