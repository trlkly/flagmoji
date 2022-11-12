const DEBOUNCE_MS = 750

url = chrome.runtime.getURL("images/emoji/");
//var timer = new Date();
var emoji = new EmojiConvertor();
emoji.img_path = url;
emoji.use_sheet = true;
emoji.replace_mode = 'css';

emoji.img_sets = {
    'google': {'sheet': url + 'sheet_google_64.png', 'mask': 2},
    'twitter': {'sheet': url + 'sheet_twitter_64.png', 'mask': 4},
};

var running = false;
var runAgain = false;

var insertId = null;
function insertDebounced() {
    time = 0;
    if (insertId) {
        time = DEBOUNCE_MS;
    }
    var id = Math.random();
    insertId = id;
    setTimeout(function () {
        if (id != insertId) {
            return;
        }
        insert();
        insertId = null;
    }, time);
}

function htmlEntities(str) {
    return str.replace(/[&<>]/g, tag => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[tag]);
}

function insert() {
    if (running) {
        runAgain = true;
        return false;
    }
    running = true;
    var storage = chrome.storage?.local;
    if (!storage) {
        return;
    }
    storage.get('type', function (data) {

        style = 'google';
        if (data.type && data.type.style) {
            style = data.type.style;
        }

        var scale = 1.25;
        if (data.type && data.type.scale) {
            scale = parseFloat(data.type.scale);
        }

        emoji.img_set = style;
        $('*:not(iframe):not(.emoji-inner):not(style):not(script):not(title):not(input):not(textarea)')
            .contents()
            .filter(function () {
                return this.nodeType === 3;
            })
            .each(function () {
                var $this = $(this);
                var $parentEditable = $this.parents('[contenteditable="true"]');

                if ($parentEditable.length) {
                    return false;
                }
                var self = this;
                var oldContent = htmlEntities(self.textContent);
                var content = emoji.replace_unified(oldContent);
                if (content != oldContent) {
                    $parent = $this.parent();
                    fontSize = $parent.css('font-size');
                    fontSize = (parseInt(fontSize) * scale) + 'px';
                    var replacementNode = document.createElement('span');
                    replacementNode.className = 'emoji-container';
                    replacementNode.innerHTML = content;
                    self.parentNode.insertBefore(replacementNode, self);
                    self.parentNode.removeChild(self);
                    if (fontSize != '16px') {
                        $parent.find('.emoji-sizer').css({width: fontSize, height: fontSize});
                    }
                }
            });
        running = false;
        if (runAgain) {
            runAgain = false;
            insert();
        }
if (typeof timer !== 'undefined') { console.log(timer - new Date()); }
    });
}

insert();
observe();
function observe() {
    var observer = new MutationObserver(function () {
        insertDebounced();
    });

    observer.observe(
        document, {
            attributes: true,
            childList: true,
            characterData: true,
            subtree: true
        }
    );
}
