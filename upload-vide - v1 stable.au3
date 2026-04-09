#include <MsgBoxConstants.au3>
#include <ClipBoard.au3>

$sPath = $CmdLine[1]
$sFileName = $CmdLine[2]

Func PasteText($text)
    ClipPut($text)
    Sleep(100)
    Send("^v")
    Sleep(100)
EndFunc

Local $hWnd = WinWaitActive("[CLASS:#32770]", "", 15)
If $hWnd = 0 Then Exit 1

Sleep(300)
Send("!n")
Sleep(300)
Send("^a")
Sleep(100)
PasteText($sPath)
Sleep(300)
Send("{ENTER}")
Sleep(800)

Send("!n")
Sleep(300)
Send("^a")
Sleep(100)
PasteText($sFileName)
Sleep(300)
Send("{ENTER}")