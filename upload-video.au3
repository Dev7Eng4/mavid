#include <MsgBoxConstants.au3>

$sPath = $CmdLine[1]
$sFileName = $CmdLine[2]

Local $fullPath = $sPath & "\" & $sFileName

; Chờ popup (Open / File Upload)
Local $hWnd = WinWait("[CLASS:#32770]", "", 15)
If $hWnd = 0 Then Exit 1

; Kích hoạt cửa sổ (không bắt buộc nhưng nên có)
WinActivate($hWnd)
WinWaitActive($hWnd)

Sleep(200)

; Set đường dẫn trực tiếp vào input
ControlFocus($hWnd, "", "Edit1")
Sleep(100)

ControlSetText($hWnd, "", "Edit1", $fullPath)
Sleep(200)

; Click nút Open
ControlClick($hWnd, "", "Button1")

; Optional delay nhẹ
Sleep(300)