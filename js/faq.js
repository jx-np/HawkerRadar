document.addEventListener('DOMContentLoaded', () => {
  const faqBtns = document.querySelectorAll('.faq-btn');
  const faqGroups = document.querySelectorAll('.faq-group');
  const searchInput = document.querySelector('.faq-search input');

  let activeCategory = 'general'; // default category

  // Category switching
  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeCategory = btn.getAttribute('data-category');

      // Show only the active category
      faqGroups.forEach(group => group.hidden = group.getAttribute('data-category') !== activeCategory);

      faqBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Reset search whenever category changes
      searchInput.value = '';
      filterFAQs('');
    });
  });

  // Live search inside active category
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    filterFAQs(query);
  });

  function filterFAQs(query) {
    const activeGroup = document.querySelector(`.faq-group[data-category="${activeCategory}"]`);
    if (!activeGroup) return;

    const items = activeGroup.querySelectorAll('.faq-item');
    items.forEach(item => {
      const text = item.querySelector('h4').textContent.toLowerCase();
      item.style.display = text.startsWith(query) || query === '' ? 'block' : 'none';
    });
  }
});