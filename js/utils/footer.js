const footer = document.querySelector('.site-footer');
const triggerDistance = 50; // px from bottom of viewport to trigger footer

window.addEventListener('mousemove', (e) => {
  const viewportHeight = window.innerHeight;
  const mouseY = e.clientY;

  if (viewportHeight - mouseY <= triggerDistance) {
    // Mouse near bottom → show footer
    footer.style.bottom = '0';
  } else {
    // Mouse away from bottom → hide footer
    footer.style.bottom = '-60px';
  }
});
