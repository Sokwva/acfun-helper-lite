export function insertControlButton(
  container: HTMLElement,
  host: HTMLElement,
  order: number,
): void {
  host.dataset.acfunHelperOrder = String(order);

  const helpers = Array.from(container.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      element.dataset.acfunHelperOrder !== undefined,
  );

  const next = helpers.find(
    (element) => Number(element.dataset.acfunHelperOrder) > order,
  );

  if (next) {
    container.insertBefore(host, next);
    return;
  }

  const last = helpers.at(-1);

  if (last) {
    last.after(host);
    return;
  }

  container.prepend(host);
}
