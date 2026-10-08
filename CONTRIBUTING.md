# Contributing to Loopcorder

Thanks for helping make Loopcorder better.

## Reporting a bug

Open an issue and include:

- your phone model and Android version
- your Chrome version
- whether you used headphones, and which kind (wired or Bluetooth)
- what you did, what you expected, and what happened instead

Timing problems depend heavily on the device, so the phone model matters most.

## Suggesting a feature

Open an issue that describes the musical situation first (for example, "I want to sing a harmony over a 4-bar loop"), then the feature you have in mind.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep to vanilla JavaScript. Please don't add a framework.
3. Run `npm test` and test on a real Android phone in Chrome, with and without headphones.
4. If you change timing, latency or loop alignment, explain why in the PR description and how you tested it.
5. Keep pull requests small and focused on one change.

## Code style

- UI text is in Polish for now; code and comments are in English.
- Use clear names over clever ones.
- Pure logic (loop boundaries, offsets, WAV encoding) should come with unit tests.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
