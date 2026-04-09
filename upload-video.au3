#include <MsgBoxConstants.au3>
#include <ClipBoard.au3>

$sPath = $CmdLine[1]
$sFileName = $CmdLine[2]

Local $fullPath = $sPath & "\" & $sFileName

Local $hWnd = WinWait("[CLASS:#32770]", "", 15)
If $hWnd = 0 Then Exit 1

WinActivate($hWnd)
WinWaitActive($hWnd)

Sleep(1000)

ControlFocus($hWnd, "", "Edit1")
Sleep(500)

ControlSetText($hWnd, "", "Edit1", $fullPath)
Sleep(1000)

Send("{ENTER}")