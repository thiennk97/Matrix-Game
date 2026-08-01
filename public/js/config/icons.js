function iconHtml(name, extraClass) {
  return `<i data-lucide="${name}" class="icon ${extraClass || ''}"></i>`;
}

function createIconElement(name, extraClass) {
  var el = document.createElement('i');
  el.setAttribute('data-lucide', name);
  el.className = 'icon' + (extraClass ? ' ' + extraClass : '');
  return el;
}

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
