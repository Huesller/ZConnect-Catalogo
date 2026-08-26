@echo off
setlocal EnableExtensions DisableDelayedExpansion
title ZConnect - Publicacao limpa sem fotos e sem historico pesado

echo ============================================================
echo ZCONNECT - PUBLICACAO LIMPA V12.7.3 - LINK PERMANENTE
echo ============================================================
echo.
echo Este publicador NAO altera nem apaga a pasta original.
echo Ele cria uma copia Git limpa e envia somente a atualizacao.
echo.

set "SOURCE=%~dp0"
if "%SOURCE:~-1%"=="\" set "SOURCE=%SOURCE:~0,-1%"

if not exist "%SOURCE%\package.json" goto :wrong_folder
if not exist "%SOURCE%\api\offer.js" goto :wrong_folder
if not exist "%SOURCE%\.git" goto :missing_git

where git >nul 2>nul
if errorlevel 1 goto :missing_git_program

set "REMOTE="
for /f "delims=" %%R in ('git -C "%SOURCE%" remote get-url origin 2^>nul') do set "REMOTE=%%R"
if not defined REMOTE goto :missing_remote

set "GIT_USER_NAME="
set "GIT_USER_EMAIL="
for /f "delims=" %%U in ('git -C "%SOURCE%" config user.name 2^>nul') do set "GIT_USER_NAME=%%U"
for /f "delims=" %%U in ('git -C "%SOURCE%" config user.email 2^>nul') do set "GIT_USER_EMAIL=%%U"

:choose_temp
set "CLEAN=%TEMP%\ZConnect-Publicacao-Limpa-%RANDOM%-%RANDOM%"
if exist "%CLEAN%" goto :choose_temp

echo [1/6] Baixando somente a estrutura e o codigo necessario...
echo As fotos do catalogo nao serao baixadas nem reenviadas.
git clone --filter=blob:none --no-checkout --depth 1 --branch main --single-branch --no-tags "%REMOTE%" "%CLEAN%"
if errorlevel 1 goto :clone_failed

git -C "%CLEAN%" sparse-checkout init --no-cone
if errorlevel 1 goto :sparse_failed
git -C "%CLEAN%" sparse-checkout set --no-cone ^
 "/.env.example" ^
 "/PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html" ^
 "/PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-BUILD-3.2.html" ^
 "/PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-PERMANENTE-BUILD-3.3.html" ^
 "/PUBLICACAO-CATALOGO.md" ^
 "/README.md" ^
 "/REVOGACAO-E-LINKS-ESPECIAIS.md" ^
 "/VERSION.json" ^
 "/api/offer.js" ^
 "/package.json" ^
 "/package-lock.json" ^
 "/src/main.jsx" ^
 "/src/analytics/track.js" ^
 "/src/utils/signedOffer.js" ^
 "/tests/offer-api.test.mjs" ^
 "/tests/offer-key-pair.test.mjs" ^
 "/tests/offer-panel-security.test.mjs" ^
 "/tests/signed-offer.test.mjs" ^
 "/vercel.json"
if errorlevel 1 goto :sparse_failed
git -C "%CLEAN%" checkout main
if errorlevel 1 goto :sparse_failed

if defined GIT_USER_NAME git -C "%CLEAN%" config user.name "%GIT_USER_NAME%"
if defined GIT_USER_EMAIL git -C "%CLEAN%" config user.email "%GIT_USER_EMAIL%"

echo.
echo [2/6] Copiando somente os arquivos da versao 12.7.3...
call :copyfile ".env.example"
if errorlevel 1 goto :copy_failed
call :copyfile "PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html"
if errorlevel 1 goto :copy_failed
call :copyfile "PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-PERMANENTE-BUILD-3.3.html"
if errorlevel 1 goto :copy_failed
call :copyfile "PUBLICACAO-CATALOGO.md"
if errorlevel 1 goto :copy_failed
call :copyfile "README.md"
if errorlevel 1 goto :copy_failed
call :copyfile "REVOGACAO-E-LINKS-ESPECIAIS.md"
if errorlevel 1 goto :copy_failed
call :copyfile "VERSION.json"
if errorlevel 1 goto :copy_failed
call :copyfile "api\offer.js"
if errorlevel 1 goto :copy_failed
call :copyfile "package.json"
if errorlevel 1 goto :copy_failed
call :copyfile "package-lock.json"
if errorlevel 1 goto :copy_failed
call :copyfile "src\main.jsx"
if errorlevel 1 goto :copy_failed
call :copyfile "src\analytics\track.js"
if errorlevel 1 goto :copy_failed
call :copyfile "src\utils\signedOffer.js"
if errorlevel 1 goto :copy_failed
call :copyfile "tests\offer-api.test.mjs"
if errorlevel 1 goto :copy_failed
call :copyfile "tests\offer-panel-security.test.mjs"
if errorlevel 1 goto :copy_failed
call :copyfile "tests\signed-offer.test.mjs"
if errorlevel 1 goto :copy_failed
call :copyfile "vercel.json"
if errorlevel 1 goto :copy_failed

echo.
echo [3/6] Validando a geracao dos novos links...
where node >nul 2>nul
if errorlevel 1 goto :missing_node
pushd "%CLEAN%"
node --test tests/offer-api.test.mjs tests/offer-panel-security.test.mjs tests/signed-offer.test.mjs
set "TEST_RESULT=%ERRORLEVEL%"
popd
if not "%TEST_RESULT%"=="0" goto :test_failed

echo.
echo [4/6] Preparando o envio...
git -C "%CLEAN%" rm -q --ignore-unmatch -- "tests/offer-key-pair.test.mjs"
if errorlevel 1 goto :stage_failed
git -C "%CLEAN%" rm -q --ignore-unmatch -- "PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-BUILD-3.2.html"
if errorlevel 1 goto :stage_failed
git -C "%CLEAN%" add -- ^
 ".env.example" ^
 "PAINEL-COMERCIAL-OFERTAS-ASSINADAS.html" ^
 "PAINEL-COMERCIAL-OFERTAS-SEM-SENHA-PERMANENTE-BUILD-3.3.html" ^
 "PUBLICACAO-CATALOGO.md" ^
 "README.md" ^
 "REVOGACAO-E-LINKS-ESPECIAIS.md" ^
 "VERSION.json" ^
 "api/offer.js" ^
 "package.json" ^
 "package-lock.json" ^
 "src/main.jsx" ^
 "src/analytics/track.js" ^
 "src/utils/signedOffer.js" ^
 "tests/offer-api.test.mjs" ^
 "tests/offer-panel-security.test.mjs" ^
 "tests/signed-offer.test.mjs" ^
 "vercel.json"
if errorlevel 1 goto :stage_failed
git -C "%CLEAN%" diff --cached --name-only | findstr /I /E /C:".png" /C:".jpg" /C:".jpeg" /C:".webp" /C:".gif" /C:".svg" /C:".avif" >nul
if not errorlevel 1 goto :image_staged
git -C "%CLEAN%" diff --cached --stat
git -C "%CLEAN%" diff --cached --quiet
set "DIFF_RESULT=%ERRORLEVEL%"
if "%DIFF_RESULT%"=="0" goto :already_updated
if not "%DIFF_RESULT%"=="1" goto :diff_failed

echo.
echo [5/6] Criando o commit limpo...
git -C "%CLEAN%" commit -m "Adiciona links permanentes v12.7.3"
if errorlevel 1 goto :commit_failed

echo.
echo [6/6] Enviando ao GitHub...
echo Se uma janela de login abrir, autorize sua conta do GitHub.
git -C "%CLEAN%" push origin HEAD:main
if errorlevel 1 goto :push_failed

echo.
echo ============================================================
echo PUBLICADO COM SUCESSO - V12.7.3 SEM FOTOS
echo ============================================================
echo.
echo A pasta original nao foi alterada.
echo Agora aguarde o novo deployment ficar Ready na Vercel.
echo Copia limpa mantida em:
echo %CLEAN%
echo.
pause
exit /b 0

:copyfile
if not exist "%SOURCE%\%~1" (
  echo ERRO: arquivo nao encontrado: %~1
  exit /b 1
)
for %%D in ("%CLEAN%\%~1") do if not exist "%%~dpD" mkdir "%%~dpD" >nul 2>nul
copy /y "%SOURCE%\%~1" "%CLEAN%\%~1" >nul
if errorlevel 1 (
  echo ERRO ao copiar: %~1
  exit /b 1
)
exit /b 0

:wrong_folder
echo ERRO: este arquivo foi aberto na pasta errada.
echo Coloque o BAT na raiz do projeto original, ao lado de package.json.
goto :error_end

:missing_git
echo ERRO: a pasta .git nao foi encontrada.
echo Use a pasta original do projeto que ja era publicada no GitHub.
goto :error_end

:missing_git_program
echo ERRO: o programa Git nao foi encontrado neste computador.
goto :error_end

:missing_remote
echo ERRO: nao foi possivel localizar o endereco origin do GitHub.
goto :error_end

:clone_failed
echo.
echo ERRO ao baixar a copia limpa do GitHub.
echo Confira a internet e o login do GitHub.
goto :error_end

:sparse_failed
echo.
echo ERRO ao preparar a copia sem fotos.
echo Atualize o Git para a versao mais recente e tente novamente.
goto :error_with_clean

:copy_failed
echo.
echo ERRO ao copiar os arquivos da atualizacao.
echo Confirme que todos os arquivos novos estao na pasta original.
goto :error_with_clean

:missing_node
echo.
echo ERRO: o programa Node.js nao foi encontrado neste computador.
goto :error_with_clean

:test_failed
echo.
echo ERRO: a validacao dos novos links nao passou. Nada foi enviado.
goto :error_with_clean

:stage_failed
echo.
echo ERRO ao preparar os arquivos para o commit.
goto :error_with_clean

:image_staged
echo.
echo ERRO DE SEGURANCA: uma imagem apareceu no envio.
echo Nada foi publicado. Envie uma foto desta tela para verificacao.
goto :error_with_clean

:already_updated
echo.
echo ============================================================
echo O GITHUB JA ESTA ATUALIZADO
echo ============================================================
echo.
echo Nao existem diferencas para enviar.
echo Agora confira o deployment mais recente na Vercel.
echo A pasta original nao foi alterada.
echo.
pause
exit /b 0

:diff_failed
echo.
echo ERRO ao comparar os arquivos que seriam publicados.
goto :error_with_clean

:commit_failed
echo.
echo ERRO ao criar o commit limpo.
echo Confira se nome e e-mail do Git estao configurados.
goto :error_with_clean

:push_failed
echo.
echo ERRO no envio limpo. A pasta original continua intacta.
echo Envie uma foto desta tela para verificacao.
goto :error_with_clean

:error_with_clean
echo.
echo Copia limpa mantida para verificacao em:
echo %CLEAN%

:error_end
echo.
echo Nenhum arquivo da pasta original foi apagado.
echo.
pause
exit /b 1
