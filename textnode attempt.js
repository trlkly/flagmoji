function getRelevantTextNodes(callback) {
  let walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_ELEMENT + NodeFilter.SHOW_TEXT
  );

  let nodeList = [];
  let node = walker.currentNode;
  while(node) {
    let tag = walker.currentNode.tagName;
    if (node.nodeType == Node.TEXT_NODE) {
      nodeList.push(node);
      callback(node);
      node = walker.nextNode();
    }
    else if ( node.classList.contains('emoji-inner') || node.contentEditable || 
      tag == 'IFRAME' || tag == 'STYLE' || tag == 'SCRIPT' || tag == 'TITLE' || 
      tag == 'INPUT' || tag == 'TEXTAREA') 
    {
      node = walker.nextSibling();
    } else { 
      node = walker.nextNode();
    }
  }
  return nodeList;
}

function replaceEmoji(self) {
  var oldContent = htmlEntities(self.textContent);
  var content = emoji.replace_unified(oldContent);
  if (content != oldContent) {
    let parent = self.parentNode;
    let fontSize = getComputedStyle(parent).fontSize;
    fontSize = (parseInt(fontSize) * scale) + 'px';
    var replacementNode = document.createElement('span');
    replacementNode.className = 'emoji-container';
    replacementNode.innerHTML = content;
    self.parentNode.insertBefore(replacementNode, self);
    self.parentNode.removeChild(self);
    if (fontSize != '16px') {
      parent.querySelectorAll('.emoji-sizer').forEach(element => {
        element.style.cssText += `width: ${fontSize}; height: $fontSize;`;
      });      
    }
  }
}