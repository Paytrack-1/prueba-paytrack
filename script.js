// LOCALSTORAGE - REGISTROS DE USUARIO Y PAGOS
let users = JSON.parse(localStorage.getItem('app_users')) || [
    { user: 'admin', pass: '1234', role: 'admin' }
];

// Pagos Regulares (Sin Cashea)
let payments = JSON.parse(localStorage.getItem('app_payments')) || [
    { id: 1, user: 'Fabricio Santos', dni: 'V-32398546', phone: '04226466851', method: 'Pago Móvil', amount: 120.00, ref: '987654', status: 'Pagado', datetime: '2026-09-23 14:30', image: '' },
    { id: 2, user: 'Empresa Alpha C.A.', dni: 'J-87654321', phone: '04147654321', method: 'Punto de Venta', amount: 80.00, ref: '112233', status: 'Pagado', datetime: '2026-09-22 09:20', image: '' }
];

// Módulo Cashea con Cálculos en Porcentajes
let casheaRecords = JSON.parse(localStorage.getItem('app_cashea_records')) || [
    {
        id: 101,
        user: 'Fabricio Santos',
        dni: 'V-32398546',
        phone: '04226466851',
        totalAmount: 200.00,        // Precio base del producto
        discountPercent: 10.00,     // Descuento en %
        downPaymentPercent: 25.00,  // Monto inicial en %
        paidAmount: 45.00,          // Inicial abonada en $(200 - 10\% = 180 * 25\% = 45$)
        totalInstallments: 3,
        paidInstallments: 0,
        nextDate: new Date().toISOString().slice(0, 10), // Hoy
        status: 'En Proceso'
    }
];

let currentUser = null;
let pendingDeleteCallback = null;
let peer = null;
let currentRoomId = null;

const methodColors = {
    'Pago Móvil': '#1A1A1D',
    'Punto de Venta': '#8D99AE',
    'Efectivo': '#3C3F45',
    'Cashea 💛': '#f59e0b'
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${type === 'success' ? '✓' : '✕'} ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ELEMENTOS DOM
const landingContainer = document.getElementById('landing-container');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const appSidebar = document.getElementById('app-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

const navLoginBtn = document.getElementById('nav-login-btn');
const navRegisterBtn = document.getElementById('nav-register-btn');
const heroGetStarted = document.getElementById('hero-get-started');
const backToLanding = document.getElementById('back-to-landing');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// Pestañas
const tabHistoryBtn = document.getElementById('tab-history-btn');
const tabCasheaBtn = document.getElementById('tab-cashea-btn');
const tabSummaryBtn = document.getElementById('tab-summary-btn');

const viewHistory = document.getElementById('view-history');
const viewCashea = document.getElementById('view-cashea');
const viewSummary = document.getElementById('view-summary');

// Modales Pagos Regulares
const paymentModal = document.getElementById('payment-modal');
const openPaymentModalBtn = document.getElementById('open-payment-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const floatingActionsBar = document.getElementById('floating-actions-bar');

// Modal Editar Pago Regular
const editPaymentModal = document.getElementById('edit-payment-modal');
const closeEditModalBtn = document.getElementById('close-edit-modal-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editPaymentForm = document.getElementById('edit-payment-form');
const editPaymentId = document.getElementById('edit-payment-id');
const editClientInput = document.getElementById('edit-client-input');
const editClientDni = document.getElementById('edit-client-dni');
const editClientPhone = document.getElementById('edit-client-phone');
const editPayMethod = document.getElementById('edit-pay-method');
const editPayStatus = document.getElementById('edit-pay-status');
const editPayAmount = document.getElementById('edit-pay-amount');
const editPayRef = document.getElementById('edit-pay-ref');

// Modales Cashea
const casheaModal = document.getElementById('cashea-modal');
const openCasheaModalBtn = document.getElementById('open-cashea-modal-btn');
const closeCasheaModalBtn = document.getElementById('close-cashea-modal-btn');
const cancelCasheaBtn = document.getElementById('cancel-cashea-btn');
const casheaForm = document.getElementById('cashea-form');

const casheaAbonoModal = document.getElementById('cashea-abono-modal');
const closeAbonoModalBtn = document.getElementById('close-abono-modal-btn');
const cancelAbonoBtn = document.getElementById('cancel-abono-btn');
const casheaAbonoForm = document.getElementById('cashea-abono-form');

// Modal Deudores Unpaid
const unpaidModal = document.getElementById('unpaid-modal');
const openUnpaidModalBtn = document.getElementById('open-unpaid-modal-btn');
const closeUnpaidModalBtn = document.getElementById('close-unpaid-modal-btn');
const closeUnpaidModalFooterBtn = document.getElementById('close-unpaid-modal-footer-btn');
const unpaidTableBody = document.getElementById('unpaid-table-body');

// Modal de Confirmación Personalizado
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmAcceptBtn = document.getElementById('confirm-accept-btn');
const confirmCancelBtn = document.getElementById('confirm-cancel-btn');

// Visualizador Imágenes
const imageViewerModal = document.getElementById('image-viewer-modal');
const viewerFullImage = document.getElementById('viewer-full-image');
const closeViewerBtn = document.getElementById('close-viewer-btn');

// Tabla & Métricas
const paymentTableBody = document.getElementById('payment-table-body');
const casheaTableBody = document.getElementById('cashea-table-body');
const searchInput = document.getElementById('search-input');
const filterStatusSelect = document.getElementById('filter-status');
const exportExcelBtn = document.getElementById('export-excel-btn');
const exportCasheaExcelBtn = document.getElementById('export-cashea-excel-btn');
const statsDatePicker = document.getElementById('stats-date-picker');
const resetDateBtn = document.getElementById('reset-date-btn');

const kpiTotalAmount = document.getElementById('kpi-total-amount');
const kpiCasheaCollected = document.getElementById('kpi-cashea-collected');
const kpiCasheaPending = document.getElementById('kpi-cashea-pending');
const kpiTotalTx = document.getElementById('kpi-total-tx');
const kpiTopFreqClient = document.getElementById('kpi-top-freq-client');
const kpiTopSpentClient = document.getElementById('kpi-top-spent-client');

const svgDonut = document.getElementById('svg-donut');
const chartLegend = document.getElementById('chart-legend');
const barChartContainer = document.getElementById('bar-chart-container');

// INICIALIZACIÓN: DETECTAR SI LA PÁGINA SE ABRIÓ DESDE EL TELÉFONO VÍA ESCANEO QR
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('room');

    if (roomId) {
        if (landingContainer) landingContainer.classList.add('hidden');
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.add('hidden');

        const mobileView = document.getElementById('mobile-upload-view');
        if (mobileView) mobileView.classList.remove('hidden');

        setupMobileUploader(roomId);
    }
});

// CONTROL DE NAVEGACIÓN Y SIDEBAR
function openSidebar() { 
    if (appSidebar && sidebarOverlay) {
        appSidebar.classList.add('open'); 
        sidebarOverlay.classList.remove('hidden'); 
    }
}

function closeSidebar() { 
    if (appSidebar && sidebarOverlay) {
        appSidebar.classList.remove('open'); 
        sidebarOverlay.classList.add('hidden'); 
    }
}

if (mobileMenuToggle) mobileMenuToggle.addEventListener('click', openSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);

function switchTab(activeBtn, activeView) {
    [tabHistoryBtn, tabCasheaBtn, tabSummaryBtn].forEach(btn => btn && btn.classList.remove('active'));
    [viewHistory, viewCashea, viewSummary].forEach(view => view && view.classList.add('hidden'));

    if (activeBtn) activeBtn.classList.add('active');
    if (activeView) activeView.classList.remove('hidden');

    if (activeView === viewHistory) renderTable();
    if (activeView === viewCashea) renderCasheaTable();
    if (activeView === viewSummary) renderMetrics();
    closeSidebar();
}

if (tabHistoryBtn) tabHistoryBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab(tabHistoryBtn, viewHistory); });
if (tabCasheaBtn) tabCasheaBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab(tabCasheaBtn, viewCashea); });
if (tabSummaryBtn) tabSummaryBtn.addEventListener('click', (e) => { e.preventDefault(); switchTab(tabSummaryBtn, viewSummary); });

// AUTHENTICATION & LOGIN / REGISTRO CORREGIDO
function goToAuth(showRegister = false) {
    if (landingContainer && authContainer) {
        landingContainer.classList.add('hidden');
        authContainer.classList.remove('hidden');
        if (showRegister) {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        } else {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        }
    }
}

if (navLoginBtn) navLoginBtn.addEventListener('click', () => goToAuth(false));
if (navRegisterBtn) navRegisterBtn.addEventListener('click', () => goToAuth(true));
if (heroGetStarted) heroGetStarted.addEventListener('click', () => goToAuth(true));
if (backToLanding) backToLanding.addEventListener('click', () => { 
    authContainer.classList.add('hidden'); 
    landingContainer.classList.remove('hidden'); 
});

if (showRegisterLink) showRegisterLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    loginForm.classList.add('hidden'); 
    registerForm.classList.remove('hidden'); 
});

if (showLoginLink) showLoginLink.addEventListener('click', (e) => { 
    e.preventDefault(); 
    registerForm.classList.add('hidden'); 
    loginForm.classList.remove('hidden'); 
});

// FORMULARIO DE INICIO DE SESIÓN
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = document.getElementById('login-user').value.trim();
        const passInput = document.getElementById('login-pass').value.trim();

        const currentUsers = JSON.parse(localStorage.getItem('app_users')) || users;
        const foundUser = currentUsers.find(u => u.user.toLowerCase() === userInput.toLowerCase() && u.pass === passInput);

        if (foundUser) {
            currentUser = foundUser;
            landingContainer.classList.add('hidden');
            authContainer.classList.add('hidden');
            appContainer.classList.remove('hidden');
            if (floatingActionsBar) floatingActionsBar.classList.remove('hidden');

            const displaySpan = document.getElementById('user-display');
            if (displaySpan) displaySpan.textContent = currentUser.user;

            showToast(`Bienvenido, ${currentUser.user}`, 'success');
            setupDashboard();
        } else {
            showToast('Usuario o contraseña incorrectos', 'error');
        }
    });
}

// FORMULARIO DE REGISTRO
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const regUser = document.getElementById('reg-user').value.trim();
        const regPass = document.getElementById('reg-pass').value.trim();

        if (!regUser || !regPass) {
            showToast('Por favor completa todos los campos', 'error');
            return;
        }

        let currentUsers = JSON.parse(localStorage.getItem('app_users')) || users;
        const exists = currentUsers.some(u => u.user.toLowerCase() === regUser.toLowerCase());

        if (exists) {
            showToast('El nombre de usuario ya existe', 'error');
            return;
        }

        const newUser = { user: regUser, pass: regPass, role: 'admin' };
        currentUsers.push(newUser);
        users = currentUsers;
        localStorage.setItem('app_users', JSON.stringify(currentUsers));

        showToast('Cuenta creada con éxito. ¡Inicia sesión!', 'success');
        registerForm.reset();
        
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        document.getElementById('login-user').value = regUser;
    });
}

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        appContainer.classList.add('hidden');
        if (floatingActionsBar) floatingActionsBar.classList.add('hidden');
        landingContainer.classList.remove('hidden');
        showToast('Sesión cerrada correctamente', 'success');
    });
}

// MODAL DE CONFIRMACIÓN PERSONALIZADO (ACEPTAR / RECHAZAR)
function showConfirmModal(message, callback) {
    if (confirmMessage && confirmModal) {
        confirmMessage.textContent = message;
        pendingDeleteCallback = callback;
        confirmModal.classList.remove('hidden');
    }
}

if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', () => {
        if (confirmModal) confirmModal.classList.add('hidden');
        pendingDeleteCallback = null;
    });
}

if (confirmAcceptBtn) {
    confirmAcceptBtn.addEventListener('click', () => {
        if (pendingDeleteCallback) {
            pendingDeleteCallback();
        }
        if (confirmModal) confirmModal.classList.add('hidden');
        pendingDeleteCallback = null;
    });
}

// MODALES PAGOS REGULARES
if (openPaymentModalBtn) openPaymentModalBtn.addEventListener('click', () => paymentModal && paymentModal.classList.remove('hidden'));
if (closeModalBtn) closeModalBtn.addEventListener('click', () => paymentModal && paymentModal.classList.add('hidden'));

if (closeEditModalBtn) closeEditModalBtn.addEventListener('click', () => editPaymentModal && editPaymentModal.classList.add('hidden'));
if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editPaymentModal && editPaymentModal.classList.add('hidden'));
if (closeViewerBtn) closeViewerBtn.addEventListener('click', () => imageViewerModal && imageViewerModal.classList.add('hidden'));

const paymentForm = document.getElementById('payment-form');
if (paymentForm) {
    paymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const targetUser = document.getElementById('modal-client-input').value.trim();
        const dni = document.getElementById('modal-client-dni').value.trim();
        const phone = document.getElementById('modal-client-phone').value.trim();
        
        const row = document.querySelector('.payment-row');
        const method = row.querySelector('.pay-method').value;
        const status = row.querySelector('.pay-status').value;
        const amount = parseFloat(row.querySelector('.pay-amount').value);
        const ref = row.querySelector('.pay-ref').value;
        const imgElement = row.querySelector('.img-preview');
        const imageData = imgElement ? imgElement.src : '';

        const now = new Date();
        const formattedDateTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

        payments.push({
            id: Date.now() + Math.random(),
            user: targetUser,
            dni, phone, method, amount, ref, status,
            datetime: formattedDateTime,
            image: imageData
        });

        localStorage.setItem('app_payments', JSON.stringify(payments));
        paymentModal.classList.add('hidden');
        showToast('Pago registrado correctamente', 'success');
        setupDashboard();
    });
}

// CONEXIÓN P2P EN VIVO: GENERACIÓN DE CÓDIGO QR EN LA COMPUTADORA
window.generatePhoneQr = function() {
    const qrContainer = document.getElementById('qr-box-container');
    const qrDisplay = document.getElementById('qrcode-display');
    const qrStatus = document.getElementById('qr-status-text');

    if (!qrContainer || !qrDisplay) return;

    if (!qrContainer.classList.contains('hidden')) {
        qrContainer.classList.add('hidden');
        if (peer) peer.destroy();
        return;
    }

    qrDisplay.innerHTML = '';
    currentRoomId = 'paytrack-' + Math.random().toString(36).substring(2, 9);
    qrContainer.classList.remove('hidden');
    qrStatus.textContent = 'Iniciando sala y esperando teléfono...';

    peer = new Peer(currentRoomId);

    peer.on('open', (id) => {
        const mobileUrl = `${window.location.origin}${window.location.pathname}?room=${id}`;
        new QRCode(qrDisplay, {
            text: mobileUrl,
            width: 140,
            height: 140
        });
        qrStatus.textContent = '🟢 QR listo. Escanéalo con tu teléfono.';
    });

    peer.on('connection', (conn) => {
        qrStatus.textContent = '📲 ¡Teléfono conectado! Esperando envío de foto...';

        conn.on('data', (imageData) => {
            const previewBox = document.querySelector('.img-preview-box');
            const imgElement = previewBox.querySelector('.img-preview');

            imgElement.src = imageData;
            previewBox.classList.remove('hidden');
            qrContainer.classList.add('hidden');

            showToast('📷 ¡Comprobante recibido desde el teléfono!', 'success');
            peer.destroy();
        });
    });
};

// LÓGICA QUE EJECUTA EL TELÉFONO DESPUÉS DE ESCANEAR EL QR
function setupMobileUploader(targetRoomId) {
    const fileInput = document.getElementById('mobile-file-input');
    const previewBox = document.getElementById('mobile-preview-box');
    const previewImg = document.getElementById('mobile-preview-img');
    const sendBtn = document.getElementById('mobile-send-btn');

    let base64Image = '';

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
                base64Image = evt.target.result;
                previewImg.src = base64Image;
                previewBox.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        }
    });

    sendBtn.addEventListener('click', () => {
        sendBtn.disabled = true;
        sendBtn.textContent = 'Enviando foto a la PC...';

        const mobilePeer = new Peer();
        mobilePeer.on('open', () => {
            const conn = mobilePeer.connect(targetRoomId);
            conn.on('open', () => {
                conn.send(base64Image);
                alert('✅ ¡Foto transmitida con éxito a la computadora!');
                setTimeout(() => { window.close(); }, 1000);
            });
        });
    });
}

// PREVISUALIZACIÓN DE IMÁGENES LOCALES
window.previewImage = function(input) {
    const previewBox = input.parentElement.querySelector('.img-preview-box');
    const imgElement = previewBox.querySelector('.img-preview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imgElement.src = e.target.result;
            previewBox.classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
};

window.removeImage = function(btn) {
    const previewBox = btn.parentElement;
    const input = previewBox.parentElement.querySelector('.pay-image-input');
    input.value = '';
    previewBox.querySelector('.img-preview').src = '';
    previewBox.classList.add('hidden');
};

// MÓDULO CASHEA
if (openCasheaModalBtn) openCasheaModalBtn.addEventListener('click', () => casheaModal && casheaModal.classList.remove('hidden'));
if (closeCasheaModalBtn) closeCasheaModalBtn.addEventListener('click', () => casheaModal && casheaModal.classList.add('hidden'));
if (cancelCasheaBtn) cancelCasheaBtn.addEventListener('click', () => casheaModal && casheaModal.classList.add('hidden'));

if (closeAbonoModalBtn) closeAbonoModalBtn.addEventListener('click', () => casheaAbonoModal && casheaAbonoModal.classList.add('hidden'));
if (cancelAbonoBtn) cancelAbonoBtn.addEventListener('click', () => casheaAbonoModal && casheaAbonoModal.classList.add('hidden'));

// MODAL LISTA DE DEUDORES
if (openUnpaidModalBtn) {
    openUnpaidModalBtn.addEventListener('click', () => {
        renderUnpaidList();
        if (unpaidModal) unpaidModal.classList.remove('hidden');
    });
}
if (closeUnpaidModalBtn) closeUnpaidModalBtn.addEventListener('click', () => unpaidModal && unpaidModal.classList.add('hidden'));
if (closeUnpaidModalFooterBtn) closeUnpaidModalFooterBtn.addEventListener('click', () => unpaidModal && unpaidModal.classList.add('hidden'));

if (casheaForm) {
    casheaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('cashea-client').value.trim();
        const dni = document.getElementById('cashea-dni').value.trim();
        const phone = document.getElementById('cashea-phone').value.trim();
        const totalAmount = parseFloat(document.getElementById('cashea-total-amount').value);
        const discountPercent = parseFloat(document.getElementById('cashea-discount-percent').value) || 0;
        const downPaymentPercent = parseFloat(document.getElementById('cashea-down-payment-percent').value);
        const totalInstallments = parseInt(document.getElementById('cashea-total-installments').value);
        const nextDate = document.getElementById('cashea-next-date').value;

        const discountAmount = totalAmount * (discountPercent / 100.0);
        const finalPrice = totalAmount - discountAmount;
        const initialPaidAmount = finalPrice * (downPaymentPercent / 100.0);
        const remaining = finalPrice - initialPaidAmount;

        casheaRecords.push({
            id: Date.now() + Math.random(),
            user, dni, phone,
            totalAmount,
            discountPercent,
            downPaymentPercent,
            paidAmount: initialPaidAmount,
            totalInstallments,
            paidInstallments: 0,
            nextDate,
            status: remaining <= 0 ? 'Pagado' : 'En Proceso'
        });

        localStorage.setItem('app_cashea_records', JSON.stringify(casheaRecords));
        casheaModal.classList.add('hidden');
        casheaForm.reset();
        showToast('Registro de Cashea creado con éxito', 'success');
        renderCasheaTable();
        renderMetrics();
    });
}

function renderCasheaTable() {
    if (!casheaTableBody) return;
    casheaTableBody.innerHTML = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    let todayAlerts = [];

    casheaRecords.forEach(c => {
        const discountAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
        const finalPrice = c.totalAmount - discountAmount;
        const remaining = finalPrice - c.paidAmount;

        if (c.nextDate === todayStr && remaining > 0) {
            const initialDownInCash = finalPrice * ((c.downPaymentPercent || 0) / 100.0);
            const installmentPrice = (finalPrice - initialDownInCash) / (c.totalInstallments || 3);
            todayAlerts.push(`<strong>${c.user}</strong> debe abonar hoy $${installmentPrice.toFixed(2)} (Cuota ${c.paidInstallments + 1}/${c.totalInstallments})`);
        }

        const tr = document.createElement('tr');
        let statusClass = c.status === 'Pagado' ? 'status-pagado' : 'status-proceso';

        tr.innerHTML = `
            <td><strong>${c.user}</strong></td>
            <td>${c.dni}<br><small style="color:var(--charcoal-slate);">${c.phone}</small></td>
            <td>$${c.totalAmount.toFixed(2)}</td>
            <td>${c.discountPercent > 0 ? `<span style="color:red; font-weight:bold;">-${c.discountPercent}%</span>` : '0%'}</td>
            <td><strong style="color:var(--status-pagado);">$${finalPrice.toFixed(2)}</strong></td>
            <td>${c.downPaymentPercent || 0}%</td>
            <td><strong style="color:var(--status-pagado);">$${c.paidAmount.toFixed(2)}</strong></td>
            <td><strong style="color:var(--status-no-registrado);">$${Math.max(0, remaining).toFixed(2)}</strong></td>
            <td>${c.paidInstallments} / ${c.totalInstallments}</td>
            <td>${c.nextDate || 'N/A'}</td>
            <td><span class="badge ${statusClass}">${c.status}</span></td>
            <td>
                <div class="action-buttons-group">
                    ${remaining > 0 ? `<button class="btn-icon-action btn-icon-edit-cashea" onclick="openAbonoModal(${c.id})" title="Abonar Cuota Cashea">➕</button>` : ''}
                    <button class="btn-icon-action btn-icon-delete" onclick="deleteCasheaRecord(${c.id})" title="Borrar">✕</button>
                </div>
            </td>
        `;

        casheaTableBody.appendChild(tr);
    });

    const alertText = document.getElementById('cashea-today-text');
    if (alertText) {
        if (todayAlerts.length > 0) {
            alertText.innerHTML = todayAlerts.join('<br>');
        } else {
            alertText.textContent = 'No hay cuotas ni compromisos de Cashea programados para cobrar el día de hoy.';
        }
    }
}

// EXPORTACIÓN EXCLUSIVA DE CASHEA A EXCEL (.CSV)
if (exportCasheaExcelBtn) {
    exportCasheaExcelBtn.addEventListener('click', () => {
        if (casheaRecords.length === 0) {
            showToast('No hay registros de Cashea para exportar', 'error');
            return;
        }

        let csvContent = '\uFEFF';
        csvContent += 'Cliente;Cédula;Teléfono;Precio Base ($);Descuento (%);Precio Final ($);Inicial (%);Monto Abonado ($);Restante por Cobrar ($);Cuotas Pagadas;Total Cuotas;Próx. Cobro;Estado\n';

        casheaRecords.forEach(c => {
            const discAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
            const finalPrice = c.totalAmount - discAmount;
            const remaining = Math.max(0, finalPrice - c.paidAmount);

            csvContent += `"${c.user}";"${c.dni}";"${c.phone}";"${c.totalAmount.toFixed(2)}";"${(c.discountPercent||0).toFixed(2)}";"${finalPrice.toFixed(2)}";"${(c.downPaymentPercent||0).toFixed(2)}";"${c.paidAmount.toFixed(2)}";"${remaining.toFixed(2)}";"${c.paidInstallments}";"${c.totalInstallments}";"${c.nextDate || ''}";"${c.status}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `PayTrack_Cashea_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Reporte de Cashea exportado a Excel correctamente', 'success');
    });
}

// RENDERIZAR TABLA DE DEUDORES DENTRO DEL MODAL
function renderUnpaidList() {
    if (!unpaidTableBody) return;
    unpaidTableBody.innerHTML = '';
    const todayStr = new Date().toISOString().slice(0, 10);
    const unpaidList = casheaRecords.filter(c => {
        const discountAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
        const finalPrice = c.totalAmount - discountAmount;
        return (finalPrice - c.paidAmount) > 0;
    });

    if (unpaidList.length === 0) {
        unpaidTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--charcoal-slate);">🎉 ¡Excelente! No hay clientes con deudas pendientes en Cashea.</td></tr>';
        return;
    }

    unpaidList.forEach(c => {
        const discountAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
        const finalPrice = c.totalAmount - discountAmount;
        const remaining = finalPrice - c.paidAmount;

        const tr = document.createElement('tr');
        const isOverdue = c.nextDate <= todayStr;
        const statusBadge = isOverdue ? 
            `<span class="badge status-no-registrado">⚠️ Vencido / Cobrar Hoy</span>` : 
            `<span class="badge status-proceso">Pendiente</span>`;

        tr.innerHTML = `
            <td><strong>${c.user}</strong></td>
            <td>${c.dni}<br><small style="color:var(--charcoal-slate);">${c.phone}</small></td>
            <td>${c.discountPercent > 0 ? `<span style="color:red; font-weight:bold;">-${c.discountPercent}%</span>` : '0%'}</td>
            <td><strong style="color:var(--status-no-registrado);">$${remaining.toFixed(2)}</strong></td>
            <td><strong>${c.nextDate || 'N/A'}</strong></td>
            <td>${statusBadge}</td>
        `;
        unpaidTableBody.appendChild(tr);
    });
}

window.openAbonoModal = function(id) {
    const c = casheaRecords.find(item => item.id === id);
    if (!c) return;

    const discountAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
    const finalPrice = c.totalAmount - discountAmount;
    const initialDownInCash = finalPrice * ((c.downPaymentPercent || 0) / 100.0);
    const remainingInstallments = c.totalInstallments - c.paidInstallments;
    const suggestedAmount = remainingInstallments > 0 ? (finalPrice - initialDownInCash) / c.totalInstallments : 0;

    document.getElementById('abono-cashea-id').value = c.id;
    document.getElementById('abono-client-name').value = c.user;
    document.getElementById('abono-amount').value = suggestedAmount.toFixed(2);
    document.getElementById('abono-next-date').value = '';

    if (casheaAbonoModal) casheaAbonoModal.classList.remove('hidden');
};

if (casheaAbonoForm) {
    casheaAbonoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseFloat(document.getElementById('abono-cashea-id').value);
        const amount = parseFloat(document.getElementById('abono-amount').value);
        const nextDate = document.getElementById('abono-next-date').value;

        const c = casheaRecords.find(item => item.id === id);
        if (c) {
            c.paidAmount += amount;
            c.paidInstallments += 1;
            c.nextDate = nextDate;

            const discountAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
            const finalPrice = c.totalAmount - discountAmount;
            if (c.paidAmount >= finalPrice) {
                c.status = 'Pagado';
            }

            localStorage.setItem('app_cashea_records', JSON.stringify(casheaRecords));
            casheaAbonoModal.classList.add('hidden');
            showToast('Abono procesado con éxito', 'success');
            renderCasheaTable();
            renderMetrics();
        }
    });
}

window.deleteCasheaRecord = function(id) {
    showConfirmModal('¿Deseas eliminar permanentemente este registro de Cashea?', () => {
        casheaRecords = casheaRecords.filter(c => c.id !== id);
        localStorage.setItem('app_cashea_records', JSON.stringify(casheaRecords));
        showToast('Registro de Cashea eliminado', 'success');
        renderCasheaTable();
        renderMetrics();
    });
};

// DASHBOARD PAGOS REGULARES Y MÉTRICAS
function setupDashboard() {
    renderTable();
    renderCasheaTable();
    renderMetrics();
}

// BÚSQUEDAS Y FILTROS
if (searchInput) searchInput.addEventListener('input', renderTable);
if (filterStatusSelect) filterStatusSelect.addEventListener('change', renderTable);
if (statsDatePicker) statsDatePicker.addEventListener('change', renderMetrics);
if (resetDateBtn) {
    resetDateBtn.addEventListener('click', () => {
        statsDatePicker.value = '';
        renderMetrics();
    });
}

function renderTable() {
    if (!paymentTableBody) return;
    paymentTableBody.innerHTML = '';
    let visible = [...payments];

    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
    if (term) {
        visible = visible.filter(p => 
            p.user.toLowerCase().includes(term) ||
            (p.dni && p.dni.toLowerCase().includes(term)) ||
            (p.phone && p.phone.toLowerCase().includes(term)) ||
            p.method.toLowerCase().includes(term) ||
            p.ref.toLowerCase().includes(term) ||
            (p.datetime && p.datetime.includes(term))
        );
    }

    const selectedFilter = filterStatusSelect ? filterStatusSelect.value : 'TODOS';
    if (selectedFilter !== 'TODOS') {
        visible = visible.filter(p => p.status === selectedFilter);
    }

    visible.forEach(p => {
        const tr = document.createElement('tr');

        let statusClass = 'status-proceso';
        if (p.status === 'Pagado') statusClass = 'status-pagado';
        if (p.status === 'No Registrado') statusClass = 'status-no-registrado';

        const imageContent = p.image ? 
            `<img src="${p.image}" class="thumb-img" onclick="viewImage('${p.image}')" alt="Comprobante">` : 
            `<span class="no-img-text">Sin foto</span>`;

        tr.innerHTML = `
            <td class="date-cell">${p.datetime || 'N/A'}</td>
            <td><strong>${p.user}</strong></td>
            <td>${p.dni || 'N/A'}</td>
            <td>${p.phone || 'N/A'}</td>
            <td>${imageContent}</td>
            <td>${p.method}</td>
            <td>$${p.amount.toFixed(2)}</td>
            <td>${p.ref}</td>
            <td><span class="badge ${statusClass}">${p.status}</span></td>
            <td>
                <div class="action-buttons-group">
                    <button class="btn-icon-action btn-icon-edit" onclick="openEditModal(${p.id})" title="Editar">✏️</button>
                    <button class="btn-icon-action btn-icon-delete" onclick="deletePayment(${p.id})" title="Borrar">✕</button>
                </div>
            </td>
        `;

        paymentTableBody.appendChild(tr);
    });
}

// ABRIR Y GUARDAR EDICIÓN DE PAGO REGULAR
window.openEditModal = function(id) {
    const p = payments.find(item => item.id === id);
    if (!p) return;

    editPaymentId.value = p.id;
    editClientInput.value = p.user;
    editClientDni.value = p.dni || '';
    editClientPhone.value = p.phone || '';
    editPayMethod.value = p.method;
    editPayStatus.value = p.status;
    editPayAmount.value = p.amount;
    editPayRef.value = p.ref;

    if (editPaymentModal) editPaymentModal.classList.remove('hidden');
};

if (editPaymentForm) {
    editPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = parseFloat(editPaymentId.value);
        const payment = payments.find(p => p.id === id);

        if (payment) {
            payment.user = editClientInput.value.trim();
            payment.dni = editClientDni.value.trim();
            payment.phone = editClientPhone.value.trim();
            payment.method = editPayMethod.value;
            payment.status = editPayStatus.value;
            payment.amount = parseFloat(editPayAmount.value);
            payment.ref = editPayRef.value.trim();

            localStorage.setItem('app_payments', JSON.stringify(payments));
            editPaymentModal.classList.add('hidden');
            showToast('Pago actualizado con éxito', 'success');
            setupDashboard();
        }
    });
}

// ABRIR COMPROBANTE COMPLETO
window.viewImage = function(src) {
    if (viewerFullImage && imageViewerModal) {
        viewerFullImage.src = src;
        imageViewerModal.classList.remove('hidden');
    }
};

// EXPORTACIÓN A EXCEL (.CSV) DE PAGOS REGULARES
if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
        if (payments.length === 0) {
            showToast('No hay datos para exportar', 'error');
            return;
        }

        let csvContent = '\uFEFF';
        csvContent += 'Fecha y Hora;Cliente;Cédula;Teléfono;Método;Monto ($);Referencia;Estado\n';

        payments.forEach(p => {
            csvContent += `"${p.datetime || ''}";"${p.user}";"${p.dni || ''}";"${p.phone || ''}";"${p.method}";"${p.amount.toFixed(2)}";"${p.ref}";"${p.status}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `PayTrack_Pagos_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Reporte exportado correctamente', 'success');
    });
}

window.deletePayment = function(id) {
    showConfirmModal('¿Deseas eliminar este registro de pago regular?', () => {
        payments = payments.filter(p => p.id !== id);
        localStorage.setItem('app_payments', JSON.stringify(payments));
        showToast('Registro eliminado', 'success');
        setupDashboard();
    });
};

// MÉTRICAS Y ANALÍTICAS COMPLETAS (INCLUYENDO CASHEA)
function renderMetrics() {
    const selectedDate = statsDatePicker ? statsDatePicker.value : '';
    const counts = { 'Pago Móvil': 0, 'Punto de Venta': 0, 'Efectivo': 0, 'Cashea 💛': 0 };
    const clientTxCounts = {};
    const clientSpentTotals = {};

    let totalRegularPaid = 0;
    let casheaCollectedTotal = 0;
    let casheaPendingTotal = 0;
    let txCount = 0;

    payments.forEach(p => {
        if (!selectedDate || (p.datetime && p.datetime.startsWith(selectedDate))) {
            if (counts[p.method] !== undefined) {
                if (p.status === 'Pagado') {
                    counts[p.method] += p.amount;
                    totalRegularPaid += p.amount;
                }
                txCount++;
                clientTxCounts[p.user] = (clientTxCounts[p.user] || 0) + 1;
                clientSpentTotals[p.user] = (clientSpentTotals[p.user] || 0) + p.amount;
            }
        }
    });

    casheaRecords.forEach(c => {
        const discAmount = c.totalAmount * ((c.discountPercent || 0) / 100.0);
        const finalPrice = c.totalAmount - discAmount;
        const remaining = finalPrice - c.paidAmount;

        counts['Cashea 💛'] += c.paidAmount;
        casheaCollectedTotal += c.paidAmount;
        casheaPendingTotal += Math.max(0, remaining);
        txCount++;

        clientTxCounts[c.user] = (clientTxCounts[c.user] || 0) + 1;
        clientSpentTotals[c.user] = (clientSpentTotals[c.user] || 0) + c.paidAmount;
    });

    const totalRealInHand = totalRegularPaid + casheaCollectedTotal;

    let topFreqClientName = 'Ninguno';
    let maxTx = 0;
    for (const [client, numTx] of Object.entries(clientTxCounts)) {
        if (numTx > maxTx) {
            maxTx = numTx;
            topFreqClientName = `${client} (${numTx} compras)`;
        }
    }

    let topSpentClientName = 'Ninguno';
    let maxSpent = 0;
    for (const [client, spent] of Object.entries(clientSpentTotals)) {
        if (spent > maxSpent) {
            maxSpent = spent;
            topSpentClientName = `${client} ($${spent.toFixed(2)})`;
        }
    }

    if (kpiTotalAmount) kpiTotalAmount.textContent = `$${totalRealInHand.toFixed(2)}`;
    if (kpiCasheaCollected) kpiCasheaCollected.textContent = `$${casheaCollectedTotal.toFixed(2)}`;
    if (kpiCasheaPending) kpiCasheaPending.textContent = `$${casheaPendingTotal.toFixed(2)}`;
    if (kpiTotalTx) kpiTotalTx.textContent = txCount;
    if (kpiTopFreqClient) kpiTopFreqClient.textContent = topFreqClientName;
    if (kpiTopSpentClient) kpiTopSpentClient.textContent = topSpentClientName;

    if (svgDonut) {
        const existingSegments = svgDonut.querySelectorAll('.donut-segment');
        existingSegments.forEach(s => s.remove());
    }
    if (chartLegend) chartLegend.innerHTML = '';
    if (barChartContainer) barChartContainer.innerHTML = '';

    if (totalRealInHand === 0) {
        if (chartLegend) chartLegend.innerHTML = '<p style="color:var(--charcoal-slate); font-style:italic;">No hay cobros o ingresos registrados para la fecha elegida.</p>';
        return;
    }

    let offset = 0;
    Object.keys(counts).forEach(method => {
        const amount = counts[method];
        const percent = (amount / totalRealInHand) * 100;

        if (percent > 0 && svgDonut) {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'donut-segment');
            circle.setAttribute('cx', '21'); circle.setAttribute('cy', '21');
            circle.setAttribute('r', '15.91549430918954');
            circle.setAttribute('fill', 'transparent');
            circle.setAttribute('stroke', methodColors[method]);
            circle.setAttribute('stroke-width', '5');
            circle.setAttribute('stroke-dasharray', `${percent} ${100 - percent}`);
            circle.setAttribute('stroke-dashoffset', `${100 - offset}`);

            svgDonut.appendChild(circle);
            offset += percent;
        }

        if (chartLegend) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `
                <span class="legend-color" style="background-color: ${methodColors[method]}"></span>
                <strong>${method}:</strong> $${amount.toFixed(2)} (${percent.toFixed(1)}%)
            `;
            chartLegend.appendChild(item);
        }

        if (barChartContainer) {
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.innerHTML = `
                <div class="bar-info">
                    <span>${method}</span>
                    <span>$${amount.toFixed(2)}</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${percent}%; background-color: ${methodColors[method]}"></div>
                </div>
            `;
            barChartContainer.appendChild(barItem);
        }
    });
}