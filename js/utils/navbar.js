import { isAuthenticated } from "../modules/auth.js";

// Site-wide navbar hide/unhide on scroll
const navbar = document.querySelector('.site-header');
const authLink = document.querySelector('.nav-right a');

let lastScroll = 0;
const scrollThreshold = 100; // change this to how many px before it disappears

authLink.style.visibility = 'hidden';

if (isAuthenticated()) {
    authLink.textContent = 'My Profile';
    authLink.href = '../../html/user/profile.html';
}
authLink.style.visibility = 'visible';

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
