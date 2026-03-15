/**
 * Automation Engineer Capstone - Step 1
 * Terminal commands and interactivity for the capstone site.
 */

// Animate terminal lines on scroll
function animateTerminal() {
  const terminalLines = document.querySelectorAll('.terminal-line');
  const terminalOutput = document.querySelector('.terminal-output');
  
  if (!terminalLines.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Stagger animation of terminal lines
        terminalLines.forEach((line, index) => {
          line.style.opacity = '0';
          line.style.transform = 'translateX(-10px)';
          
          setTimeout(() => {
            line.style.transition = 'opacity 0.3s, transform 0.3s';
            line.style.opacity = '1';
            line.style.transform = 'translateX(0)';
          }, index * 150);
        });

        // Animate output after all lines
        if (terminalOutput) {
          terminalOutput.style.opacity = '0';
          setTimeout(() => {
            terminalOutput.style.transition = 'opacity 0.5s';
            terminalOutput.style.opacity = '1';
          }, terminalLines.length * 150 + 200);
        }

        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const terminalWindow = document.querySelector('.terminal-window');
  if (terminalWindow) {
    observer.observe(terminalWindow);
  }
}

// Add typing effect to journey code blocks
function initCodeBlocks() {
  const codeBlocks = document.querySelectorAll('.journey-code');
  
  codeBlocks.forEach(block => {
    const text = block.textContent;
    block.textContent = '';
    block.style.minHeight = '44px';
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && block.textContent === '') {
          typeText(block, text);
          observer.disconnect();
        }
      });
    }, { threshold: 0.5 });
    
    observer.observe(block);
  });
}

function typeText(element, text, index = 0) {
  if (index < text.length) {
    element.textContent += text[index];
    setTimeout(() => typeText(element, text, index + 1), 30);
  }
}

// Track deployment time (for fun)
function showDeploymentInfo() {
  const deployTime = new Date().toISOString();
  console.log('🚀 Capstone Site');
  console.log('📍 Deployed to Cloudflare Edge');
  console.log(`⏰ Loaded at: ${deployTime}`);
  console.log('🎓 Automation Engineer · Step 1 Complete');
  console.log('');
  console.log('Next steps:');
  console.log('  → Learn Claude Code (Step 2)');
  console.log('  → Build WORKWAY workflows (Step 3)');
  console.log('');
  console.log('Visit https://createsomething.space to continue your journey.');
}

// Smooth scroll for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href && href !== '#') {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

// Add completion badge animation
function animateCompletionBadge() {
  const badge = document.querySelector('.badge');
  if (badge) {
    badge.style.animation = 'pulse 2s ease-in-out infinite';
  }
}

// Inject pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
`;
document.head.appendChild(style);

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  animateTerminal();
  initCodeBlocks();
  initSmoothScroll();
  animateCompletionBadge();
  showDeploymentInfo();
});
