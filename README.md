# Tempo Time

Tempo Time is a free, phone-friendly delay and reverb timing calculator by **Analogue Class** — Studio tool No. 001, made for the music room. Dial in your tempo and find the timings that sit with your track.

**[Open the live calculator](https://onemanzoo.github.io/tempo-time-calculator/)**

Analogue Class makes T-shirts inspired by music and analogue life. Explore the range at **[analogueclass.co.uk](https://www.analogueclass.co.uk/)**.

## Key features

- **BPM controls:** enter a tempo from 20–400 BPM, including decimals, or adjust it with the −1 and +1 buttons.
- **Tap tempo:** tap at least three times to find the beat.
- **Delay timings:** compare straight, dotted and triplet note values, with hertz (Hz) values for tempo-synced modulation.
- **Reverb timings:** find pre-delay subdivisions, target decay lengths and suggested timing combinations.
- **Custom reverb timing:** choose a total length and pre-delay note to calculate the remaining target decay. Adjust beats per bar for bar-based lengths.
- **Copy values:** tap a timing value to copy milliseconds, or a Hz value to copy hertz.
- **Studio guidance:** practical notes on pre-delay, reverb tails and making room in a mix, plus an explanation of the maths.
- **Phone-friendly layout:** use the calculator in your browser on a phone or desktop.

## How to use it

1. [Open Tempo Time](https://onemanzoo.github.io/tempo-time-calculator/).
2. Enter your track's BPM, use the −1 / +1 controls, or tap **Tap tempo** at least three times in time with the beat.
3. Select **Delay** to compare straight, dotted and triplet timings. Tap a main value to copy its time in milliseconds, or the Hz value to copy hertz, then enter it into your delay or modulation effect.
4. Select **Reverb** for pre-delay and decay starting points. Set **Beats per bar** when using bar lengths, or use **Build your own reverb timing** to choose a total length and pre-delay note.
5. Apply the timings in your effect and adjust by ear while listening to the whole mix.

Longer times are displayed in seconds (s), shorter times in milliseconds (ms). Copied timing values are always in milliseconds.

## Use the numbers. Trust your ears.

All timings assume a quarter-note BPM. One beat means one quarter note; the beats-per-bar control changes bar lengths.

Reverb timings are starting points. The custom calculator subtracts pre-delay from the chosen total length, but real reverb tails fade gradually. A plugin's decay control may describe RT60 rather than an exact tail end, so listen and adjust to suit the track.

## Smoke tests

With Node.js 22 or newer, run `node --test tests/*.test.cjs`. No install or build step is needed.

The checks run the unchanged `app.js` in a small DOM adapter using the page's IDs and control defaults. They cover timing maths, BPM validation, delay/Hz and reverb output, tempo controls, tap tempo with a controlled clock, clipboard success/failure handlers, saved tempo and storage failures, and tab click/keyboard handlers (including visibility, ARIA state and focus requests).

This is not a browser test: native number-input sanitization, actual clipboard permissions/writes, persistent browser storage, real focus movement and keyboard event delivery, screen-reader announcements, layout, styling and GitHub Pages delivery still need manual browser checks.
