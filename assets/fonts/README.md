# Local web fonts

Unmodified Latin variable WOFF2 subsets downloaded from Google Fonts on 2026-11-04.
These preserve the site's existing normal Inter weights 400–800 and JetBrains Mono
weights 600–700. Both use the SIL Open Font License 1.1; original license files
are included here. No font was renamed or modified.

Google Fonts CSS source:
https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=JetBrains+Mono:wght@600..700&display=optional

Request with a modern Chrome user agent to receive the variable WOFF2 subsets.
The source CSS specifies the weight ranges and Latin unicode ranges retained
in `css/styles.css`.

- Inter v20: https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2
- JetBrains Mono v24: https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2
- Inter license: https://raw.githubusercontent.com/google/fonts/main/ofl/inter/OFL.txt
- JetBrains Mono license: https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/OFL.txt

`font-display: optional` allows immediate fallback text and avoids a late font swap
on a slow first visit. A cached or quickly available face can render in the original
font. Unsupported characters retain the system fallback stack. No remote font
stylesheet, new runtime dependency, or preload is required.
