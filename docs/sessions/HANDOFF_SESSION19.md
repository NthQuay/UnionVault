# HANDOFF — Session 19 (in progress)
*2026-11-08 · repo `NthQuay/UnionVault`, `main` = live build **v510.8** · edge functions `send-guest-email` **v25**, `send-vendor-brief-email` **v10** (both redeployed with `../_shared/email-templates.ts`)*

| Build | What shipped |
|---|---|
| v510.3 | RSVP card: "Email design" button removed; Edit communications text (RSVP card + Settings) says email designs are edited there |
| v510.5 | Per-email Design popup: "Use app-wide Email design" switch (`_emailDesignUseGlobal`; custom design stashed in `settings.commsDesignSaved`). Website builder: Right alignment no longer reset by the normalisers (`WB_BODY_ALIGNS`, `t.align`, `t.bodyAlign`); button blocks follow section/site alignment unless set on the block |
| v510.6–.8 | Emails: "Nº 02 —" removed; Atelier corner number = day over month ("16 / OCT"); custom **Background / Box / Panels** colours (`bgColor`, `boxColor`, `panelColor` in design objects; `applyCustomColors` in the shared template; sent via `designOpts`); Email Design modal shows Accent/Background/Box/Panels as a 2-column list, each opening one colour popup (`_emailColourPop`); help text behind an "i" |

## Notes
- Custom Box turns off the automatic dark-mode swap for that email; a dark Box applies light text rules permanently + white logo. A Panels colour on the opposite light/dark side of the Box is ignored.
- The simple fixed emails (RSVP confirmation, Wishing Well, appointment) have their own classic layout and only use Accent.
- Deployed edge functions were not read back after deploy; worth sending a real Atelier invite with custom colours to check.
- Previews: `docs/sessions/preview-email-*.png`.
