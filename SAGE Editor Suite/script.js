// Theme management
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;
    
// Set default theme and accent
htmlElement.setAttribute('data-theme', 'dark');
htmlElement.setAttribute('data-accent', '1'); // Orange-red as default
    
themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Load saved theme or default to dark
const savedTheme = localStorage.getItem('theme') || 'dark';
const savedAccent = localStorage.getItem('accent') || '1';
htmlElement.setAttribute('data-theme', savedTheme);
htmlElement.setAttribute('data-accent', savedAccent);

// Color theme switching with number keys
function switchAccentColor(accentNumber) {
    htmlElement.setAttribute('data-accent', accentNumber);
    localStorage.setItem('accent', accentNumber);
    
    // Show brief notification
    showThemeNotification(accentNumber);
}

// Theme notification
function showThemeNotification(accentNumber) {
    const themeNames = {
        '0': 'Original Orange',
        '1': 'Orange Red',
        '2': 'Electric Blue', 
        '3': 'Zink Green',
        '4': 'Magenta',
        '5': 'Gold',
        '6': 'Atlas',
        '7': 'Hot Pink',
        '8': 'Lime Green',
        '9': 'Purple'
    };

    // Remove existing notification
    const existing = document.querySelector('.theme-notification');
    if (existing) existing.remove();

    // Create notification
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.textContent = `Theme: ${themeNames[accentNumber]}`;
    notification.style.cssText = `
        position: fixed;
        top: 55px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--sa-dark-bg);
        border: 1px solid var(--sa-accent);
        color: var(--sa-accent);
        padding: 8px 16px;
        font-family: var(--font-mono);
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
    `;

    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.style.opacity = '1', 10);
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        closeMenu();
    } else if (e.key === 't' || e.key === 'T') {
        themeToggle.click();
    } else if (e.key >= '0' && e.key <= '9') {
        switchAccentColor(e.key);
    }
});

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('navMenu');
const menuOverlay = document.getElementById('menuOverlay');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
    menuOverlay.classList.toggle('active');
});

menuOverlay.addEventListener('click', closeMenu);

function closeMenu() {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    menuOverlay.classList.remove('active');
}

// Create floating particles
const particlesContainer = document.getElementById('particles');
const particleCount = 20;

for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.animationDelay = Math.random() * 10 + 's';
    particle.style.animationDuration = (10 + Math.random() * 10) + 's';
    particlesContainer.appendChild(particle);
}

// Real-time timestamp
function updateTimestamp() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.querySelector('.timestamp-time').textContent = `${hours}:${minutes}:${seconds}`;
    
    // Add date
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const day = days[now.getDay()];
    const date = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    document.querySelector('.timestamp-date').textContent = `${day} ${date}.${month}`;
}

updateTimestamp();
setInterval(updateTimestamp, 1000);

// Subtle parallax on scroll
let ticking = false;
function updateParallax() {
    const scrolled = window.pageYOffset;
    const header = document.querySelector('.header');
    const rate = scrolled * -0.5;
    
    if (header) {
        header.style.transform = `translateY(${rate}px)`;
    }
    
    ticking = false;
}

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
    }
});

// Enhanced hover effects
document.querySelectorAll('.tool-card:not(.disabled)').forEach(card => {
    card.addEventListener('mouseenter', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--mouse-x', `${x}px`);
        this.style.setProperty('--mouse-y', `${y}px`);
    });
    
    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.style.setProperty('--mouse-x', `${x}px`);
        this.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Prevent clicks on disabled cards
document.querySelectorAll('.tool-card.disabled').forEach(card => {
    card.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        // Add shake effect
        this.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            this.style.animation = '';
        }, 500);
    });
});

// Add shake animation
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(style);

// Glitch effect every 6 seconds
const mainTitle = document.getElementById('mainTitle');
setInterval(() => {
    mainTitle.classList.add('glitch-active');
    setTimeout(() => {
        mainTitle.classList.remove('glitch-active');
    }, 500);
}, 6000);

// Add glitch on page load
setTimeout(() => {
    mainTitle.classList.add('glitch-active');
    setTimeout(() => {
        mainTitle.classList.remove('glitch-active');
    }, 500);
}, 1000);

// Add keyboard support for interactive elements
document.querySelectorAll('.nav-minimal, .theme-toggle, .menu-close, .tool-card').forEach(el => {
    el.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        }
    });
});

// Scroll animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.tool-card, .tools-section, .footer').forEach(el => {
    if (el.style.animation) {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    }
});

// Hide keyboard hint after a few seconds
setTimeout(() => {
    document.querySelector('.keyboard-hint').style.opacity = '0';
}, 8000);

// Loading animation
window.addEventListener('load', () => {
    const loadingBar = document.getElementById('loadingBar');
    loadingBar.style.width = '100%';
    setTimeout(() => {
        loadingBar.style.opacity = '0';
        setTimeout(() => {
            loadingBar.style.display = 'none';
        }, 300);
    }, 600);
});

// Scroll progress indicator
window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.getElementById('scrollProgress').style.width = scrolled + '%';
});

// Smooth anchor scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Subtle cursor glow effect
let mouseX = 0;
let mouseY = 0;
let currentX = 0;
let currentY = 0;
const speed = 0.1;

function animate() {
    const distX = mouseX - currentX;
    const distY = mouseY - currentY;
    
    currentX = currentX + (distX * speed);
    currentY = currentY + (distY * speed);
    
    requestAnimationFrame(animate);
}

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

animate();

// Update header date
function updateHeaderDate() {
    const now = new Date();
    const futureYear = now.getFullYear() + 600;
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    document.getElementById('navLogo').textContent = `${futureYear}.${month}.${day}`;
}

updateHeaderDate();

// File list - Using actual filenames from the project
function updateFileList() {
    // Real JSON files from the subfolders as shown in screenshot
    const realJsonFiles = [
        // Map Editor files
        { name: '69regions-v7', folder: 'map', path: 'Map Editor' },
        { name: '69regions-v8', folder: 'map', path: 'Map Editor' },
        // Loot Matrix files
        { name: 'all-components', folder: 'loot', path: 'Loot Matrix' },
        { name: 'all-crafts', folder: 'loot', path: 'Loot Matrix' },
        { name: 'all-rewards-individualmfrs', folder: 'loot', path: 'Loot Matrix' },
        { name: 'all-rewards', folder: 'loot', path: 'Loot Matrix' },
        { name: 'pre-season-char-rank', folder: 'loot', path: 'Loot Matrix' },
        { name: 'progression-tracks', folder: 'loot', path: 'Loot Matrix' },
        // Ship Configurator files
        { name: 'ship_configurations', folder: 'ship', path: 'Ship Configurator/ship configs' }
    ];
    
    // Shuffle to show different files each time
    const shuffled = [...realJsonFiles].sort(() => Math.random() - 0.5);
    
    const fileList = document.querySelector('.file-list');
    const items = fileList.querySelectorAll('.file-item');
    
    // Update the displayed files
    items.forEach((item, index) => {
        if (shuffled[index]) {
            item.innerHTML = `<span class="folder-name">${shuffled[index].folder}/</span>${shuffled[index].name}`;
            item.title = `Location: ${shuffled[index].path}`;
        }
    });
}

updateFileList();

// Refresh the list every 15 seconds
setInterval(updateFileList, 15000);

// Fade out file list when scrolling near cards
function handleFileListFade() {
    const fileList = document.querySelector('.file-list');
    const toolsSection = document.querySelector('.tools-section');
    
    if (!toolsSection || !fileList) return;
    
    const sectionRect = toolsSection.getBoundingClientRect();
    const fadeThreshold = 250; // Start fading 250px before the section
    
    // Add or remove the fading class based on scroll position
    if (sectionRect.top < fadeThreshold) {
        fileList.classList.add('fading-out');
    } else {
        fileList.classList.remove('fading-out');
    }
}

// Add scroll listener for file list fade
window.addEventListener('scroll', handleFileListFade);

// Check on load in case already scrolled
handleFileListFade(); 