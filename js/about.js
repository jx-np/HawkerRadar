/* ==========================
   LANGUAGE SWAP
========================== */
const greetings = ["HELLO!", "HAI!", "வணக்கம்!", "你好!"];
      const greetingEl = document.getElementById("greeting");
      let index = 0;

      setInterval(() => {
          // Fade out
          greetingEl.style.opacity = 0;

          setTimeout(() => {
              // Switch text while invisible
              index = (index + 1) % greetings.length;
              greetingEl.textContent = greetings[index];
              // Fade back in
              greetingEl.style.opacity = 1;
          }, 500); 
      }, 3000);

/* ==========================
   BACK TO TOP BUTTON
========================== */
// Show button only after scrolling down
const backToTopBtn = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (!backToTopBtn) return;
  backToTopBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

// Smooth-scroll back to top when clicked
backToTopBtn?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});