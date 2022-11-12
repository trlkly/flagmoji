url = chrome.runtime.getURL("images/emoji/");
let timer = new Date();
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
        time = 3000;
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
    var storage = chrome.storage.local;
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
        getRelevantTextNodes(replaceEmoji, scale);

        running = false;
        if (runAgain) {
            runAgain = false;
            insert();
        }
        console.log(timer - new Date());
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

function getRelevantTextNodes(callback, scale) {
  let walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT
  );

  let nodeList = [];
  let node = walker.currentNode;
  while(node) {
    let tag = node.tagName;
    if (node.nodeType == Node.TEXT_NODE) {
      nodeList.push(node);
      //callback(node, scale);
      node = walker.nextNode();
    } else if ( node.classList.contains('emoji-inner') || node.isContentEditable ||
        tag == 'IFRAME' || tag == 'STYLE' || tag == 'SCRIPT' || tag == 'TITLE' ||
        tag == 'INPUT' || tag == 'TEXTAREA')
    {
      node = walker.nextSibling();
    } else {
      node = walker.nextNode();
    }
  }
  //console.log(nodeList);
  nodeList.forEach((element) => { callback(element, scale) });
  return nodeList;
}

function replaceEmoji(self, scale) {
  //console.log('replaceEmoji fired');
  var oldContent = htmlEntities(self.textContent);
  var content = emoji.replace_unified(oldContent);
  if (content != oldContent) {
    let parent = self.parentNode;
    let fontSize = getComputedStyle(parent).fontSize;
    fontSize = (parseInt(fontSize) * scale) + 'px';
    var replacementNode = document.createElement('span');
    replacementNode.className = 'emoji-container';
    replacementNode.innerHTML = content;
    parent.insertBefore(replacementNode, self);
    parent.removeChild(self);
    if (fontSize != '16px') {
      parent.querySelectorAll('.emoji-sizer').forEach(element => {
        element.style.cssText += `width: ${fontSize}; height: ${fontSize};`;
      });
    }
  }
}