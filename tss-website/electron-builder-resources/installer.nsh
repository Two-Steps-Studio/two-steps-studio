; NSIS Custom Installer Script for Two Steps Studio Desktop
; Language: Polish (1045)
;
; This file is pulled in through electron-builder's `nsis.include` option, so it
; may only define electron-builder's documented macros. Defining .onInit here
; directly would clash with the one electron-builder generates; the equivalent
; hook is the customInit macro.

; These headers have their own include guards, so requesting them is safe even
; if electron-builder's generated script already pulled them in. Without them
; ${If}/${IsWin10}/${RunningX64} are not defined and the script fails to build.
!include LogicLib.nsh
!include WinVer.nsh
!include x64.nsh

!macro preInit
  SetRegView 64
  ${If} ${RunningX64}
    ; Running on 64-bit Windows
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "Two Steps Studio wymaga systemu Windows 64-bit. Proszę pobrać odpowiednią wersję." /SD IDOK
    Quit
  ${EndIf}
  SetRegView 32
!macroend

!macro customInit
  ${If} ${IsWin10}
    ; Windows 10 or later - supported
  ${ElseIf} ${IsWin8}
    MessageBox MB_OK|MB_ICONINFORMATION "Zalecamy Windows 10 lub nowszy dla najlepszej wydajności." /SD IDOK
  ${Else}
    MessageBox MB_OK|MB_ICONSTOP "Two Steps Studio wymaga systemu Windows 10 lub nowszego." /SD IDOK
    Quit
  ${EndIf}
!macroend

!macro customInstall
  ; Desktop and Start Menu shortcuts for the app itself are created by
  ; electron-builder (createDesktopShortcut / createStartMenuShortcut).
  ; Only the extra web links are added here.
  CreateDirectory "$SMPROGRAMS\Two Steps Studio"
  WriteINIStr "$SMPROGRAMS\Two Steps Studio\Strona internetowa.url" "InternetShortcut" "URL" "https://twostepsstudio.com"
  WriteINIStr "$SMPROGRAMS\Two Steps Studio\Pomoc techniczna.url" "InternetShortcut" "URL" "https://twostepsstudio.com/kontakt"
!macroend

!macro customUnInstall
  Delete "$SMPROGRAMS\Two Steps Studio\Strona internetowa.url"
  Delete "$SMPROGRAMS\Two Steps Studio\Pomoc techniczna.url"
!macroend
