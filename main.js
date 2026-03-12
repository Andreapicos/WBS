// State Management
const state = {
    savings: parseFloat(localStorage.getItem('wbs_savings')) || 0,
    co2: parseFloat(localStorage.getItem('wbs_co2')) || 0,
    foodCount: parseInt(localStorage.getItem('wbs_foodCount')) || 0,
    inventory: JSON.parse(localStorage.getItem('wbs_inventory')) || [],
    userName: localStorage.getItem('wbs_userName') || "Utente",
    geminiKey: localStorage.getItem('wbs_geminiKey') || "",
    dietPrefs: JSON.parse(localStorage.getItem('wbs_dietPrefs')) || { vegetariano: false, vegano: false, glutenFree: false },
    sortOrder: localStorage.getItem('wbs_sortOrder') || 'expiry', // 'expiry' or 'price'
    weeklyConsumed: JSON.parse(localStorage.getItem('wbs_weeklyConsumed')) || [],
    completedRecipes: JSON.parse(localStorage.getItem('wbs_completedRecipes')) || [],
    totalCompleted: parseInt(localStorage.getItem('wbs_totalCompleted')) || 0
};

// Open Food Facts API
async function getProductData(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        const data = await response.json();
        if (data.status === 1) {
            return {
                name: data.product.product_name || "Prodotto Sconosciuto",
                price: Math.random() * (5 - 1) + 1,
                co2: (Math.random() * 0.5).toFixed(2),
                expiry: Math.floor(Math.random() * 5) + 1,
                icon: data.product.image_front_thumb_url ? "🖼️" : "📦",
                img: data.product.image_front_thumb_url
            };
        }
    } catch (e) {
        console.error("API Error", e);
    }
    return null;
}

// Category detection
function getCategoryIcon(name) {
    const n = name.toLowerCase();
    if (/(latte|formaggio|burro|yogurt|panna|ricotta|mozzarella)/.test(n)) return "🥛";
    if (/(pollo|manzo|maiale|carne|salame|prosciutto|salsiccia|tacchino)/.test(n)) return "🥩";
    if (/(pesce|tonno|salmone|merluzzo|gamberett|calamari)/.test(n)) return "🐟";
    if (/(pane|pasta|riso|farina|cereali|biscotti|crackers)/.test(n)) return "🌾";
    if (/(mela|pera|banana|arancia|fragola|uva|frutta)/.test(n)) return "🍎";
    if (/(zucchina|carota|pomodoro|insalata|spinaci|verdura|broccoli|peperone|cipolla|aglio)/.test(n)) return "🥦";
    if (/(uovo|uova)/.test(n)) return "🥚";
    if (/(nutella|cioccolato|dolce|torta|gelato|miele|marmellata)/.test(n)) return "🍫";
    if (/(succo|acqua|birra|vino|cola|bibita)/.test(n)) return "🥤";
    if (/(olio|aceto|salsa|ketchup|maionese)/.test(n)) return "🫙";
    return "✏️";
}

// DOM Elements
const scanBtn = document.getElementById('scan-btn');
const resetBtn = document.getElementById('reset-btn');
const scanOverlay = document.getElementById('scan-overlay');
const closeScan = document.getElementById('close-scan');
const expiryList = document.getElementById('expiry-list');
const totalSavingsEl = document.getElementById('total-savings');
const savingsDeltaEl = document.getElementById('savings-delta');
const co2El = document.getElementById('co2-saved');
const foodEl = document.getElementById('food-saved');
const recipeEl = document.getElementById('recipe-suggestion');

const choiceModal = document.getElementById('choice-modal');
const choiceScanBtn = document.getElementById('choice-scan');
const choiceManualBtn = document.getElementById('choice-manual');
const cancelChoiceBtn = document.getElementById('cancel-choice');

const resetModal = document.getElementById('reset-modal');
const confirmResetBtn = document.getElementById('confirm-reset');
const cancelResetBtn = document.getElementById('cancel-reset');

const manualModal = document.getElementById('manual-modal');
const manualNameInput = document.getElementById('manual-name');
const manualPriceInput = document.getElementById('manual-price');
const manualExpiryInput = document.getElementById('manual-expiry');
const saveManualBtn = document.getElementById('save-manual');
const cancelManualBtn = document.getElementById('cancel-manual');

const profileBtn = document.getElementById('profile-btn');
const profileModal = document.getElementById('profile-modal');
const userNameInput = document.getElementById('user-name-input');
const geminiKeyInput = document.getElementById('gemini-key-input');
const saveProfileBtn = document.getElementById('save-profile');
const cancelProfileBtn = document.getElementById('cancel-profile');
const userGreetingEl = document.getElementById('user-greeting');

// Edit product modal elements
const editModal = document.getElementById('edit-modal');
const editNameInput = document.getElementById('edit-name');
const editPriceInput = document.getElementById('edit-price');
const editExpiryInput = document.getElementById('edit-expiry');
const saveEditBtn = document.getElementById('save-edit');
const cancelEditBtn = document.getElementById('cancel-edit');

// Recipe steps modal
const stepsModal = document.getElementById('steps-modal');
const stepsTitleEl = document.getElementById('steps-title');
const stepsContentEl = document.getElementById('steps-content');
const closeStepsBtn = document.getElementById('close-steps');

let lastScannedBarcode = "";
let editingIndex = -1;
let lastRecipes = [];

// Initialize
function init() {
    updateUI();
    setupSortButtons();
    setupDietCheckboxes();
}

function saveState() {
    localStorage.setItem('wbs_savings', state.savings);
    localStorage.setItem('wbs_co2', state.co2);
    localStorage.setItem('wbs_foodCount', state.foodCount);
    localStorage.setItem('wbs_inventory', JSON.stringify(state.inventory));
    localStorage.setItem('wbs_userName', state.userName);
    localStorage.setItem('wbs_geminiKey', state.geminiKey);
    localStorage.setItem('wbs_dietPrefs', JSON.stringify(state.dietPrefs));
    localStorage.setItem('wbs_sortOrder', state.sortOrder);
    localStorage.setItem('wbs_weeklyConsumed', JSON.stringify(state.weeklyConsumed));
    localStorage.setItem('wbs_completedRecipes', JSON.stringify(state.completedRecipes));
    localStorage.setItem('wbs_totalCompleted', state.totalCompleted);
}

// UI Updaters
function updateUI() {
    totalSavingsEl.textContent = `€${state.savings.toFixed(2)}`;
    savingsDeltaEl.textContent = `+€${(state.inventory.reduce((acc, item) => acc + item.price, 0)).toFixed(2)}`;
    co2El.textContent = `${parseFloat(state.co2).toFixed(1)} kg`;
    foodEl.textContent = `${state.foodCount} prodotti`;
    const completedEl = document.getElementById('completed-recipes');
    if (completedEl) completedEl.textContent = `${state.totalCompleted} ricette`;
    userGreetingEl.textContent = `Ciao ${state.userName}, ecco la tua Dashboard`;

    updateWeeklyChart();
    renderInventory();
    checkRecipes();
    saveState();
}

// --- WEEKLY CHART ---
function updateWeeklyChart() {
    const chartEl = document.getElementById('weekly-chart');
    if (!chartEl) return;

    const now = new Date();
    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const dayLabel = days[d.getDay()];

        const consumedToday = state.weeklyConsumed.filter(e => e.date === key);
        const count = consumedToday.length;
        const dailySavings = consumedToday.reduce((sum, item) => sum + (item.savings || 0), 0);

        last7.push({ label: dayLabel, count, dailySavings, isToday: i === 0 });
    }

    const maxCount = Math.max(...last7.map(d => d.count), 1);
    chartEl.innerHTML = last7.map(d => `
        <div class="chart-bar-container" style="display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; position: relative;">
            <div style="flex: 1; display: flex; align-items: flex-end; width: 100%;">
                <div class="chart-bar hoverable-bar" data-tooltip="${d.count} prod. | €${d.dailySavings.toFixed(2)}" style="width: 100%; height: ${Math.max((d.count / maxCount) * 48, d.count > 0 ? 8 : 2)}px; background: ${d.isToday ? 'var(--primary)' : d.count > 0 ? 'var(--secondary)' : 'rgba(255,255,255,0.1)'}; border-radius: 4px; transition: height 0.5s ease; cursor: pointer;"></div>
            </div>
            <span style="font-size: 0.55rem; color: var(--text-muted); font-weight: ${d.isToday ? '700' : '400'};">${d.label}</span>
        </div>
    `).join('');

    // Setup custom tooltip logic
    setupChartTooltips();
}

function setupChartTooltips() {
    let tooltipEl = document.getElementById('custom-chart-tooltip');
    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.id = 'custom-chart-tooltip';
        tooltipEl.className = 'glass';
        tooltipEl.style.cssText = 'position: absolute; display: none; padding: 4px 8px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; color: white; background: rgba(30,41,59,0.95); z-index: 9999; pointer-events: none; white-space: nowrap; transform: translate(-50%, -100%); margin-top: -10px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid var(--primary-dark);';
        document.body.appendChild(tooltipEl);
    }

    const bars = document.querySelectorAll('.hoverable-bar');
    bars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            const text = e.target.getAttribute('data-tooltip');
            if (text) {
                tooltipEl.textContent = text;
                tooltipEl.style.display = 'block';
                const rect = e.target.getBoundingClientRect();
                tooltipEl.style.top = rect.top + window.scrollY + 'px';
                tooltipEl.style.left = rect.left + (rect.width / 2) + window.scrollX + 'px';
            }
        });
        bar.addEventListener('mouseleave', () => {
            tooltipEl.style.display = 'none';
        });
        // For mobile tap
        bar.addEventListener('click', (e) => {
            const text = e.target.getAttribute('data-tooltip');
            if (text) showToast(`Oggi: ${text}`);
        });
    });
}

// --- INVENTORY ---
function getSortedInventory() {
    const inv = [...state.inventory];
    if (state.sortOrder === 'price') {
        inv.sort((a, b) => b.price - a.price);
    } else {
        inv.sort((a, b) => a.expiry - b.expiry);
    }
    return inv;
}

function setupSortButtons() {
    const sortExpiryBtn = document.getElementById('sort-expiry');
    const sortPriceBtn = document.getElementById('sort-price');
    if (!sortExpiryBtn || !sortPriceBtn) return;

    function updateSortUI() {
        sortExpiryBtn.style.background = state.sortOrder === 'expiry' ? 'var(--primary)' : 'transparent';
        sortExpiryBtn.style.color = state.sortOrder === 'expiry' ? 'white' : 'var(--text-muted)';
        sortPriceBtn.style.background = state.sortOrder === 'price' ? 'var(--primary)' : 'transparent';
        sortPriceBtn.style.color = state.sortOrder === 'price' ? 'white' : 'var(--text-muted)';
    }

    sortExpiryBtn.addEventListener('click', () => {
        state.sortOrder = 'expiry';
        updateSortUI();
        renderInventory();
        saveState();
    });
    sortPriceBtn.addEventListener('click', () => {
        state.sortOrder = 'price';
        updateSortUI();
        renderInventory();
        saveState();
    });
    updateSortUI();
}

function renderInventory() {
    const countEl = document.getElementById('inventory-count');
    if (countEl) countEl.textContent = `(${state.inventory.length})`;

    if (state.inventory.length === 0) {
        expiryList.innerHTML = `
            <div class="glass" style="padding: 16px; border-radius: var(--radius-md); text-align: center; color: var(--text-muted);">
                <p>Scansiona un prodotto per iniziare!</p>
            </div>
        `;
        return;
    }

    const sorted = getSortedInventory();

    expiryList.innerHTML = sorted.map((item) => {
        const realIndex = state.inventory.indexOf(item);
        const icon = item.img
            ? `<img src="${item.img}" style="width: 100%; height: 100%; object-fit: cover;">`
            : (item.icon && item.icon !== '✏️' ? item.icon : getCategoryIcon(item.name));

        let badge = '';
        if (item.expiry === 0) {
            badge = `<span class="expiry-badge badge-danger">⚠️ SCADUTO</span>`;
        } else if (item.expiry === 1) {
            badge = `<span class="expiry-badge badge-danger">🔥 SCADE OGGI</span>`;
        } else if (item.expiry === 2) {
            badge = `<span class="expiry-badge badge-warning">⏰ SCADE DOMANI</span>`;
        }

        return `
        <div class="glass animate-fade-in" style="padding: 16px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 16px; border-left: 4px solid ${item.expiry <= 1 ? 'var(--danger)' : item.expiry === 2 ? 'var(--accent)' : 'var(--secondary)'}">
            <div style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden;">
                ${icon}
            </div>
            <div style="flex: 1; min-width: 0;">
                <h4 style="font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</h4>
                <p class="text-muted" style="font-size: 0.75rem;">Scade in ${item.expiry} giorni</p>
                ${badge}
            </div>
            <div style="text-align: right; flex-shrink: 0;">
                <p style="font-size: 0.9rem; font-weight: 700;">€${parseFloat(item.price).toFixed(2)}</p>
                <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;">
                    <button onclick="openEditModal(${realIndex})" style="background: none; border: none; color: var(--text-muted); font-size: 0.65rem; font-weight: 700; cursor: pointer; padding: 2px 0;">✏️</button>
                    <button onclick="consumeItem(${realIndex})" style="background: none; border: none; color: var(--primary); font-size: 0.65rem; font-weight: 700; cursor: pointer; padding: 2px 0;">CONSUMA</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function consumeItem(index) {
    const item = state.inventory[index];
    state.savings += item.price;
    state.co2 += parseFloat(item.co2) || 0;
    state.foodCount += 1;
    state.inventory.splice(index, 1);

    // Track for weekly chart
    const today = new Date().toISOString().split('T')[0];
    state.weeklyConsumed.push({ date: today, savings: item.price });
    // Keep only last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    state.weeklyConsumed = state.weeklyConsumed.filter(e => new Date(e.date) >= cutoff);

    animateValue(totalSavingsEl, state.savings - item.price, state.savings, 1000, "€");
    updateUI();
}

// --- EDIT MODAL ---
function openEditModal(index) {
    editingIndex = index;
    const item = state.inventory[index];
    editNameInput.value = item.name;
    editPriceInput.value = item.price.toFixed(2);

    // Convert days back to a date string
    const d = new Date();
    d.setDate(d.getDate() + item.expiry);
    editExpiryInput.value = d.toISOString().split('T')[0];

    editModal.style.display = 'flex';
}

saveEditBtn.addEventListener('click', () => {
    const name = editNameInput.value.trim();
    const price = parseFloat(editPriceInput.value);
    const expiryDate = editExpiryInput.value;

    if (name && !isNaN(price) && expiryDate) {
        const daysRemaining = calculateDaysRemaining(expiryDate);
        state.inventory[editingIndex] = {
            ...state.inventory[editingIndex],
            name,
            price,
            expiry: daysRemaining,
            icon: getCategoryIcon(name)
        };
        editModal.style.display = 'none';
        showToast(`✅ ${name} aggiornato!`);
        updateUI();
    } else {
        showToast("⚠️ Compila tutti i campi");
    }
});

cancelEditBtn.addEventListener('click', () => {
    editModal.style.display = 'none';
});

// --- RECIPE SECTION ---
async function checkRecipes() {
    if (state.inventory.length >= 2) {
        recipeEl.style.display = 'block';
        recipeEl.classList.add('animate-fade-in');

        showRecipeLoading();

        const ingredients = state.inventory.slice(0, 10).map(i => i.name);
        const aiResponse = await fetchAIRecipe(ingredients);
        renderRecipes(aiResponse);
    } else {
        recipeEl.style.display = 'none';
        recipeEl.innerHTML = '';
        lastRecipes = [];
    }
}

function showRecipeLoading() {
    recipeEl.innerHTML = `
        <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.2rem;">👨‍🍳</span>
            <span class="brand-font" style="font-size: 0.9rem; color: var(--primary-light); letter-spacing: 0.05em;">L'IA sta cucinando</span>
            <div class="dot-pulse"><span></span><span></span><span></span></div>
        </div>
        <div style="display: flex; gap: 16px; align-items: center;">
            <div class="shimmer" style="width: 80px; height: 80px; border-radius: var(--radius-sm); flex-shrink: 0;"></div>
            <div style="flex: 1;">
                <div class="shimmer" style="height: 16px; border-radius: 8px; margin-bottom: 8px; width: 60%;"></div>
                <div class="shimmer" style="height: 12px; border-radius: 8px; width: 90%;"></div>
                <div class="shimmer" style="height: 12px; border-radius: 8px; margin-top: 4px; width: 70%;"></div>
            </div>
        </div>
    `;
}

function renderRecipes(aiResponse) {
    if (aiResponse && !aiResponse.error && Array.isArray(aiResponse)) {
        if (aiResponse.length > 0) {
            lastRecipes = aiResponse;
            let recipesHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 0.7rem; background: var(--primary); color: white; padding: 3px 10px; border-radius: 20px; font-weight: 700;">🤖 AI CHEF</span>
                <button id="regenerate-btn" onclick="regenerateRecipes()" style="background: rgba(99,102,241,0.15); border: 1px solid var(--primary); color: var(--primary-light); font-size: 0.72rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: all 0.3s;">🔄 Rigenera</button>
            </div><div style="display: grid; gap: 16px;">`;

            for (const aiRecipe of aiResponse) {
                const isCompleted = state.completedRecipes.includes(aiRecipe.title);

                // Traffic-Light Logic (Granular)
                const calorieColor = aiRecipe.calorieBand === 'lite' ? '#10b981' : (aiRecipe.calorieBand === 'medium' ? '#f59e0b' : '#ef4444');

                // Difficulty Color
                const diff = (aiRecipe.difficulty || 'Media').toLowerCase();
                const diffColor = diff.includes('facile') ? '#10b981' : (diff.includes('difficile') ? '#ef4444' : '#f59e0b');

                // PrepTime Color (Simplified parsing)
                const timeStr = (aiRecipe.prepTime || '20 min').toLowerCase();
                const timeVal = parseInt(timeStr) || 20;
                let timeColor = '#f59e0b'; // Default yellow
                if (timeVal <= 20) timeColor = '#10b981'; // Fast
                else if (timeVal >= 40) timeColor = '#ef4444'; // Long

                recipesHTML += `
                <div class="glass" style="padding: 16px; border-radius: var(--radius-md); margin-bottom: 12px; border-left: 4px solid ${isCompleted ? '#10b981' : 'transparent'};">
                    <div style="display: flex; gap: 16px;">
                        <div style="width: 72px; height: 72px; border-radius: var(--radius-sm); background: linear-gradient(135deg, #1e293b, #0f172a); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; position: relative;">
                            ${aiRecipe.emoji || "🥗"}
                            ${isCompleted ? '<div style="position: absolute; top: -5px; right: -5px; background: #10b981; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);">✓</div>' : ''}
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                <h4 class="brand-font" style="font-size: 0.95rem; color: white; margin-bottom: 4px;">
                                    ${aiRecipe.title} ${isCompleted ? ' <span style="color: #10b981;">✅</span>' : ''}
                                </h4>
                                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                                    <span style="font-size: 0.62rem; padding: 3px 10px; border-radius: 20px; background: ${calorieColor}15; color: ${calorieColor}; border: 1px solid ${calorieColor}30; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; display: flex; align-items: center; gap: 4px;">
                                        🔥 ${aiRecipe.calories || 0} kcal
                                    </span>
                                    <div style="display: flex; gap: 4px;">
                                        <span style="font-size: 0.6rem; padding: 2px 8px; border-radius: 6px; background: ${diffColor}15; color: ${diffColor}; border: 1px solid ${diffColor}30; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                                            📊 ${aiRecipe.difficulty || 'Media'}
                                        </span>
                                        <span style="font-size: 0.6rem; padding: 2px 8px; border-radius: 6px; background: ${timeColor}15; color: ${timeColor}; border: 1px solid ${timeColor}30; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                                            ⏱️ ${aiRecipe.prepTime || '20 min'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p style="font-size: 0.78rem; color: rgba(255,255,255,0.65); line-height: 1.4;">${aiRecipe.description}</p>
                            ${aiRecipe.ingredientsUsed ? `<p style="font-size: 0.7rem; margin-top: 6px; color: var(--secondary); font-weight: 600;">👨‍🍳 ${aiRecipe.ingredientsUsed.join(', ')}</p>` : ''}
                            <div style="display: flex; gap: 8px; margin-top: 10px;">
                                <button onclick="showRecipeSteps('${encodeURIComponent(JSON.stringify(aiRecipe))}')" style="background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: var(--secondary); font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; cursor: pointer;">📖 Passaggi</button>
                                ${!isCompleted ? `<button onclick="completeRecipe('${aiRecipe.title.replace(/'/g, "\\'")}')" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; font-size: 0.7rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; cursor: pointer;">✅ Ho Fatto</button>` : ''}
                            </div>
                        </div>
                    </div>
                </div>`;
            }
            recipesHTML += '</div>';
            recipeEl.innerHTML = recipesHTML;
        } else {
            lastRecipes = [];
            recipeEl.innerHTML = `
            <div style="display: flex; gap: 16px; align-items: flex-start;">
                <div style="font-size: 2.5rem; flex-shrink: 0;">🤔</div>
                <div>
                    <h4 class="brand-font" style="color: white; margin-bottom: 4px;">Abbinamento Bizzarro!</h4>
                    <p style="font-size: 0.8rem; color: rgba(255,255,255,0.65);">I tuoi ingredienti sono un po' troppo creativi da mischiare! Aggiungi altri prodotti compatibili.</p>
                    <button onclick="regenerateRecipes()" style="margin-top: 10px; background: rgba(99,102,241,0.15); border: 1px solid var(--primary); color: var(--primary-light); font-size: 0.72rem; font-weight: 700; padding: 4px 12px; border-radius: 20px; cursor: pointer;">🔄 Riprova</button>
                </div>
            </div>`;
        }
    } else {
        const errorText = aiResponse?.error ? `<br><small style="color:var(--text-muted); font-size: 0.7rem;">(${aiResponse.error})</small>` : "";
        recipeEl.innerHTML = `
        <div style="display: flex; gap: 16px; align-items: flex-start;">
            <div style="font-size: 2.5rem; flex-shrink: 0;">🔍</div>
            <div>
                <h4 class="brand-font" style="color: white; margin-bottom: 4px;">Chef in Pausa</h4>
                <p style="font-size: 0.8rem; color: rgba(255,255,255,0.65);">
                    L'AI ha qualche difficoltà, ma puoi trovare una ricetta con un click! ${errorText}
                </p>
                <div style="display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap;">
                    <a href="${aiResponse?.fallbackUrl || '#'}" target="_blank" class="btn btn-primary" style="text-decoration: none; padding: 6px 14px; font-size: 0.75rem;">Cerca su Google 🚀</a>
                    <button onclick="regenerateRecipes()" style="background: rgba(99,102,241,0.15); border: 1px solid var(--primary); color: var(--primary-light); font-size: 0.72rem; font-weight: 700; padding: 6px 14px; border-radius: var(--radius-md); cursor: pointer;">🔄 Riprova</button>
                </div>
            </div>
        </div>`;
    }
}

let isRegenerating = false;
async function regenerateRecipes() {
    if (state.inventory.length < 2 || isRegenerating) return;

    const btn = document.getElementById('regenerate-btn');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.innerHTML = '⏳ Attendi...';
    }

    isRegenerating = true;
    showRecipeLoading();

    // Force bypass cache for regenerate
    const ingredients = state.inventory.slice(0, 10).map(i => i.name);
    const aiResponse = await fetchAIRecipe(ingredients);
    renderRecipes(aiResponse);

    // 15 seconds cooldown
    setTimeout(() => {
        isRegenerating = false;
        const liveBtn = document.getElementById('regenerate-btn');
        if (liveBtn) {
            liveBtn.disabled = false;
            liveBtn.style.opacity = '1';
            liveBtn.innerHTML = '🔄 Rigenera';
        }
    }, 15000);
}

function completeRecipe(title) {
    if (!state.completedRecipes.includes(title)) {
        state.completedRecipes.push(title);
        state.totalCompleted += 1;
        showToast(`👏 Ottimo lavoro! Ricetta "${title}" completata.`);
        updateUI();
    }
}

// --- RECIPE STEPS MODAL ---
function showRecipeSteps(encodedRecipe) {
    const recipe = JSON.parse(decodeURIComponent(encodedRecipe));
    stepsTitleEl.textContent = `${recipe.emoji || '🍽️'} ${recipe.title}`;

    // Show a loading state and then fetch steps
    stepsContentEl.innerHTML = `<div class="shimmer" style="height: 14px; border-radius: 8px; margin-bottom: 10px;"></div><div class="shimmer" style="height: 14px; border-radius: 8px; width: 80%; margin-bottom: 10px;"></div><div class="shimmer" style="height: 14px; border-radius: 8px; width: 90%;"></div>`;
    stepsModal.style.display = 'flex';

    fetchRecipeSteps(recipe).then(result => {
        if (result && !result.error) {
            stepsContentEl.innerHTML = result;
        } else {
            const err = result?.error || "Non è stato possibile ottenere i passaggi.";
            stepsContentEl.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">⚠️ ${err}</p><p style="margin-top:10px;"><a href="https://www.google.com/search?q=ricetta+${encodeURIComponent(recipe.title)}" target="_blank" style="color: var(--secondary); font-weight: 700;">Cerca su Google 🚀</a></p>`;
        }
    });
}

// --- GEMINI API CALLER ---
// Soluzione Auto-Diag Solida: Chiede a Google quali modelli sono disponibili e ne prova multipli se uno è in 429
async function callGeminiAPI(prompt, key) {
    try {
        console.log(`[WBS] 🔍 Auto-diagnosi in corso...`);
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const listResponse = await fetch(listUrl);
        const listData = await listResponse.json();

        if (listResponse.status === 429) {
            return { error: { message: "⏳ Google Rate Limit. Attendi 1 minuto." } };
        }

        if (!listResponse.ok) {
            return { error: { message: `🔑 API Error: ${listData.error?.message || "Errore"}` } };
        }

        // Trova tutti i modelli compatibili
        const supported = (listData.models || []).filter(m =>
            m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
        );

        if (supported.length === 0) {
            return { error: { message: "Nessun modello trovato per questa chiave." } };
        }

        // Prova i primi 3 modelli disponibili in ordine se uno fallisce per quota
        for (let i = 0; i < Math.min(supported.length, 3); i++) {
            const modelName = supported[i].name;
            console.log(`[WBS] Tentativo con: ${modelName}`);

            const generateUrl = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${key}`;
            const response = await fetch(generateUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            const data = await response.json();

            if (response.ok && data.candidates?.[0]?.content) {
                console.log(`[WBS] ✅ Successo con ${modelName}`);
                return data;
            }

            // Se è un errore di quota (429), prova il prossimo modello della lista
            if (response.status === 429) {
                console.warn(`[WBS] Modello ${modelName} in quota limit, provo il prossimo...`);
                continue;
            }

            // Se è un errore diverso, riportalo
            return { error: { message: data.error?.message || "Errore AI" } };
        }

        return { error: { message: "Tutti i modelli disponibili hanno esaurito la quota. Attendi 1 minuto." } };
    } catch (e) {
        console.error(`[WBS]`, e);
        return { error: { message: "Errore di connessione." } };
    }
}

// --- DIAGNOSTICA API KEY ---
// Eseguibile dalla console del browser con: testAPIKey()
window.testAPIKey = async function () {
    const key = state.geminiKey;
    if (!key) {
        console.error('❌ Nessuna API Key salvata! Vai nel Profilo e inseriscila.');
        showToast('❌ Inserisci prima la API Key nel Profilo!');
        return;
    }

    console.log('🔍 === DIAGNOSTICA API KEY WBS ===');
    console.log(`Chiave (primi 8 car.): ${key.substring(0, 8)}...`);

    const tests = [
        { ver: 'v1beta', model: 'gemini-2.0-flash' },
        { ver: 'v1beta', model: 'gemini-2.0-flash-lite' },
        { ver: 'v1beta', model: 'gemini-1.5-flash' },
        { ver: 'v1', model: 'gemini-2.0-flash' },
        { ver: 'v1', model: 'gemini-1.5-flash' },
    ];

    const results = [];
    for (const { ver, model } of tests) {
        try {
            const url = `https://generativelanguage.googleapis.com/${ver}/models/${model}:generateContent?key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] })
            });
            const data = await res.json().catch(() => ({}));
            const status = res.status;
            const ok = status === 200 && data.candidates?.[0]?.content;
            const msg = ok ? '✅ FUNZIONA' : `❌ ${status}: ${data.error?.message || 'risposta vuota'}`;
            results.push({ api: ver, model, status, result: msg });
            console.log(`${msg} — ${ver}/${model}`);

            // Se 429, ferma tutto
            if (status === 429) {
                console.warn('⛔ Rate limit attivo! Smetto di testare. Attendi 1 minuto.');
                break;
            }
        } catch (e) {
            results.push({ api: ver, model, status: 'ERRORE', result: `❌ Rete: ${e.message}` });
        }
    }

    console.log('📊 Risultati completi:', results);
    console.table(results);

    const working = results.filter(r => r.result.includes('FUNZIONA'));
    if (working.length > 0) {
        showToast(`✅ API funzionante con: ${working[0].api}/${working[0].model}`);
    } else {
        showToast('❌ Nessun modello ha risposto. Controlla la console (F12) per i dettagli.');
    }

    return results;
};

async function fetchRecipeSteps(recipe) {
    if (!state.geminiKey) return null;
    try {
        const prompt = `Sei uno Chef. Fornisci i passaggi dettagliati per preparare: "${recipe.title}". Ingredienti usati: ${(recipe.ingredientsUsed || []).join(', ')}. Rispondi con i passaggi numerati in italiano, max 6 passi, ognuno su una riga. Niente markdown extra.`;
        const data = await callGeminiAPI(prompt, state.geminiKey);

        if (data && !data.error && data.candidates?.[0]?.content) {
            const text = data.candidates[0].content.parts[0].text;
            // Format numbered steps into nice HTML
            const lines = text.split('\n').filter(l => l.trim());
            return lines.map(l => `<p style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; line-height: 1.5; color: rgba(255,255,255,0.85);">${l.trim()}</p>`).join('');
        }
        return { error: data?.error?.message || "L'AI non ha restituito passaggi." };
    } catch (e) {
        console.error(e);
        return { error: "Errore durante il recupero dei passaggi." };
    }
}

closeStepsBtn.addEventListener('click', () => {
    stepsModal.style.display = 'none';
});

// --- DIET PREFERENCES ---
function setupDietCheckboxes() {
    const prefs = ['vegetariano', 'vegano', 'glutenFree'];
    prefs.forEach(pref => {
        const el = document.getElementById(`diet-${pref}`);
        if (!el) return;
        el.checked = state.dietPrefs[pref];
        el.addEventListener('change', () => {
            state.dietPrefs[pref] = el.checked;
        });
    });
}

function animateValue(obj, start, end, duration, prefix = "") {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = prefix + (progress * (end - start) + start).toFixed(2);
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// --- AI RECIPE FETCH ---
async function fetchAIRecipe(ingredients) {
    const query = encodeURIComponent(`ricetta con ${ingredients.join(' ')}`);
    const fallbackUrl = `https://www.google.com/search?q=${query}+giallozafferano`;

    if (!state.geminiKey) {
        return { error: "Manca la chiave Gemini", fallbackUrl };
    }

    const dietLines = [];
    if (state.dietPrefs.vegetariano) dietLines.push("- La ricetta deve essere VEGETARIANA (no carne, no pesce)");
    if (state.dietPrefs.vegano) dietLines.push("- La ricetta deve essere VEGANA (no prodotti animali)");
    if (state.dietPrefs.glutenFree) dietLines.push("- La ricetta deve essere SENZA GLUTINE");

    try {
        const prompt = `Sei uno Chef Creativo. Il mio frigo contiene i seguenti ingredienti: ${ingredients.join(', ')}.
Prova a creare da 1 a 3 ricette usando alcuni o tutti questi ingredienti, aggiungendo eventuali ingredienti base se necessario (es. olio, sale, farina, acqua).
${dietLines.length > 0 ? 'Preferenze alimentari da rispettare:\n' + dietLines.join('\n') : ''}
IMPORTANTE: Se gli ingredienti sono palesemente incompatibili o assurdi da mischiare insieme, restituisci un array vuoto [].
Rispondi SOLO ed ESCLUSIVAMENTE con un array JSON in questo formato esatto, senza commenti:
[
  {
    "title": "Nome Ricetta",
    "description": "Breve e invitante descrizione in 1-2 frasi.",
    "emoji": "🍲",
    "ingredientsUsed": ["ingrediente1", "ingrediente2"],
    "calories": 450,
    "calorieBand": "medium",
    "difficulty": "Facile",
    "prepTime": "15 min"
  }
]
Nota: calorieBand deve essere "lite" (<400), "medium" (400-700), o "high" (>700).
La difficulty deve essere uno tra: "Facile", "Media", "Difficile".
prepTime deve essere una stringa breve (es. "10 min", "1 ora").`;

        const data = await callGeminiAPI(prompt, state.geminiKey);

        if (data && !data.error && data.candidates?.[0]?.content) {
            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed)) return parsed;
                if (typeof parsed === 'object') return [parsed];
            } catch (parseError) {
                console.error("JSON parsing error:", parseError, "Raw text was:", text);
                return { error: "Formato ricetta non valido", fallbackUrl };
            }
        }
        const errMsg = data?.error?.message || `Errore API Gemini`;
        console.error(`❌ Errore Gemini:`, data);
        return { error: errMsg, fallbackUrl };
    } catch (e) {
        return { error: "Errore di rete interno", fallbackUrl };
    }
}

// --- MODALS & SCANNER ---
scanBtn.addEventListener('click', () => { choiceModal.style.display = 'flex'; });
cancelChoiceBtn.addEventListener('click', () => { choiceModal.style.display = 'none'; });
choiceScanBtn.addEventListener('click', () => { choiceModal.style.display = 'none'; startScanner(); });
choiceManualBtn.addEventListener('click', () => {
    choiceModal.style.display = 'none';
    manualModal.style.display = 'flex';
    manualNameInput.focus();
});

profileBtn.addEventListener('click', () => {
    userNameInput.value = state.userName;
    geminiKeyInput.value = state.geminiKey;
    document.getElementById('diet-vegetariano').checked = state.dietPrefs.vegetariano;
    document.getElementById('diet-vegano').checked = state.dietPrefs.vegano;
    document.getElementById('diet-glutenFree').checked = state.dietPrefs.glutenFree;
    profileModal.style.display = 'flex';
});
cancelProfileBtn.addEventListener('click', () => { profileModal.style.display = 'none'; });

saveProfileBtn.addEventListener('click', () => {
    const newName = userNameInput.value.trim();
    const newKey = geminiKeyInput.value.trim();
    if (newName) {
        state.userName = newName;
        state.geminiKey = newKey;
        state.dietPrefs.vegetariano = document.getElementById('diet-vegetariano').checked;
        state.dietPrefs.vegano = document.getElementById('diet-vegano').checked;
        state.dietPrefs.glutenFree = document.getElementById('diet-glutenFree').checked;
        saveState();
        updateUI();
        profileModal.style.display = 'none';
        showToast("👤 Profilo aggiornato correttamente");
    } else {
        showToast("⚠️ Inserisci almeno il tuo nome");
    }
});

resetBtn.addEventListener('click', () => { resetModal.style.display = 'flex'; });
cancelResetBtn.addEventListener('click', () => { resetModal.style.display = 'none'; });
confirmResetBtn.addEventListener('click', () => {
    state.savings = 0; state.co2 = 0; state.foodCount = 0;
    state.inventory = []; state.weeklyConsumed = [];
    state.completedRecipes = []; state.totalCompleted = 0;
    updateUI();
    resetModal.style.display = 'none';
    showToast("♻️ Progressi azzerati");
});

let html5QrCode = null;
async function startScanner() {
    scanOverlay.style.display = 'flex';
    if (!html5QrCode) html5QrCode = new Html5Qrcode("reader");

    const qrCodeSuccessCallback = async (decodedText) => {
        await html5QrCode.stop();
        showToast("🔍 Ricerca prodotto...");
        let product = await getProductData(decodedText);
        if (!product) {
            showToast("🔍 Prodotto non trovato.");
            lastScannedBarcode = decodedText;
            scanOverlay.style.display = 'none';
            manualModal.style.display = 'flex';
            manualNameInput.focus();
        } else {
            state.inventory.push(product);
            showToast(`✅ ${product.name} aggiunto!`);
            scanOverlay.style.display = 'none';
            updateUI();
        }
    };
    try {
        await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, qrCodeSuccessCallback);
    } catch (err) {
        console.error("Scanner Error", err);
        showToast("⚠️ Errore fotocamera");
        scanOverlay.style.display = 'none';
    }
}

saveManualBtn.addEventListener('click', () => {
    const name = manualNameInput.value.trim();
    const price = parseFloat(manualPriceInput.value);
    const expiryDate = manualExpiryInput.value;
    if (name && !isNaN(price) && expiryDate) {
        const daysRemaining = calculateDaysRemaining(expiryDate);
        state.inventory.push({ name, price, co2: 0.3, expiry: daysRemaining, icon: getCategoryIcon(name) });
        showToast(`✅ ${name} aggiunto!`);
        closeManualModal();
        updateUI();
    } else {
        showToast("⚠️ Inserisci nome, prezzo e scadenza");
    }
});

function calculateDaysRemaining(dateString) {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

function closeManualModal() {
    manualModal.style.display = 'none';
    manualNameInput.value = "";
    manualPriceInput.value = "";
    manualExpiryInput.value = "";
}
cancelManualBtn.addEventListener('click', closeManualModal);

[manualNameInput, manualPriceInput, manualExpiryInput, editNameInput, editPriceInput, editExpiryInput].forEach(input => {
    if (!input) return;
    input.addEventListener('focus', () => { input.style.borderColor = 'var(--primary)'; input.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.2)'; });
    input.addEventListener('blur', () => { input.style.borderColor = 'var(--glass-border)'; input.style.boxShadow = 'none'; });
});

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'glass';
    toast.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 12px 24px; border-radius: 20px; background: var(--primary); color: white; font-weight: 600; z-index: 9999; font-size: 0.9rem; max-width: 90%; text-align: center;';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

closeScan.addEventListener('click', async () => {
    if (html5QrCode && html5QrCode.isScanning) await html5QrCode.stop();
    scanOverlay.style.display = 'none';
});

// Run Init
init();
