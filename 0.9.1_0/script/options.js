const USE_SYNC = false; //enable to use Chrome Sync to save options to the logged-in Google account. 
const DEFAULT_OPTIONS = {
    style: 'google',
    scale: '1.25'
};

async function load(element = document, parser) {
    if (typeof element == 'function') {
        parser = element;
        element = document;
    }
    let saved = await chrome.storage[(USE_SYNC)?'sync':'local'].get('type');
    if (!saved.type) { saved = { type: DEFAULT_OPTIONS } } 
    if (saved.type) {
        for (let key in saved.type) {
            let selector = `[name="${key}"][value="${saved.type[key]}"][type="check"], ` +
                           `[name="${key}"][value="${saved.type[key]}"][type="radio"], ` +
                           `[name="${key}"]:not([type="radio"], [type="check"])`;
            let item = element.querySelector(selector);
            item.checked = true;
            if (item.type != 'check' && item.type != 'radio') {
                item.value = saved.type[key];
            }
        }
    }
    if (parser) { parser(saved); }
}

function save(element = document, parser) {
    if (typeof element == 'function') {
        parser = element;
        element = document;
    }
    let saved = { type: {} };
    let selector = ':not(option):checked, [name]:not([type="radio"], [type="check"])'
    for (item of element.querySelectorAll(selector)) {
        saved.type[item.name] = item.value;
    }
    chrome.storage[(USE_SYNC)?'sync':'local'].set(saved);
    if (parser) { parser(saved); }
}

function fixEmptyScrollbars(element) { 
    const Y_SCROLL_MARGIN = 5; //pixels that the element can overflow VERTICALLY without scrollbars.
    const X_SCROLL_MARGIN = 5; //pixels that the element can overflow HORIZONTALLY without scrollbars.
    if (element.scrollHeight < element.clientHeight + Y_SCROLL_MARGIN) {
        element.style.overflowY = 'hidden'; 
    }
    if (element.scrollWidth < element.clientWidth + X_SCROLL_MARGIN) {
        element.style.overflowX = 'hidden';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    load();
    fixEmptyScrollbars(document.body);
    document.body.addEventListener('change', () => { save(); });
});
