@echo off
set str1=%~dp0
set str2=\macbcr.jar
set java=java
set jarpath=%str1%%str2%
set allparam=

:param
set str=%1
if "%str%"=="" (
    goto end
)
set allparam=%allparam% %str%
shift /0
goto param

:end
if "%allparam%"=="" (
    goto eof
)

rem remove left right blank
:intercept_left
if "%allparam:~0,1%"==" " set "allparam=%allparam:~1%"&goto intercept_left

:intercept_right
if "%allparam:~-1%"==" " set "allparam=%allparam:~0,-1%"&goto intercept_right

:eof

@echo on
echo %*
%java% -Djava.library.path=%str1% -jar %jarpath% %*

pause