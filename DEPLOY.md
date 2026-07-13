# Deploy — Funil Sustentare (VPS Hostinger + MySQL)

Guia para colocar o sistema no ar em um **VPS da Hostinger** (Ubuntu) usando **MySQL**.
O desenvolvimento local continua em **SQLite** (`npm run dev`); em produção os scripts
`*:prod` geram e usam automaticamente o schema MySQL — **você não edita o schema à mão**.

---

## 0. Como funciona a estratégia de banco

- `prisma/schema.prisma` → **SQLite** (desenvolvimento local, não mexer).
- `prisma/schema.prod.prisma` → **MySQL**, gerado por `npm run schema:mysql`
  (troca o provider e marca campos longos como `TEXT`). É gerado no deploy, não vai pro git.
- Os comandos de produção terminam em `:prod`.

---

## 1. Criar e acessar o VPS

1. Compre o VPS na Hostinger (Ubuntu 22.04 recomendado).
2. Acesse via SSH:
   ```bash
   ssh root@SEU_IP_DO_VPS
   ```

## 2. Instalar dependências no servidor

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Git, Nginx, MySQL e utilitários
apt-get install -y git nginx mysql-server

# PM2 (mantém o app rodando e reinicia sozinho)
npm install -g pm2
```

## 3. Criar o banco MySQL (no próprio VPS)

> Recomendado: MySQL no mesmo VPS (usa `localhost`, mais rápido e simples).
> Se preferir usar o MySQL da hospedagem compartilhada, pule para a nota no fim.

```bash
mysql
```
Dentro do MySQL:
```sql
CREATE DATABASE funil CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'funil_adm'@'localhost' IDENTIFIED BY 'UMA_SENHA_FORTE';
GRANT ALL PRIVILEGES ON funil.* TO 'funil_adm'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Clonar o projeto e instalar

```bash
cd /var/www
git clone SEU_REPOSITORIO funil
cd funil
npm install
```

## 5. Configurar o `.env`

```bash
cp .env.example .env
nano .env
```
Preencha:
```env
DATABASE_URL="mysql://funil_adm:UMA_SENHA_FORTE@localhost:3306/funil"

# Gere segredos fortes (rode: openssl rand -base64 48)
JWT_ACCESS_SECRET="cole-um-valor-aleatorio-longo"
JWT_REFRESH_SECRET="cole-outro-valor-aleatorio-longo"

ACCESS_TOKEN_TTL="8h"
REFRESH_TOKEN_TTL="7d"

# Admin inicial — TROQUE a senha!
ADMIN_EMAIL="admin@seudominio.com"
ADMIN_PASSWORD="UMA_SENHA_FORTE_DO_ADMIN"
ADMIN_USERNAME="admin"
```
Gerar segredos:
```bash
openssl rand -base64 48   # rode duas vezes, um para cada JWT_*_SECRET
```

## 6. Criar as tabelas e o admin

```bash
npm run setup:prod
```
Isso faz:
- gera o schema MySQL,
- **cria todas as tabelas** no banco (`prisma db push`),
- cria o usuário admin + dados de exemplo (seed).

> Para NÃO criar dados de exemplo, rode só `npm run db:push:prod` e crie o admin depois.

## 7. Buildar e subir a aplicação

```bash
npm run build:prod
pm2 start npm --name funil -- run start
pm2 save
pm2 startup    # siga a instrução que ele imprimir (para subir no boot)
```
O app sobe em `http://127.0.0.1:3000`.

## 8. Nginx (proxy reverso)

```bash
nano /etc/nginx/sites-available/funil
```
Cole (troque o domínio):
```nginx
server {
    listen 80;
    server_name funil.seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Ativar:
```bash
ln -s /etc/nginx/sites-available/funil /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```
> Aponte o DNS do domínio/subdomínio para o IP do VPS antes do próximo passo.

## 9. HTTPS (Let's Encrypt)

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d funil.seudominio.com
```

## 10. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## Atualizações futuras (deploy de novas versões)

```bash
cd /var/www/funil
git pull
npm install
npm run build:prod       # regenera schema/cliente MySQL e faz o build
# Se mudou o schema (novas tabelas/campos):
npm run db:push:prod
pm2 restart funil
```

## Backup do banco (recomendado)

Crontab diário com `mysqldump`:
```bash
crontab -e
```
Adicione:
```
0 3 * * * mysqldump -u funil_adm -p'UMA_SENHA_FORTE' funil | gzip > /var/backups/funil-$(date +\%F).sql.gz
```

---

## Nota: usar o MySQL da hospedagem compartilhada (em vez do VPS)

Se quiser manter o banco no painel que você mostrou (`u278435480_Funil`):
- `DATABASE_URL="mysql://u278435480_FunilADM:SENHA@HOST_REMOTO:3306/u278435480_Funil"`
- No hPanel, habilite **Remote MySQL** e adicione o **IP do VPS** à lista de permissões.
- `HOST_REMOTO` é o host de MySQL que a Hostinger informa (não é `localhost` nesse caso).
- Pode haver mais latência que um MySQL local no VPS.
```
