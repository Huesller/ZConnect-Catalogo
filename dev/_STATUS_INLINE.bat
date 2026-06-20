@echo off
where node >nul 2>nul && (for /f "tokens=*" %%v in ('node -v') do echo Node............. OK %%v) || echo Node............. ERRO
where npm >nul 2>nul && (for /f "tokens=*" %%v in ('npm -v') do echo NPM.............. OK %%v) || echo NPM.............. ERRO
where git >nul 2>nul && (for /f "tokens=*" %%v in ('git --version') do echo Git.............. OK) || echo Git.............. ERRO
if exist package.json (echo package.json..... OK) else (echo package.json..... ERRO)
if exist node_modules (echo Dependencias..... OK) else (echo Dependencias..... NAO INSTALADAS)
if exist dist (echo dist............. OK) else (echo dist............. NAO GERADA)
