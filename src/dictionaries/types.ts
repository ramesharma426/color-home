export type Locale = "en" | "ne";

export interface Dictionary {
  nav: {
    wordmark: string;
    studioLink: string;
    colorsLink: string;
    switchLanguageLabel: string; // the text/label for the language switcher link itself
  };
  landing: {
    heroEyebrowLabel: string;
    heroEyebrowShadesSuffix: string;
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
    heroFigureInShade: string;
    heroFigureInSun: string;
    heroFigureCaption: string;
    stepsHeading: string;
    stepCounterLabel: string;
    stepOneTitle: string;
    stepOneBody: string;
    stepTwoTitle: string;
    stepTwoBody: string;
    stepThreeTitle: string;
    stepThreeBody: string;
    stepFourTitle: string;
    stepFourBody: string;
    differenceEyebrow: string;
    differenceTitle: string;
    differenceBody: string;
    differenceFlatFillLabel: string;
    differenceFlatFillCaption: string;
    differenceColorHomeLabel: string;
    differenceColorHomeCaption: string;
    closingTitle: string;
    closingCta: string;
    footerEyebrow: string;
    footerBody: string;
  };
  studio: {
    eyebrow: string;
    pageTitle: string;
    introWithPhoto: string;
    introWithoutPhoto: string;
    disclaimerEyebrow: string;
    disclaimer: string; // the full "screens vs paint" paragraph, verbatim
    uploaderStepLabel: string;
    uploaderDragText: string;
    uploaderSubtext: string;
    uploaderButtonText: string;
    uploaderErrorNotImage: string;
    uploaderErrorDecodeFailed: string;
    canvasStepLabel: string;
    sensitivityLabel: string;
    selectedSurfacesHeading: string;
    colorStepLabel: string;
    regionsEmptyState: string;
    regionNoColorLabel: string;
    regionLabelPrefix: string;
    borderCheckboxLabel: string;
    categoryFacade: string;
    categoryTrim: string;
    categoryRoof: string;
    paletteDisabledMessage: string;
    pickAnyColorLabel: string;
    paletteCaveat: string;
    downloadButtonLabel: string;
  };
  colors: {
    pageTitle: string;
    eyebrowBrand: string;
    shadesSuffix: string;
    subtitle: string;
    ctaTryOnWall: string;
    caveat: string;
    categoryFacade: string;
    categoryTrim: string;
    categoryRoof: string;
    categoryNoteFacade: string;
    categoryNoteTrim: string;
    categoryNoteRoof: string;
  };
}
