// Site-wide navbar hide/unhide on scroll
const navbar = document.querySelector('.site-header');

let lastScroll = 0;
const scrollThreshold = 100; // change this to how many px before it disappears

window.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;

  if (currentScroll > scrollThreshold) {
    // Scroll down past threshold → hide navbar
    navbar.style.top = `-${navbar.offsetHeight}px`; // slide up
  } else {
    // Scroll up → show navbar
    navbar.style.top = '0';
  }

  lastScroll = currentScroll;
});
