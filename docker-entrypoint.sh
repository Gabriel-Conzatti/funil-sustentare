#!/bin/sh
set -e

echo "==> Aplicando schema no MySQL (criando/atualizando tabelas)..."
npm run db:push:prod

echo "==> Rodando seed (admin inicial)..."
npm run db:seed:prod

echo "==> Iniciando o Funil Sustentare em http://0.0.0.0:3000"
npm run start
