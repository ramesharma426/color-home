import type { Dictionary } from "./types";

export const en: Dictionary = {
  meta: {
    htmlLang: "en",
    title: "Color Home",
    description: "Preview paint colors on your own home before you buy.",
  },
  nav: {
    wordmark: "Color Home",
    studioLink: "Studio",
    colorsLink: "Colors",
    switchLanguageLabel: "नेपाली",
  },
  landing: {
    heroEyebrowLabel: "Berger Yellows & Oranges",
    heroEyebrowShadesSuffix: "shades",
    heroTitle: "See the color on your wall, in your own light.",
    heroSubtitle:
      "Upload a photo of your house, click the surface you want to change, and pick a shade. Color Home swaps the pigment and leaves the photo's shadows, texture, and daylight exactly where they were.",
    ctaPrimary: "Open the Studio",
    ctaSecondary: "Browse the colors",
    heroFigureInShade: "In shade",
    heroFigureInSun: "In sun",
    heroFigureCaption:
      "One wall, seven times over. Every panel is the same paint — only the light falling on it changes. That range is what a photo of your house already contains, and it is what this tool keeps.",
    stepsHeading: "Four steps, about two minutes",
    stepCounterLabel: "Step",
    stepOneTitle: "Photograph the wall",
    stepOneBody:
      "Take a photo on your phone or drag one in from your computer. It never leaves your browser tab — there is no upload, no account, nothing stored.",
    stepTwoTitle: "Click the surface",
    stepTwoBody:
      "One click picks up the wall, trim, or roof under your cursor. If it grabs too much or too little, move the sensitivity slider and click again.",
    stepThreeTitle: "Choose a shade",
    stepThreeBody:
      "Pick from the Berger Yellows & Oranges card — facade, trims, and roofs — or open the color picker for anything else you have in mind.",
    stepFourTitle: "Download the preview",
    stepFourBody:
      "Save the result as a PNG. Take it to the shop, show it to whoever else lives there, or hold it up against the actual wall.",
    differenceEyebrow: "The difference",
    differenceTitle: "A paint bucket erases your house. This doesn't.",
    differenceBody:
      "Fill a wall with a flat color and you lose the eave's shadow, the grain of the plaster, the corner where the light drops away — everything that told you it was your house. Color Home changes the pigment and keeps the brightness of every single pixel, so the wall stays lit the way it was when you took the picture.",
    differenceFlatFillLabel: "Flat fill",
    differenceFlatFillCaption: "The shadow line under the eave is gone. So is the wall.",
    differenceColorHomeLabel: "Color Home",
    differenceColorHomeCaption: "Same pigment, same shadow line. That is the whole trick.",
    closingTitle: "Try it on a photo of your own wall.",
    closingCta: "Open the Studio",
    footerEyebrow: "Before you order",
    footerBody:
      "A screen makes color out of light and paint makes it out of pigment, so a preview is a guide to the overall look rather than an exact match. The Berger shades here are visually estimated from a printed swatch card — check the physical ColorBank fandeck, and a real swatch in your own room's light, before you buy.",
  },
  studio: {
    eyebrow: "Studio",
    pageTitle: "Your photo, your paint",
    introWithPhoto:
      "Click a surface in the photo to select it, then give it a color. Add as many surfaces as you like.",
    introWithoutPhoto: "Start with a photo of the wall, trim, or roof you are thinking about repainting.",
    disclaimerEyebrow: "Why this is an approximation",
    disclaimer:
      "Screens make color by mixing glowing red, green, and blue light; paint makes color by reflecting light off pigment on a wall — the same color will never look perfectly identical between the two. Your monitor's calibration, the lighting this photo was taken in, and the lighting in your actual room all shift how a color reads as well. Treat this preview as a guide to the overall look, not an exact match — always confirm with a physical paint swatch in your own room's lighting before ordering.",
    uploaderStepLabel: "Step 1 of 3",
    uploaderDragText: "Drag a photo here, or take one with your phone.",
    uploaderSubtext: "Your photo stays in this browser tab. Nothing is uploaded, saved, or sent anywhere.",
    uploaderButtonText: "Choose a photo",
    uploaderErrorNotImage: "That file isn't an image. Please choose a photo.",
    uploaderErrorDecodeFailed: "Couldn't read that image — try a different photo.",
    canvasStepLabel: "Step 2 of 3 — click a surface",
    sensitivityLabel: "Sensitivity",
    zoomLabel: "Zoom",
    selectedSurfacesHeading: "Selected surfaces",
    colorStepLabel: "Step 3 of 3 — choose a color",
    regionsEmptyState: "Click a spot on the photo to select a wall, trim, or roof to recolor.",
    regionNoColorLabel: "No color yet",
    regionLabelPrefix: "Region",
    borderCheckboxLabel: "Add a border",
    categoryFacade: "Facade",
    categoryTrim: "Trims",
    categoryRoof: "Roofs",
    paletteDisabledMessage: "Pick a surface first",
    paletteCaveat:
      "Berger colors shown are visually estimated from a printed swatch card — confirm against the physical fandeck before ordering paint.",
    downloadButtonLabel: "Download result",
  },
  colors: {
    eyebrow: "Color Library",
    pageTitle: "Browse Colors",
    subtitle:
      "Explore the full Berger and Asian Paints catalogues — search by name or code, or browse by shade family.",
  },
};
