# Paquera — demonstração de site de relacionamentos

Protótipo interativo, estático e em português, feito com HTML, CSS e JavaScript puro. Não exige build e pode ser servido pelo GitHub Pages ou Cloudflare Pages.

**Esta versão não conecta pessoas.** Perfis, matches e conversas são fictícios. Use apenas informações de teste.

## O que dá para testar

- Criar ou continuar um perfil de demonstração sem e-mail ou senha.
- Descobrir perfis, ver detalhes e curtir ou pular com botões, teclado ou gesto.
- Filtrar por idade, distância, cidade, interesses e preferência.
- Ver matches e conversar com respostas automáticas.
- Editar o perfil, escolher uma foto de exemplo e apagar os dados locais.
- Bloquear ou denunciar perfis de exemplo. Esses registros não são enviados a uma equipe.
- Consultar avisos demonstrativos de privacidade, segurança e termos.

As preferências e interações ficam no `localStorage` do navegador. Quem tiver acesso ao mesmo dispositivo poderá vê-las; use o botão **Apagar meus dados deste navegador** para removê-las.

## Arquivos

```text
index.html
css/style.css
js/app.js
js/data.js
js/ads-config.js
js/monetization.js
assets/profiles/
```

## Preparar anúncios

Os espaços de publicidade são ocultados e nenhum script de anúncios é carregado por padrão. Para configurar:

1. Abra `js/ads-config.js` e preencha o ID de editor do Google AdSense (`ca-pub-...`) e os IDs das unidades para `landing` e/ou `discover`, conforme exibidos no seu painel.
2. Para Monetag, configure a URL HTTPS do script e o ID do contêiner copiados do painel oficial, além do posicionamento `landing` ou `discover`. Não use códigos de terceiros que não reconheça.
3. Configure um parceiro por posicionamento para evitar sobreposição entre anúncios.
4. Publique em um domínio controlado por você, conclua a verificação/aprovação de cada rede e faça os ajustes de `ads.txt` exigidos por cada painel antes de ativar anúncios.
5. Revise as políticas dos parceiros, a política de privacidade e os requisitos legais aplicáveis. Para visitantes do EEE, Reino Unido ou Suíça, use uma CMP certificada pelo Google quando exigido pelas regras do AdSense.

O aviso de consentimento só aparece quando há uma integração configurada. Os scripts são carregados após a aceitação; a preferência pode ser alterada em **Suporte → Preferências de anúncios**. IDs, aprovação do domínio, política final, CMP quando aplicável e configuração de `ads.txt` são fornecidos pelo proprietário do site e não estão incluídos nesta demonstração. A configuração de anúncios não transforma o protótipo em um serviço de relacionamentos real.

## Publicação estática

Não há comando de build. Para um projeto já conectado ao GitHub e Cloudflare Pages, publique os arquivos do repositório conforme o fluxo configurado. A raiz publicada deve conter `index.html`; mantenha `css/`, `js/` e `assets/` ao lado dele. Se solicitado pela plataforma, use preset `None`, sem comando de build, e diretório de saída `.`.

No GitHub Pages, selecione a branch e a pasta raiz que contêm `index.html`. No Cloudflare Pages, confirme que o projeto aponta para a mesma branch e raiz. A publicação só ocorre depois de enviar as alterações ao repositório conectado.

## Personalização

- Perfis e conteúdo de exemplo: `js/data.js`.
- Comportamento e armazenamento local: `js/app.js`.
- Identidade visual e responsividade: `css/style.css`.
- Conteúdo da página e avisos: `index.html`.
- Para trocar imagens, substitua as fotos em `assets/profiles/` mantendo os nomes usados em `js/data.js`.

Use somente fotos e dados com autorização de uso.

## Antes de lançar um serviço real

Este protótipo **não** possui contas/autenticação reais, banco de dados, mensagens entre usuários, notificações enviadas, cobrança, localização precisa, moderação ou atendimento. Também não constitui termos jurídicos nem política de privacidade final.

- Projetar e implementar API, banco de dados, autenticação segura, verificação de e-mail e recuperação de conta.
- Implementar autorização no servidor, validação, proteção contra abuso e limitação de requisições.
- Implementar chat em tempo real, notificações com consentimento e moderação de conteúdo e fotos.
- Implementar denúncia e bloqueio reais, com processo de análise, equipe e resposta.
- Definir uma verificação de idade apropriada para impedir o uso por menores de 18 anos.
- Preparar política de privacidade, termos, retenção e exclusão, direitos dos titulares e contato do controlador; fazer revisão jurídica adequada para LGPD.
- Configurar domínio, HTTPS, monitoramento, backups, gestão de incidentes e canal de suporte.
- Substituir todo conteúdo fictício por conteúdo autorizado e alegações verificáveis.
- Testar acessibilidade, segurança, privacidade e comportamento em navegadores e dispositivos antes de divulgar.

O frontend não possui integração pronta com Supabase, Firebase ou API própria. Decida a infraestrutura e os requisitos de dados antes de conectar serviços.
