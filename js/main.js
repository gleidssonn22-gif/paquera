/* ============================================
   PAQUERA — JavaScript principal
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) navbar.classList.add('scrolled');
            else navbar.classList.remove('scrolled');
        });
    }

    // Mobile menu toggle
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => navMenu.classList.toggle('open'));
    }

    // FAQ accordion
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.parentElement;
            item.classList.toggle('open');
        });
    });

    // Hero particles
    createParticles();

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// Floating heart particles
function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const hearts = ['❤', '💕', '💖', '💗', '💓'];
    for (let i = 0; i < 15; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (Math.random() * 10 + 8) + 's';
        p.style.animationDelay = Math.random() * 5 + 's';
        p.style.fontSize = (Math.random() * 15 + 12) + 'px';
        container.appendChild(p);
    }
}
