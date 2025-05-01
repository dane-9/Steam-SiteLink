const searchSites = [
    { id: 'steamrip', text: 'SteamRIP', tooltip: 'Search Steamrip.com', baseUrl: 'https://steamrip.com/', searchParam: 's', type: 'query' },
    { id: 'gog', text: 'GOG-Games', tooltip: 'Search gog-games.to', baseUrl: 'https://gog-games.to/', searchParam: 'search', type: 'query' },
    { id: 'anker', text: 'AnkerGames', tooltip: 'Search ankergames.net', baseUrl: 'https://ankergames.net/', type: 'path' },
	{ id: 'gamebounty', text: 'GameBounty', tooltip: 'Search gamebounty.world', baseUrl: 'https://gamebounty.world/', searchParam: 's', type: 'query' },
    { id: 'fitgirl', text: 'FitGirl', tooltip: 'Search fitgirl-repacks.site', baseUrl: 'https://fitgirl-repacks.site/', searchParam: 's', type: 'query' },
    { id: 'kaoskrew', text: 'KaOsKrew', tooltip: 'Search kaoskrew.org', baseUrl: 'https://kaoskrew.org/search.php', searchParam: 'keywords', type: 'complex_query', extraParams: '&terms=all&author=&fid%5B%5D=13&sc=1&sf=titleonly&sr=topics&sk=t&sd=d&st=0&ch=300&t=0&submit=Search' }
];

const SETTINGS_KEY = 'pluginSearchSiteSettings_v8';
let currentSettings = {};
let settingsMenuCreated = false;
let isDropdownOpen = false;
let closeDropdownTimeout = null;
let activeContextMenu = null;


// --- Settings Management ---

function loadSettings() {
    const defaultSiteOrder = searchSites.map(site => site.id);
    const defaultSettings = { displayMode: 'icons+text', ignoreFreeGames: true, showTooltips: false, siteOrder: [...defaultSiteOrder] };
    searchSites.forEach(site => { defaultSettings[site.id] = true; });
    let loadedOrderIsValid = false;
    try {
        const storedSettings = localStorage.getItem(SETTINGS_KEY);
        const parsed = storedSettings ? JSON.parse(storedSettings) : {};
        currentSettings = { ...defaultSettings, ...parsed };
        if (currentSettings.siteOrder && Array.isArray(currentSettings.siteOrder)) {
            const currentSiteIds = searchSites.map(site => site.id);
            const savedOrderIds = currentSettings.siteOrder;
            if (savedOrderIds.length === currentSiteIds.length) {
                const allSavedExist = savedOrderIds.every(id => currentSiteIds.includes(id));
                const allCurrentExist = currentSiteIds.every(id => savedOrderIds.includes(id));
                if (allSavedExist && allCurrentExist) { loadedOrderIsValid = true; }
            }
        }
        if (!loadedOrderIsValid) { currentSettings.siteOrder = [...defaultSiteOrder]; }
        const validModes = ['icons', 'text', 'icons+text'];
        if (!validModes.includes(currentSettings.displayMode)) { currentSettings.displayMode = 'icons+text'; }
        if (typeof currentSettings.ignoreFreeGames !== 'boolean') { currentSettings.ignoreFreeGames = true; }
        if (typeof currentSettings.showTooltips !== 'boolean') { currentSettings.showTooltips = true; }
    } catch (e) {
        console.error("[Plugin] Error loading settings:", e);
        currentSettings = { ...defaultSettings };
    }
}

function saveSettings() {
    try {
        if (!currentSettings.siteOrder || !Array.isArray(currentSettings.siteOrder) || currentSettings.siteOrder.length !== searchSites.length) { return; }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
    } catch (e) { console.error("[Plugin] Error saving settings:", e); }
}

// --- UI Creation & Interaction ---

function handleDocumentClick(event) {
    const dropdownMenu = document.getElementById('plugin-settings-dropdown');
    const settingsButton = document.getElementById('plugin-settings-button');
    if (isDropdownOpen && dropdownMenu && settingsButton && !dropdownMenu.contains(event.target) && !settingsButton.contains(event.target)) {
        closeSettingsDropdown();
    }
    if (activeContextMenu && !activeContextMenu.contains(event.target)) {
        closeContextMenu();
    }
}

function closeSettingsDropdown() {
     const dropdownMenu = document.getElementById('plugin-settings-dropdown'); if (dropdownMenu) dropdownMenu.style.display = 'none';
     isDropdownOpen = false; document.removeEventListener('click', handleDocumentClick, true);
     const submenu = document.getElementById('plugin-settings-submenu'); if (submenu) submenu.style.display = 'none';
}

function closeContextMenu() {
    if (activeContextMenu) { activeContextMenu.remove(); activeContextMenu = null; document.removeEventListener('click', handleDocumentClick, true); }
}

function showContextMenu(event, siteId) {
    event.preventDefault(); event.stopPropagation(); closeContextMenu();

    const targetButton = event.currentTarget;
    if (!targetButton) return;

    const menu = document.createElement('div'); menu.id = 'plugin-context-menu';

    const rect = targetButton.getBoundingClientRect();
    const menuTop = rect.bottom + window.scrollY + 5; // Below button + 5px gap
    const menuLeft = rect.left + window.scrollX + (rect.width / 2); // Center of button horizontally

    menu.style.top = `${menuTop}px`;
    menu.style.left = `${menuLeft}px`;
    menu.classList.add('plugin-context-menu-centered');


    const currentIndex = currentSettings.siteOrder.indexOf(siteId);
    const canMoveLeft = currentIndex > 0;
    const canMoveRight = currentIndex < currentSettings.siteOrder.length - 1;

    if (canMoveLeft) {
        const moveLeftItem = document.createElement('div'); moveLeftItem.textContent = 'Move Left';
        moveLeftItem.classList.add('plugin-context-menu-item'); moveLeftItem.onclick = (e) => { e.stopPropagation(); handleMove(siteId, -1); }; menu.appendChild(moveLeftItem);
    }
    if (canMoveRight) {
        const moveRightItem = document.createElement('div'); moveRightItem.textContent = 'Move Right';
        moveRightItem.classList.add('plugin-context-menu-item'); moveRightItem.onclick = (e) => { e.stopPropagation(); handleMove(siteId, 1); }; menu.appendChild(moveRightItem);
    }

    if (menu.hasChildNodes()) {
        document.body.appendChild(menu); activeContextMenu = menu;
        document.addEventListener('click', handleDocumentClick, true);
    }
}

function handleMove(siteId, direction) {
    closeContextMenu();
    const currentIndex = currentSettings.siteOrder.indexOf(siteId);
    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= currentSettings.siteOrder.length) return;
    const temp = currentSettings.siteOrder[targetIndex];
    currentSettings.siteOrder[targetIndex] = currentSettings.siteOrder[currentIndex];
    currentSettings.siteOrder[currentIndex] = temp;
    saveSettings();
    reRenderSearchButtons();
}

function reRenderSearchButtons() {
    const searchButtonsGroup = document.getElementById('plugin-search-buttons-group');
    const iconDataAvailable = typeof injectedIconBase64Data !== 'undefined' && Object.keys(injectedIconBase64Data).length > 0;
    const gameNameElement = document.getElementById('appHubAppName');
    let cleanedGameName = '';
    if (gameNameElement) { cleanedGameName = gameNameElement.textContent.trim().replace(/[™®©:!?,.;"'\`\(\)\[\]]/g, ' ').replace(/\s+/g, ' ').trim(); }
    if (!searchButtonsGroup || !cleanedGameName) { return; }

    searchButtonsGroup.innerHTML = ''; // Clear existing

    for (const siteId of currentSettings.siteOrder) {
        const site = searchSites.find(s => s.id === siteId);
        if (!site) { console.warn(`[Plugin] Site data not found for ID '${siteId}'.`); continue; }
        if (currentSettings[site.id] !== true) continue;

        const linkElement = document.createElement('a');
        linkElement.id = `${site.id}-injected-link`;
        linkElement.classList.add('btnv6_blue_hoverfade', 'btn_medium');
        linkElement.target = '_blank';
        if (currentSettings.showTooltips) { linkElement.setAttribute('data-tooltip-text', site.tooltip); }
        linkElement.style.display = 'inline-block';

        const innerSpan = document.createElement('span');
        const displayMode = currentSettings.displayMode;
        if (iconDataAvailable && injectedIconBase64Data[site.id]) {
            const iconElement = document.createElement('img');
            iconElement.classList.add('plugin-search-button-icon');
            iconElement.src = injectedIconBase64Data[site.id];
            iconElement.alt = `${site.text} icon`;
            iconElement.style.display = (displayMode === 'icons' || displayMode === 'icons+text') ? 'inline-block' : 'none';
            iconElement.style.marginRight = (displayMode === 'icons') ? '0' : '5px';
            innerSpan.appendChild(iconElement);
        }
        if (displayMode === 'text' || displayMode === 'icons+text') {
            innerSpan.appendChild(document.createTextNode(site.text));
        }
        linkElement.appendChild(innerSpan);

        linkElement.addEventListener('contextmenu', (event) => showContextMenu(event, site.id)); // Use currentTarget
        linkElement.addEventListener('click', (event) => {
             event.preventDefault();
             const nameToSearch = cleanedGameName;
             if (nameToSearch) {
                  const encodedGameName = encodeURIComponent(nameToSearch);
                  let searchUrl;
                  if (site.type === 'query') { searchUrl = `${site.baseUrl}?${site.searchParam}=${encodedGameName}`; }
                  else if (site.type === 'path') { let baseUrl = site.baseUrl; if (!baseUrl.endsWith('/')) baseUrl += '/'; searchUrl = `${baseUrl}search/${encodedGameName}`; }
                  else if (site.type === 'complex_query') { searchUrl = `${site.baseUrl}?${site.searchParam}=${encodedGameName}${site.extraParams}`; }
                  else { searchUrl = site.baseUrl; }
                  window.open('steam://openurl_external/' + searchUrl, '_blank');
               } else { window.open('steam://openurl_external/' + site.baseUrl, '_blank'); }
        });
        searchButtonsGroup.appendChild(linkElement);
    }
}

function createSettingsMenu(buttonContainer) {
    if (!buttonContainer || settingsMenuCreated) return;

    const settingsWrapper = document.createElement('div'); settingsWrapper.id = 'plugin-settings-wrapper';
    const settingsButton = document.createElement('a'); settingsButton.id = 'plugin-settings-button';
    settingsButton.title = 'Search Site Settings'; settingsButton.href = '#';
    const settingsIcon = document.createElement('img'); settingsIcon.src = 'https://store.fastly.steamstatic.com/public/images/bigpicture/icon_settings.png';
    settingsIcon.alt = 'Settings'; settingsButton.appendChild(settingsIcon);
    const dropdownMenu = document.createElement('div'); dropdownMenu.id = 'plugin-settings-dropdown'; dropdownMenu.style.display = 'none';

    // Display Mode
    const displayModeItem = document.createElement('div'); displayModeItem.classList.add('plugin-settings-menu-item');
    const displayModeLabel = document.createElement('span'); displayModeLabel.textContent = "Display:　"; displayModeItem.appendChild(displayModeLabel);
    const displayOptions = [ { value: 'icons', text: 'Icons' }, { value: 'text', text: 'Text' }, { value: 'icons+text', text: 'Both' }];
    displayOptions.forEach(option => {
        const radioInput = document.createElement('input'); radioInput.type = 'radio'; radioInput.name = 'plugin-display-mode-radio';
        radioInput.value = option.value; radioInput.id = `plugin-display-${option.value}`; radioInput.checked = currentSettings.displayMode === option.value;
        radioInput.addEventListener('change', (event) => { if (event.target.checked) { currentSettings.displayMode = event.target.value; saveSettings(); updateButtonDisplayMode(currentSettings.displayMode); } });
        const radioLabel = document.createElement('label'); radioLabel.htmlFor = radioInput.id; radioLabel.textContent = option.text; radioLabel.style.marginLeft = '5px'; radioLabel.style.marginRight = '10px';
        displayModeItem.appendChild(radioInput); displayModeItem.appendChild(radioLabel);
    });
    dropdownMenu.appendChild(displayModeItem);

    // Ignore F2P
    const ignoreF2PItem = document.createElement('div'); ignoreF2PItem.classList.add('plugin-settings-menu-item');
    const ignoreF2PCheckbox = document.createElement('input'); ignoreF2PCheckbox.type = 'checkbox'; ignoreF2PCheckbox.id = 'setting-checkbox-ignoreF2P';
    ignoreF2PCheckbox.checked = currentSettings.ignoreFreeGames === true;
    ignoreF2PCheckbox.addEventListener('change', (event) => { currentSettings.ignoreFreeGames = event.target.checked; saveSettings(); reRenderSearchButtons(); });
    const ignoreF2PLabel = document.createElement('label'); ignoreF2PLabel.htmlFor = ignoreF2PCheckbox.id; ignoreF2PLabel.textContent = "Ignore Free Games";
    ignoreF2PItem.appendChild(ignoreF2PCheckbox); ignoreF2PItem.appendChild(ignoreF2PLabel);
    dropdownMenu.appendChild(ignoreF2PItem);

    // Show Tooltips
    const showTooltipsItem = document.createElement('div'); showTooltipsItem.classList.add('plugin-settings-menu-item');
    const showTooltipsCheckbox = document.createElement('input'); showTooltipsCheckbox.type = 'checkbox'; showTooltipsCheckbox.id = 'setting-checkbox-showTooltips';
    showTooltipsCheckbox.checked = currentSettings.showTooltips === true;
    showTooltipsCheckbox.addEventListener('change', (event) => { currentSettings.showTooltips = event.target.checked; saveSettings(); updateButtonTooltips(currentSettings.showTooltips); });
    const showTooltipsLabel = document.createElement('label'); showTooltipsLabel.htmlFor = showTooltipsCheckbox.id; showTooltipsLabel.textContent = "Show Tooltips";
    showTooltipsItem.appendChild(showTooltipsCheckbox); showTooltipsItem.appendChild(showTooltipsLabel);
    dropdownMenu.appendChild(showTooltipsItem);

    const separator = document.createElement('div'); separator.classList.add('plugin-settings-separator');
    dropdownMenu.appendChild(separator);

    // Search Sites Submenu
    const sitesMenuItem = document.createElement('div'); sitesMenuItem.classList.add('plugin-settings-menu-item', 'plugin-settings-submenu-parent');
    sitesMenuItem.textContent = "Visible Search Sites";
    const submenu = document.createElement('div'); submenu.id = 'plugin-settings-submenu'; submenu.classList.add('plugin-settings-submenu'); submenu.style.display = 'none';
    sitesMenuItem.appendChild(submenu);
    dropdownMenu.appendChild(sitesMenuItem);

    // Submenu hover logic
    sitesMenuItem.addEventListener('mouseenter', () => { clearTimeout(closeDropdownTimeout); submenu.style.display = 'block'; });
    sitesMenuItem.addEventListener('mouseleave', () => { closeDropdownTimeout = setTimeout(() => { submenu.style.display = 'none'; }, 350); });
    submenu.addEventListener('mouseenter', () => { clearTimeout(closeDropdownTimeout); });
    submenu.addEventListener('mouseleave', () => { closeDropdownTimeout = setTimeout(() => { submenu.style.display = 'none'; }, 350); });

    settingsWrapper.appendChild(settingsButton); settingsWrapper.appendChild(dropdownMenu);
    buttonContainer.appendChild(settingsWrapper);

    // Toggle main dropdown listener
    settingsButton.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation();
        const currentSubmenu = document.getElementById('plugin-settings-submenu'); // Repopulate submenu on open
        if(currentSubmenu) {
            currentSubmenu.innerHTML = '';
            for (const siteId of currentSettings.siteOrder) {
                const site = searchSites.find(s => s.id === siteId); if (!site) continue;
                const subMenuItem = document.createElement('div'); subMenuItem.classList.add('plugin-settings-menu-item');
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.id = `setting-checkbox-${site.id}`; checkbox.dataset.siteId = site.id; checkbox.checked = currentSettings[site.id] === true;
                checkbox.addEventListener('change', (event) => { currentSettings[site.id] = event.target.checked; saveSettings(); reRenderSearchButtons(); }); // Use reRender
                const label = document.createElement('label'); label.htmlFor = checkbox.id; label.textContent = site.text;
                subMenuItem.appendChild(checkbox); subMenuItem.appendChild(label);
                currentSubmenu.appendChild(subMenuItem);
            }
        }
        const willBeOpen = dropdownMenu.style.display === 'none';
        dropdownMenu.style.display = willBeOpen ? 'block' : 'none';
        isDropdownOpen = willBeOpen;
        if (willBeOpen) { document.addEventListener('click', handleDocumentClick, true); }
        else { document.removeEventListener('click', handleDocumentClick, true); }
    });
    settingsMenuCreated = true;
}

function updateButtonDisplayMode(mode) {
    const siteOrder = currentSettings.siteOrder || searchSites.map(s => s.id);
    siteOrder.forEach(siteId => {
        const site = searchSites.find(s => s.id === siteId); if (!site) return;
        const buttonElement = document.getElementById(`${site.id}-injected-link`);
        if (buttonElement) {
            const spanElement = buttonElement.querySelector('span'); if (!spanElement) return;
            const iconElement = spanElement.querySelector('.plugin-search-button-icon');
            let textNode = Array.from(spanElement.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
            if (iconElement) { iconElement.style.display = (mode === 'icons' || mode === 'icons+text') ? 'inline-block' : 'none'; }
            if (mode === 'text' || mode === 'icons+text') {
                if (!textNode) { textNode = document.createTextNode(site.text); spanElement.appendChild(textNode); } else { textNode.nodeValue = site.text; }
            } else { if (textNode) { spanElement.removeChild(textNode); } }
            if (iconElement) { iconElement.style.marginRight = (mode === 'icons') ? '0' : '5px'; }
        }
    });
}

function updateButtonTooltips(show) {
    const siteOrder = currentSettings.siteOrder || searchSites.map(s => s.id);
    siteOrder.forEach(siteId => {
        const site = searchSites.find(s => s.id === siteId); if (!site) return;
        const buttonElement = document.getElementById(`${site.id}-injected-link`);
        if (buttonElement) {
            if (show) { buttonElement.setAttribute('data-tooltip-text', site.tooltip); }
            else { buttonElement.removeAttribute('data-tooltip-text'); }
        }
    });
}

// --- Core Injection Logic ---

function isGamePageUrl() {
    const pathSegments = window.location.pathname.split('/');
    return pathSegments.length >= 3 && pathSegments[1] === 'app' && /^\d+$/.test(pathSegments[2]);
}

function attemptInjectLink() {
    if (!isGamePageUrl()) {
         searchSites.forEach(site => { const existingLink = document.getElementById(`${site.id}-injected-link`); if (existingLink) existingLink.remove(); });
         const btnContainer = document.getElementById('plugin-button-container'); if (btnContainer) btnContainer.remove();
         settingsMenuCreated = false; return false;
    }
    loadSettings();
    let isFreeToPlay = false;
    const priceElement = document.querySelector('.game_purchase_price.price');
    if (priceElement && priceElement.textContent.trim().toLowerCase().startsWith('free to play')) { isFreeToPlay = true; }
    if (isFreeToPlay && currentSettings.ignoreFreeGames === true) {
        searchSites.forEach(site => { const existingLink = document.getElementById(`${site.id}-injected-link`); if (existingLink) existingLink.remove(); });
        const btnContainer = document.getElementById('plugin-button-container'); if (btnContainer) btnContainer.remove();
        settingsMenuCreated = false; return 'f2p_ignored';
    }
    const titleElement = document.getElementById('appHubAppName');
    if (!titleElement) return false;
    const titleContainer = titleElement.parentElement;
    if (!titleContainer) return false;
    let buttonContainer = document.getElementById('plugin-button-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div'); buttonContainer.id = 'plugin-button-container';
        const searchButtonsGroup = document.createElement('div'); searchButtonsGroup.id = 'plugin-search-buttons-group';
        buttonContainer.appendChild(searchButtonsGroup);
        createSettingsMenu(buttonContainer);
        titleContainer.insertBefore(buttonContainer, titleElement.nextSibling);
        reRenderSearchButtons(); // Initial render
        return true;
    } else {
        reRenderSearchButtons(); // Re-render on subsequent attempts
        if (!document.getElementById('plugin-settings-wrapper')) { settingsMenuCreated = false; createSettingsMenu(buttonContainer); }
        return true;
    }
}

// --- Injection Triggering & Handling ---

let injectionInterval = null;
function startInjectionAttempts() {
     clearInterval(injectionInterval); loadSettings();
     injectionInterval = setInterval(() => {
         const result = attemptInjectLink();
         if (result === true || result === 'f2p_ignored') { clearInterval(injectionInterval); }
     }, 50);
}
const resetStateOnNav = () => {
    settingsMenuCreated = false; currentSettings = {};
    if (isDropdownOpen) { document.removeEventListener('click', handleDocumentClick, true); isDropdownOpen = false; }
    if (activeContextMenu) { closeContextMenu(); }
    setTimeout(startInjectionAttempts, 100);
};
const originalPushState = history.pushState;
history.pushState = function() { originalPushState.apply(history, arguments); resetStateOnNav(); };
const originalReplaceState = history.replaceState;
history.replaceState = function() { originalReplaceState.apply(history, arguments); resetStateOnNav(); };
window.addEventListener('popstate', () => { resetStateOnNav(); });
document.addEventListener('DOMContentLoaded', () => { startInjectionAttempts(); });
if (document.readyState !== 'loading') { startInjectionAttempts(); }
window.addEventListener('load', () => { startInjectionAttempts(); });