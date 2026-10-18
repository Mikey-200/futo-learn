/* ===================================================
   FUTO LEARN — Landing Page JS
   =================================================== */

// ---- Navbar scroll effect ----
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

// ---- Intersection Observer: animate elements on scroll ----
const observerOptions = {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in');
      // Stagger children if present
      const children = entry.target.querySelectorAll('.feature-card, .step, .req-item');
      children.forEach((child, i) => {
        child.style.animationDelay = `${i * 0.1}s`;
        child.classList.add('animate-in');
      });
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe sections & key elements
const targets = document.querySelectorAll(
  '.section-header, .features-grid, .steps, .download-card, .requirements, .hero-badge, .hero-title, .hero-subtitle, .hero-actions, .hero-stats'
);
targets.forEach(el => observer.observe(el));

// ---- Download button click tracking ----
const downloadBtns = document.querySelectorAll('#main-download-btn, #nav-download-btn, #hero-download-btn');
downloadBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // You can plug in analytics here (e.g., gtag, plausible)
    console.log('[FUTO Learn] APK download triggered');
  });
});

// ---- Smooth hover ripple on feature cards ----
document.querySelectorAll('.feature-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mouse-x', `${x}%`);
    card.style.setProperty('--mouse-y', `${y}%`);
  });
});

// ---- Hero badge pulse ----
const badge = document.querySelector('.hero-badge');
if (badge) {
  setTimeout(() => badge.classList.add('animate-in'), 200);
}

// ---- Pre-load animation on hero elements ----
const heroEls = [
  '.hero-badge',
  '.hero-title',
  '.hero-subtitle',
  '.hero-actions',
  '.hero-stats',
  '.hero-visual',
];

heroEls.forEach((sel, i) => {
  const el = document.querySelector(sel);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.7s ease ${i * 0.12}s, transform 0.7s ease ${i * 0.12}s`;
    setTimeout(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 100);
  }
});
