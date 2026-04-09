#include <MsgBoxConstants.au3>
#include <ClipBoard.au3>

$sPath = $CmdLine[1]
$sFileName = $CmdLine[2]

Local $iTotalTarget = Random(8000, 12000, 1)

; 300+300+100+200+1000+300+100+200+500 = 3000ms cố định
; Random(100,200)*4 ~ 600ms
Local $iFixedTime = 3000 + 600

Local $iRemaining = $iTotalTarget - $iFixedTime
If $iRemaining < 200 Then $iRemaining = 200

Local $iDelay1 = Int($iRemaining / 2)
Local $iDelay2 = $iRemaining - $iDelay1

Func PasteText($text)
    ClipPut($text)
    Sleep(Random(100, 200, 1))
    Send("^v")
    Sleep(Random(100, 200, 1))
EndFunc

Local $hWnd = WinWaitActive("[CLASS:#32770]", "", 15)
If $hWnd = 0 Then Exit 1

Sleep(300)
Send("!n")
Sleep(300)
Send("^a")
Sleep(100)
PasteText($sPath)
Sleep(200)
Send("{ENTER}")
Sleep(500)

Send("!n")
Sleep(300)
Send("^a")
Sleep(100)
PasteText($sFileName)
Sleep(200)
Send("{ENTER}")
Sleep(500)  ; <<< đổi từ 1000 → 500