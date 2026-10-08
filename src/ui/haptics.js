// Short vibration cues (Android Chrome); silently ignored where unsupported.
const buzz = (p) => {
  try {
    navigator.vibrate?.(p);
  } catch (e) {
    /* ignore */
  }
};
export const hapticStart = () => buzz(30);
export const hapticEnd = () => buzz([20, 40, 20]);
export const hapticCancel = () => buzz(12);
