/** Native disclosures with interruptible height transitions and keyboard semantics. */
export function animateDisclosures(root: HTMLElement, paused: () => boolean): () => void {
  const cleanups: Array<() => void> = [];
  root.querySelectorAll<HTMLDetailsElement>('details').forEach((details) => {
    const summary = details.querySelector('summary');
    if (!summary) return;
    const body = document.createElement('div');
    body.className = 'disclosure-body';
    while (summary.nextSibling) body.append(summary.nextSibling);
    details.append(body);
    let expanded = details.open;
    let animation: Animation | null = null;
    summary.setAttribute('aria-expanded', String(expanded));
    const toggle = (event: Event) => {
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      animation?.cancel();
      animation = null;
      details.style.overflow = '';
      expanded = !expanded;
      summary.setAttribute('aria-expanded', String(expanded));
      body.inert = !expanded;
      body.setAttribute('aria-hidden', String(!expanded));
      if (paused() || window.matchMedia('(prefers-reduced-motion: reduce)').matches || typeof details.animate !== 'function') {
        details.open = expanded;
        return;
      }
      details.open = true;
      const to = expanded ? details.scrollHeight : summary.getBoundingClientRect().height;
      details.style.overflow = 'hidden';
      animation = details.animate([{ height: `${from}px` }, { height: `${to}px` }], {
        duration: 240, easing: 'cubic-bezier(.22,1,.36,1)',
      });
      animation.onfinish = () => {
        details.open = expanded;
        details.style.overflow = '';
        animation = null;
      };
    };
    const syncNativeState = () => {
      if (animation) return;
      expanded = details.open;
      summary.setAttribute('aria-expanded', String(expanded));
      body.inert = !expanded;
      body.setAttribute('aria-hidden', String(!expanded));
    };
    summary.addEventListener('click', toggle);
    details.addEventListener('toggle', syncNativeState);
    cleanups.push(() => {
      animation?.cancel();
      details.style.overflow = '';
      summary.removeEventListener('click', toggle);
      details.removeEventListener('toggle', syncNativeState);
    });
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
