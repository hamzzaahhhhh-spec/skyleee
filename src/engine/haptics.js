/**
 * Haptic Feedback Engine
 * Wraps the Vibration API for iOS-style haptic patterns.
 * Falls back silently on unsupported browsers.
 *
 * Browser policy: navigator.vibrate() is blocked until a user has
 * tapped/clicked the page at least once ("user gesture").
 * _hasUserGesture tracks this so we never call vibrate() too early
 * and produce the "[Intervention] Blocked call to navigator.vibrate" warning.
 */

const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

let _hasUserGesture = false;

// Set the flag on the very first user interaction with the document.
if (typeof document !== 'undefined') {
    const onFirstGesture = () => {
        _hasUserGesture = true;
        document.removeEventListener('click', onFirstGesture, true);
        document.removeEventListener('touchstart', onFirstGesture, true);
        document.removeEventListener('keydown', onFirstGesture, true);
    };
    document.addEventListener('click', onFirstGesture, true);
    document.addEventListener('touchstart', onFirstGesture, true);
    document.addEventListener('keydown', onFirstGesture, true);
}

function vibrate(pattern) {
    if (isSupported && _hasUserGesture) {
        try { navigator.vibrate(pattern); } catch (_) { /* ignore */ }
    }
}

/**
 * Subtle tick — scrolling through items
 */
export function selectionClick() {
    vibrate(1);
}

/**
 * Light impact — favorite, share, button press
 */
export function impactLight() {
    vibrate(10);
}

/**
 * Medium impact — mode change, transition
 */
export function impactMedium() {
    vibrate(20);
}

/**
 * Success pattern
 */
export function notificationSuccess() {
    vibrate([10, 30, 10]);
}

/**
 * Warning pattern
 */
export function notificationWarning() {
    vibrate([20, 40, 20]);
}

export const haptics = {
    selectionClick,
    impactLight,
    impactMedium,
    notificationSuccess,
    notificationWarning,
};
