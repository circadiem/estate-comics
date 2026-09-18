# PDF fonts

Bundled TrueType files for `@react-pdf/renderer`, which cannot use `next/font`.

| Family in PDF | Source | Licence |
|---|---|---|
| **Provenance Serif** | Cormorant Garamond (Google Fonts, static instances) with the default digits remapped to the face's own lining figures (`zero.lf` … `nine.lf`) | SIL OFL 1.1 — `OFL-CormorantGaramond.txt` |
| **Nunito Sans** | Nunito Sans (Google Fonts, static instances), unmodified | SIL OFL 1.1 — `OFL-NunitoSans.txt` |

**Why the remap.** Cormorant's default figures are old-style: "11" reads as "II" and
money figures dance on the baseline. react-pdf does not expose OpenType feature
selection, so the `lnum` alternates are made the default in the file itself.
Nothing else in the font is changed (kerning, ligatures and all other tables are
preserved via fontTools).

**Why the rename.** The OFL reserves the name "Cormorant" for the original. A
modified build may not carry a Reserved Font Name, so the family is renamed
"Provenance Serif" in the name table. On screen the web font is the unmodified
Cormorant Garamond via `next/font/google` (see `app/fonts.ts`).

To regenerate: download the static TTFs from Google Fonts and run the fontTools
remap in the commit that introduced these files (`git log -- lib/pdf/fonts`).
