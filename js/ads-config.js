// Preencha somente com os identificadores e o código HTTPS fornecidos
// pelos painéis oficiais. Nenhum anúncio é carregado sem consentimento.
window.PAQUERA_ADS_CONFIG = {
  google: {
    publisherId: '',
    slots: {
      landing: '',
      discover: ''
    }
  },
  // A Monetag (zona 304192) está fixa no <head> do index.html, para que o painel
  // verifique o site e os anúncios apareçam para todos os visitantes.
  // Deixe vazio aqui para não carregar a mesma tag duas vezes.
  monetag: {
    scriptUrl: '',
    zone: '',
    containerId: '',
    placement: 'discover'
  }
};
