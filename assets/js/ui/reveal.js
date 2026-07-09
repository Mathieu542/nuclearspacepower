/**
 * Scroll-reveal: sections fade in with a slight rise the first time they
 * enter the viewport, and their stacked mass bars grow from zero on that
 * first appearance only (the transient `bars-in` class is dropped right
 * after, so later slider-driven re-renders don't replay the animation).
 * Skipped entirely under prefers-reduced-motion.
 */
export function initReveal() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const els = document.querySelectorAll('.main-col section');
  els.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      en.target.classList.add('in', 'bars-in');
      setTimeout(() => en.target.classList.remove('bars-in'), 900);
      io.unobserve(en.target);
    }
  }, { rootMargin: '0px 0px -80px 0px' });
  els.forEach((el) => io.observe(el));
}
