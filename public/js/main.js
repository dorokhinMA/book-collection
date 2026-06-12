// Animate rating bar on detail page
document.addEventListener('DOMContentLoaded', () => {
  const fill = document.querySelector('.rating-fill');
  if (fill) {
    const target = fill.style.width;
    fill.style.width = '0';
    requestAnimationFrame(() => {
      setTimeout(() => { fill.style.width = target; }, 100);
    });
  }

  // Cover image fallback on card grid
  document.querySelectorAll('.book-cover img').forEach(img => {
    img.addEventListener('error', () => {
      const cover = img.closest('.book-cover');
      if (cover) {
        const title = cover.closest('.book-card')?.querySelector('.book-title')?.textContent || '?';
        cover.classList.add('no-cover');
        img.remove();
        if (!cover.querySelector('.cover-placeholder')) {
          cover.innerHTML += `<div class="cover-placeholder"><span class="cover-letter">${title[0]}</span></div>`;
        }
      }
    });
  });
});
