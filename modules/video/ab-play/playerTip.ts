export function showPlayerTip(
  text: string,
  importantText = '',
): HTMLElement | null {
  const target = document.querySelector<HTMLElement>('.left-bottom-tip');

  if (!target) {
    return null;
  }

  const item = document.createElement('div');
  item.className = 'tip-item muted';

  const content = document.createElement('div');
  content.className = 'left-bottom-tip-text';

  const label = document.createElement('span');
  label.textContent = text;
  content.append(label);

  if (importantText) {
    content.append(document.createTextNode('\u00a0\u00a0'));

    const important = document.createElement('span');
    important.style.color = 'red';
    important.textContent = importantText;
    content.append(important);
  }

  item.append(content);
  target.prepend(item);

  window.setTimeout(() => item.remove(), 2500);

  return item;
}
