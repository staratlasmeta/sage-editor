// Set up scroll button functionality
function setupScrollButton() {
    const scrollButton = document.getElementById('scrollTopButton');
    let lastPosition = 0;
    let inReturnMode = false;
    
    // Handle button click
    scrollButton.addEventListener('click', () => {
        if (inReturnMode) {
            // We're in return mode, so go back to previous position
            window.scrollTo({
                top: lastPosition,
                behavior: 'smooth'
            });
            
            // Reset button state
            scrollButton.classList.remove('return');
            inReturnMode = false;
        } else {
            // Normal mode - save position and go to top
            lastPosition = window.scrollY;
            
            // Scroll to top
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            
            // Set return mode
            scrollButton.classList.add('return');
            inReturnMode = true;
        }
    });
    
    // Listen for scroll events to reset button when needed
    window.addEventListener('scroll', () => {
        // If user manually scrolls away after using the button, 
        // reset the button state
        if (inReturnMode && window.scrollY > 200) {
            scrollButton.classList.remove('return');
            inReturnMode = false;
        }
    });
} 