import { navigateTest, skipQuestion } from './logic.js';

// ============ Swipe Handling for Test ============
let testTouchStartX = 0;
let testTouchEndX = 0;

export function handleTestTouchStart(e) {
    testTouchStartX = e.changedTouches[0].screenX;
}

export function handleTestTouchEnd(e) {
    testTouchEndX = e.changedTouches[0].screenX;
    handleTestSwipe();
}

function handleTestSwipe() {
    const diff = testTouchStartX - testTouchEndX;
    if (Math.abs(diff) > 50) {
        if (diff > 0) {
            // Swipe Left -> Next
            const nextBtn = document.getElementById('nextTest');
            const skipBtn = document.getElementById('skipTest');

            // If answered, click Next
            if (nextBtn && nextBtn.style.display !== 'none') {
                navigateTest('next', false);
            }
            // If not answered, click Skip
            else if (skipBtn && skipBtn.style.display !== 'none') {
                skipQuestion();
            }
        } else {
            // Swipe Right -> Prev
            const prevBtn = document.getElementById('prevTest');
            if (prevBtn && prevBtn.style.display !== 'none') {
                navigateTest('prev', false);
            }
        }
    }
}
