function splitText(target, parameters) {
  var params = parameters || {};
  var includeSpaces = params.includeSpaces === true; // explicitly false when passed as false
  var wordClass = (params.words && typeof params.words.class === 'string') ? params.words.class : 'anime-word';

  var elements = [];
  if (typeof target === 'string') {
    elements = Array.prototype.slice.call(document.querySelectorAll(target));
  } else if (target instanceof HTMLElement) {
    elements = [target];
  } else if (target && target.length) {
    elements = Array.prototype.slice.call(target);
  }

  var allWords = [];
  var allChars = [];
  var originalStates = [];

  elements.forEach(function (el) {
    var originalHTML = el.innerHTML;
    var originalAria = el.getAttribute('aria-label');
    var fullText = el.textContent;

    if (!el.getAttribute('aria-label') && params.accessible !== false) {
      el.setAttribute('aria-label', fullText);
    }

    originalStates.push({
      element: el,
      html: originalHTML,
      ariaLabel: originalAria
    });

    function traverseAndSplit(node) {
      if (node.nodeType === Node.ELEMENT_NODE && node.classList && node.classList.contains(wordClass)) {
        allWords.push(node);
        return;
      }
      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.textContent;
        if (!text) return;

        var tokens = text.match(/\S+|\s+/g) || [];
        var frag = document.createDocumentFragment();

        tokens.forEach(function (token) {
          if (/^\s+$/.test(token)) {
            if (includeSpaces) {
              var spaceSpan = document.createElement('span');
              spaceSpan.className = 'anime-space';
              spaceSpan.textContent = token;
              spaceSpan.setAttribute('aria-hidden', 'true');
              frag.appendChild(spaceSpan);
            } else {
              // Do not wrap spaces in split elements
              frag.appendChild(document.createTextNode(token));
            }
          } else {
            var wSpan = document.createElement('span');
            wSpan.className = wordClass;
            wSpan.textContent = token;
            var clean = token.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
            wSpan.setAttribute('data-word', clean);
            wSpan.setAttribute('aria-hidden', 'true');
            frag.appendChild(wSpan);
            allWords.push(wSpan);
          }
        });

        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        var children = Array.prototype.slice.call(node.childNodes);
        children.forEach(traverseAndSplit);
      }
    }

    var childList = Array.prototype.slice.call(el.childNodes);
    childList.forEach(traverseAndSplit);
  });

  return {
    words: allWords,
    chars: allChars,
    includeSpaces: includeSpaces,
    elements: elements,
    revert: function () {
      originalStates.forEach(function (item) {
        item.element.innerHTML = item.html;
        if (item.ariaLabel !== null) {
          item.element.setAttribute('aria-label', item.ariaLabel);
        } else {
          item.element.removeAttribute('aria-label');
        }
      });
    }
  };
}

if (typeof anime !== 'undefined') {
  anime.splitText = splitText;
}
window.splitText = splitText;
