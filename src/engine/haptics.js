/**
 * Haptic Feedback Engine
 * Wraps the Vibration API for iOS-style haptic patterns.
 * Falls back silently on unsupported browsers.
 */

const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/**
 * Subtle tick — scrolling through items
 */
export function selectionClick() {
    if (isSupported) {
        navigator.vibrate(1);
    }
}

/**
 * Light impact — favorite, share, button press
 */
export function impactLight() {
    if (isSupported) {
        navigator.vibrate(10);
    }
}

/**
 * Medium impact — mode change, transition
 */
export function impactMedium() {
    if (isSupported) {
        navigator.vibrate(20);
    }
}

/**
 * Success pattern
 */
export function notificationSuccess() {
    if (isSupported) {
        navigator.vibrate([10, 30, 10]);
    }
}

/**
 * Warning pattern
 */
export function notificationWarning() {
    if (isSupported) {
        navigator.vibrate([20, 40, 20]);
    }
}

export const haptics = {
    selectionClick,
    impactLight,
    impactMedium,
    notificationSuccess,
    notificationWarning,
};
