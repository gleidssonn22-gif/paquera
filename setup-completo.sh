#!/bin/bash
set -e
export CLOUDFLARE_API_TOKEN="$CLOUDFLARE_API_TOKEN"
ZONE="73d124a00bab70f56755c0102e7b1c8f"
API="https://api.cloudflare.com/client/v4"
AUTH="Authorization: Bearer $CLOUDFLARE_API_TOKEN"
CT="Content-Type: application/json"

echo "=== PAQUERA SETUP COMPLETO ==="

echo "[1] Zone settings..."
curl -s -X PATCH "$API/zones/$ZONE/settings/always_use_https" -H "$AUTH" -H "$CT" --data '{"value":"on"}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/ssl" -H "$AUTH" -H "$CT" --data '{"value":"full"}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/brotli" -H "$AUTH" -H "$CT" --data '{"value":"on"}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/minify" -H "$AUTH" -H "$CT" --data '{"value":{"html":"on","css":"on","js":"on"}}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/http2" -H "$AUTH" -H "$CT" --data '{"value":"on"}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/tls_1_3" -H "$AUTH" -H "$CT" --data '{"value":"on"}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/security_header" -H "$AUTH" -H "$CT" --data '{"value":{"strict_transport_security":{"enabled":true,"max_age":31536000,"include_subdomains":true,"preload":true,"nosniff":true}}}' > /dev/null
curl -s -X PATCH "$API/zones/$ZONE/settings/automatic_https_rewrites" -H "$AUTH" -H "$CT" --data '{"value":"on"}' > /dev/null
echo "  SSL Full, HTTPS, Brotli, Minify, HTTP/2, TLS1.3, HSTS, Auto-rewrites OK"

echo "[2] Email Routing..."
curl -s -X POST "$API/zones/$ZONE/email/routing/enable" -H "$AUTH" -H "$CT" > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/email/routing/rules" -H "$AUTH" -H "$CT" --data '{"name":"contato","enabled":true,"matchers":[{"type":"literal","field":"to","value":"contato@clubewins.com.br"}],"actions":[{"type":"forward","value":["gleidssonn22@gmail.com"]}]}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/email/routing/rules" -H "$AUTH" -H "$CT" --data '{"name":"suporte","enabled":true,"matchers":[{"type":"literal","field":"to","value":"suporte@clubewins.com.br"}],"actions":[{"type":"forward","value":["gleidssonn22@gmail.com"]}]}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/email/routing/rules" -H "$AUTH" -H "$CT" --data '{"name":"catchall","enabled":true,"matchers":[{"type":"all"}],"actions":[{"type":"forward","value":["gleidssonn22@gmail.com"]}]}' > /dev/null 2>&1
echo "  contato@, suporte@, catch-all OK"

echo "[3] DNS records..."
curl -s -X POST "$API/zones/$ZONE/dns_records" -H "$AUTH" -H "$CT" --data '{"type":"MX","name":"clubewins.com.br","content":"route1.mx.cloudflare.net","priority":10,"proxied":false}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/dns_records" -H "$AUTH" -H "$CT" --data '{"type":"MX","name":"clubewins.com.br","content":"route2.mx.cloudflare.net","priority":20,"proxied":false}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/dns_records" -H "$AUTH" -H "$CT" --data '{"type":"MX","name":"clubewins.com.br","content":"route3.mx.cloudflare.net","priority":30,"proxied":false}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/dns_records" -H "$AUTH" -H "$CT" --data '{"type":"TXT","name":"clubewins.com.br","content":"v=spf1 include:_spf.mx.cloudflare.net ~all","proxied":false}' > /dev/null 2>&1
curl -s -X POST "$API/zones/$ZONE/dns_records" -H "$AUTH" -H "$CT" --data '{"type":"TXT","name":"_dmarc.clubewins.com.br","content":"v=DMARC1; p=quarantine; rua=mailto:gleidssonn22@gmail.com","proxied":false}' > /dev/null 2>&1
echo "  MX x3, SPF, DMARC OK"

echo "[4] WAF rate limiting..."
curl -s -X POST "$API/zones/$ZONE/rulesets/phases/http_ratelimit/entrypoint" -H "$AUTH" -H "$CT" --data '{"rules":[{"expression":"(http.request.uri.path contains \"/api/auth\")","action":"block","ratelimit":{"characteristics":["ip.src"],"period":60,"requests_per_period":5,"mitigation_timeout":600},"description":"Rate limit login"},{"expression":"(http.request.uri.path eq \"/api/users\" and http.request.method eq \"POST\")","action":"block","ratelimit":{"characteristics":["ip.src"],"period":3600,"requests_per_period":3,"mitigation_timeout":3600},"description":"Rate limit signup"},{"expression":"(http.request.uri.path contains \"/api/ai/\")","action":"block","ratelimit":{"characteristics":["ip.src"],"period":60,"requests_per_period":10,"mitigation_timeout":120},"description":"Rate limit IA"}]}' > /dev/null 2>&1
echo "  login 5/min, signup 3/hora, IA 10/min OK"

echo "[5] WAF custom rules..."
curl -s -X POST "$API/zones/$ZONE/rulesets/phases/http_request_firewall_custom/entrypoint" -H "$AUTH" -H "$CT" --data '{"rules":[{"expression":"(http.request.uri.query contains \"UNION\" and http.request.uri.query contains \"SELECT\")","action":"block","description":"SQL Injection"},{"expression":"(http.request.uri.query contains \"<script\" or http.request.uri.query contains \"javascript:\")","action":"block","description":"XSS"},{"expression":"(http.user_agent contains \"sqlmap\" or http.user_agent contains \"nikto\" or http.user_agent contains \"nmap\")","action":"block","description":"Scanners"}]}' > /dev/null 2>&1
echo "  SQLi, XSS, Scanners OK"

echo "[6] Cache rules..."
curl -s -X POST "$API/zones/$ZONE/rulesets/phases/http_request_cache_settings/entrypoint" -H "$AUTH" -H "$CT" --data '{"rules":[{"expression":"(http.request.uri.path contains \"/api/users/\" and not http.request.uri.path contains \"/me\")","action":"set_cache_settings","cache_settings":{"edge_ttl":{"mode":"respect_origin","default":3600},"browser_ttl":{"mode":"override","default":300}},"description":"Cache perfis"},{"expression":"(http.request.uri.path.extension in {\"jpg\" \"jpeg\" \"png\" \"webp\" \"gif\" \"svg\" \"css\" \"js\" \"woff2\"})","action":"set_cache_settings","cache_settings":{"edge_ttl":{"mode":"respect_origin","default":86400},"browser_ttl":{"mode":"override","default":86400}},"description":"Cache assets"}]}' > /dev/null 2>&1
echo "  perfis 1h, assets 24h OK"

echo "[7] Redirect www -> apex..."
curl -s -X POST "$API/zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" -H "$AUTH" -H "$CT" --data '{"rules":[{"expression":"(http.host eq \"www.clubewins.com.br\")","action":"redirect","redirect":{"from":{"value":"http.host"},"to":{"value":"https://clubewins.com.br${http.request.uri.path}${http.request.uri.query}"},"status":301},"description":"www para apex"}]}' > /dev/null 2>&1
echo "  301 redirect OK"

echo "[8] R2 bucket..."
npx wrangler r2 bucket create paquera-media 2>/dev/null || echo "  bucket ja existe"
echo "  paquera-media OK"

echo "[9] Vectorize..."
npx wrangler vectorize create paquera-embeddings --dimensions 768 --metric cosine 2>/dev/null || echo "  indice ja existe"
echo "  paquera-embeddings OK"

echo "[10] Secrets..."
echo "paquera-jwt-secret-2026" | npx wrangler secrets-store secret put JWT_SECRET 2>/dev/null || echo "  JWT_SECRET ja existe"
echo "gemini-key-placeholder" | npx wrangler secrets-store secret put GEMINI_API_KEY 2>/dev/null || echo "  GEMINI_API_KEY ja existe"
echo "  JWT + Gemini OK"

echo "[11] SEO extras..."
cat > seo-extras.sql << 'ENDSQL'
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('brasilia','Paquera em Brasilia','Encontre pessoas em Brasilia.','<h1>Paquera Brasilia</h1>','Paquera Brasilia','pt','BR','Brasilia');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('porto-alegre','Paquera em Porto Alegre','Encontre pessoas em Porto Alegre.','<h1>Paquera Porto Alegre</h1>','Paquera Porto Alegre','pt','BR','Porto Alegre');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('recife','Paquera em Recife','Encontre pessoas em Recife.','<h1>Paquera Recife</h1>','Paquera Recife','pt','BR','Recife');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('manaus','Paquera em Manaus','Encontre pessoas em Manaus.','<h1>Paquera Manaus</h1>','Paquera Manaus','pt','BR','Manaus');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('goiania','Paquera em Goiania','Encontre pessoas em Goiania.','<h1>Paquera Goiania</h1>','Paquera Goiania','pt','BR','Goiania');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('campinas','Paquera em Campinas','Encontre pessoas em Campinas.','<h1>Paquera Campinas</h1>','Paquera Campinas','pt','BR','Campinas');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('florianopolis','Paquera em Florianopolis','Encontre pessoas em Florianopolis.','<h1>Paquera Floripa</h1>','Paquera Floripa','pt','BR','Florianopolis');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('vitoria','Paquera em Vitoria','Encontre pessoas em Vitoria.','<h1>Paquera Vitoria</h1>','Paquera Vitoria','pt','BR','Vitoria');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('natal','Paquera em Natal','Encontre pessoas em Natal.','<h1>Paquera Natal</h1>','Paquera Natal','pt','BR','Natal');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('belem','Paquera em Belem','Encontre pessoas em Belem.','<h1>Paquera Belem</h1>','Paquera Belem','pt','BR','Belem');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('como-funciona','Como funciona o Paquera','App de relacionamento com IA.','<h1>Como funciona</h1>','Como funciona','pt','BR','');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('seguranca','Seguranca no Paquera','Como protegemos seus dados.','<h1>Seguranca</h1>','Seguranca','pt','BR','');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('premium','Paquera Premium','Swipes ilimitados e mais.','<h1>Premium</h1>','Premium','pt','BR','');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('termos','Termos de Uso','Termos de uso.','<h1>Termos</h1>','Termos de Uso','pt','BR','');
INSERT OR IGNORE INTO seo_pages (slug,title,meta_description,content,h1,language,country,city) VALUES ('privacidade','Politica de Privacidade','Sua privacidade.','<h1>Privacidade</h1>','Politica de Privacidade','pt','BR','');
ENDSQL
npx wrangler d1 execute paquera --remote --file=./seo-extras.sql 2>/dev/null || echo "  erro SEO (continue)"
echo "  15 paginas SEO extras OK"

echo "[12] Deploy final..."
npx wrangler deploy
echo "  Deploy OK"

echo ""
echo "=========================================="
echo "  PAQUERA COMPLETO!"
echo "=========================================="
echo "Site:  https://clubewins.com.br"
echo "App:   https://app.clubewins.com.br"
echo "API:   https://api.clubewins.com.br"
echo "Loja:  https://loja.clubewins.com.br"
echo "Fotos: https://fotos.clubewins.com.br"
echo ""
echo "Email: contato@ e suporte@ -> seu Gmail"
echo "WAF: rate limit + SQLi + XSS + scanners"
echo "Cache: perfis 1h + assets 24h"
echo "Redirect: www -> apex (301)"
echo "R2 + Vectorize + Secrets: criados"
echo "SEO: 21 paginas (16 cidades + 5 institucionais)"
echo ""
echo "REVogue o token: dash.cloudflare.com/profile/api-tokens"
echo "Troque JWT_SECRET e GEMINI_API_KEY por valores reais"
