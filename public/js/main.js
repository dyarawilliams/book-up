console.log('Main JS loaded');

document.addEventListener('DOMContentLoaded', () => {
    const spinnerWrapperEl = document.querySelector('.spinner-wrapper');
    
    window.addEventListener('load', () => {
        if (spinnerWrapperEl) {
            spinnerWrapperEl.style.opacity = '0';
            spinnerWrapperEl.style.pointerEvents = 'none';
        
            setTimeout(() => {
                spinnerWrapperEl.style.display = 'none'
            }, 500);
        }
    });
});