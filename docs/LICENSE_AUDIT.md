# License Audit

## Confirmed license

**PolyForm Noncommercial License 1.0.0** (`LICENSE`, verified by reading the full text at the
audited commit). This confirms the PRD's assumption; it is not a guess.

- Required Notice (must be preserved verbatim in any redistribution):
  `Copyright 2026 Synthetify Labs spółka z ograniczoną odpowiedzialnością.`
  `For a commercial license, contact licenses@openbot.run.`
- Permitted purpose: "Any noncommercial purpose." Explicitly includes personal research/study/
  hobby use and use by charitable, educational, public-research, public-safety/health,
  environmental, or government institutions — **regardless of the source of funding**.
- You may distribute the software and modified/derivative works, but only under these same terms
  (copyleft-style: distribution requires passing on the license + required notices).
- Patent license included, with a patent-defense termination clause (filing a patent-infringement
  claim against the software ends your patent license).
- No warranty, "as is".
- No sublicensing, no "other rights" implied beyond what's written.

## What this means for this fork

- **Non-commercial experimentation, internal tooling for personal/non-revenue use, and learning
  are covered.** Building "OpenBot Dev Workspace" as a personal/internal dev-productivity tool,
  not sold or offered as a paid product/service, is within the permitted-purpose language as long
  as it stays non-commercial.
- **"Internal business tooling" is the grey zone the PRD correctly flags.** PolyForm Noncommercial
  does not carve out an exception for internal corporate use the way some other "noncommercial"
  licenses do for small businesses — commercial-purpose use by a for-profit entity, including
  using the tool to develop other commercial software (i.e. the stated BharataCorp /
  Mabar-ecosystem use case in the design doc), is the exact scenario the license's "Noncommercial
  Purposes" clause does **not** clearly cover, since the organization itself is not
  charitable/educational/public/government. A strict reading is: if BharataCorp is a commercial
  entity and this tool helps build commercial products, that is commercial use of the tool,
  which requires the commercial license referenced in the Required Notice
  (`licenses@openbot.run`).
- This is a legal interpretation question, not an engineering one — **recommend getting an actual
  written answer from `licenses@openbot.run` before this fork is used for anything beyond personal
  experimentation**, rather than relying on this audit's reading. Nothing in this repo grants
  ability to self-certify that reading.
- The fork itself (making it, pushing it to a private/personal GitHub account, modifying it for
  evaluation) is unambiguously fine under "Changes and New Works License" + "Personal Uses" /
  experimentation language, independent of the commercial-use question above.

## Trademark / branding

`NOTICE` and `electron-builder.yml` (`productName: OpenBot`, `appId: app.openbot.desktop`) make
clear "OpenBot" is the upstream product's branding. The license does not grant trademark rights
(copyright license only). **Do not ship, distribute, or publish any build of this fork under the
"OpenBot" name/appId/icon as if it were the official product** — this is both a trademark risk and
exactly what PRD section 15.5 warns about re: the auto-updater/publish target
(`publish: { provider: github, owner: nightly-labs, repo: openbot }` in `electron-builder.yml`).
Rebranding (new appId, product name, icon) is required before any packaged distribution, even
non-commercial/internal distribution to teammates.

## Third-party dependency licenses (from `NOTICE`)

All bundled third-party assets/code disclosed in `NOTICE` are permissively licensed (MIT, ISC, SIL
OFL 1.1, Apache 2.0, CC-BY 4.0) — ships with Blobatar, solid-recharts, Font Awesome brand icons
(Windows/Linux/Android), a modified Docker/Moby seccomp profile, a cua-driver cursor-motion port,
Inter font, Lucide icon path data, Noto Color Emoji (cropped), and LobeHub maker logos (logos are
trademarks of their respective owners — do not treat as generally reusable). No GPL/AGPL or other
copyleft dependency was found in `NOTICE`. A full `bun pm ls`-based SBOM pass was **not** done in
this audit (out of scope for Phase 0 time budget) — flagged as a Phase 1 follow-up if a
distributable build is ever planned.

## CLA.md

Relevant only if contributing back upstream, not for running the fork. Assigns upstream broad
rights (including commercial sublicensing) over contributions — standard for a dual-licensed
project. Confirms upstream's commercial offering exists independent of the OSS/noncommercial
release.

## Actions NOT taken (per PRD section 16 "Do not")

No license text removed, no validation bypassed, no upstream credentials reused, no claim of
commercial rights made. This audit only reads and reports.
