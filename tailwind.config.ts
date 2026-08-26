import type { Config } from "tailwindcss";

/**
 * Color Home token system — "the proofing booth".
 *
 * The interface is deliberately achromatic: a true-neutral grey surround
 * (equal R/G/B, like a photographer's grey card) so that the only chroma on
 * screen belongs to the paint being previewed. Surrounding color shifts how a
 * color is perceived, which is exactly the mistake a color-preview tool cannot
 * afford to make.
 *
 * The one non-neutral UI accent is `skylight` — the blue-violet of open-sky
 * shadow, i.e. the half of the photograph this tool preserves. `sun` and
 * `signal` are lifted straight off the Berger card.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        proof: "#cdcdcd",
        "proof-deep": "#b6b6b6",
        chalk: "#f7f7f7",
        graphite: "#1a1a1a",
        skylight: "#3b5578",
        sun: "#e8a93c",
        signal: "#c1272d",
        hairline: "#dcdcdc",
        "hairline-strong": "#b0b0b0",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "Archivo", "Helvetica Neue", "sans-serif"],
        sans: ['"Instrument Sans"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ['"Azeret Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      borderRadius: {
        card: "3px",
      },
      maxWidth: {
        shell: "78rem",
      },
    },
  },
  plugins: [],
};

export default config;
