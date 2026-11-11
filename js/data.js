// ============================================================
// PAQUERA — Dados de perfis fictícios (demonstração)
// Substitua por sua API/backend quando for para produção
// ============================================================

const INTERESSES = [
  'Praia','Música','Viagens','Gastronomia','Fotografia','Cinema','Séries',
  'Livros','Esportes','Fitness','Ciclismo','Corrida','Trilhas','Arte','Dança',
  'Café','Vinhos','Cerveja','Churrasco','Plantas','Animais','Cachorros','Gatos',
  'Tecnologia','Jogos','Política','História','Natureza','Aventura','Surfe',
  'Futebol','Moda','Nutrição','Estudos','Ecologia','Fotografia'
];

const CIDADES = [
  'São Paulo, SP','Rio de Janeiro, RJ','Belo Horizonte, MG','Salvador, BA',
  'Fortaleza, CE','Brasília, DF','Curitiba, PR','Recife, PE','Porto Alegre, RS',
  'Manaus, AM','Belém, PA','Goiânia, GO','São Luís, MA','Maceió, AL',
  'Natal, RN','Campo Grande, MS','Teresina, PI','João Pessoa, PB',
  'Aracaju, SE','Cuiabá, MT','Porto Velho, RO','Boa Vista, RR',
  'Palmas, TO','Macapá, AP','Rio Branco, AC','Vitória, ES',
  'Florianópolis, SC','Vitória, ES'
];

const PERFIS = [
  {
    id: 1, nome: 'Larissa', idade: 26, cidade: 'Rio de Janeiro, RJ',
    distancia: 5, trabalho: 'Designer de Produto',
    foto: 'assets/profiles/profile-01.jpg',
    bio: 'Amante de praia e samba no pé. Procuro alguém para compartilhar pores do sol, acarajé e playlists bem feitas. Cachorro? Amo. Café? Sempre.',
    interesses: ['Praia','Música','Viagens','Gastronomia','Fotografia','Cachorros'],
    genero: 'F', orientacao: 'Homens e mulheres'
  },
  {
    id: 2, nome: 'Pedro', idade: 29, cidade: 'São Paulo, SP',
    distancia: 12, trabalho: 'Engenheiro de Software',
    foto: 'assets/profiles/profile-02.jpg',
    bio: 'Engenheiro que ama café e livros. Finais de semana: pedal ou seriado? Vamos descobrir juntos. Falo fluentemente piadas ruins.',
    interesses: ['Tecnologia','Livros','Ciclismo','Café','Cinema','Jogos'],
    genero: 'M', orientacao: 'Mulheres'
  },
  {
    id: 3, nome: 'Mariana', idade: 31, cidade: 'Belo Horizonte, MG',
    distancia: 8, trabalho: 'Médica',
    foto: 'assets/profiles/profile-03.jpg',
    bio: 'Médica, apaixonada por cachoeiras e queijo mineiro. Sorriso fácil e conversa boa. Procuro alguém sincero, com bom astral e que goste de viajar.',
    interesses: ['Natureza','Gastronomia','Música','Cachorros','Trilhas','Viagens'],
    genero: 'F', orientacao: 'Homens'
  },
  {
    id: 4, nome: 'André', idade: 34, cidade: 'Salvador, BA',
    distancia: 3, trabalho: 'Professor de História',
    foto: 'assets/profiles/profile-04.jpg',
    bio: 'Professor de história, amo futebol de praia e um bom pagode. Axé e samba sempre no topo da playlist. Vamos tomar uma água de coco?',
    interesses: ['Futebol','Música','História','Praia','Dança','Gastronomia'],
    genero: 'M', orientacao: 'Mulheres'
  },
  {
    id: 5, nome: 'Beatriz', idade: 28, cidade: 'Porto Alegre, RS',
    distancia: 15, trabalho: 'Publicitária',
    foto: 'assets/profiles/profile-05.jpg',
    bio: 'Publicitária, churrasco e chimarrão não se negam. Adoro um bom vinho e conversa até altas horas. Procuro alguém com história pra contar.',
    interesses: ['Gastronomia','Vinhos','Moda','Viagens','Séries','Cerveja'],
    genero: 'F', orientacao: 'Homens e mulheres'
  },
  {
    id: 6, nome: 'Takeshi', idade: 30, cidade: 'Curitiba, PR',
    distancia: 7, trabalho: 'Arquiteto',
    foto: 'assets/profiles/profile-06.jpg',
    bio: 'Arquiteto, amo plantas e café especial. Finais de semana são para trilhas e comida boa. Tenho 27 plantas e um gato chamado Tolkien.',
    interesses: ['Arquitetura','Plantas','Café','Trilhas','Fotografia','Gatos'],
    genero: 'M', orientacao: 'Homens e mulheres'
  },
  {
    id: 7, nome: 'Valentina', idade: 25, cidade: 'Florianópolis, SC',
    distancia: 2, trabalho: 'Artista Plástica',
    foto: 'assets/profiles/profile-07.jpg',
    bio: 'Artista plástica, surfista de fim de tarde. Procuro alguém que ria de si mesmo e que não se importe de ficar na praia até o sol se pôr.',
    interesses: ['Arte','Surfe','Música','Praia','Cinema','Natureza'],
    genero: 'F', orientacao: 'Homens e mulheres'
  },
  {
    id: 8, nome: 'Rafael', idade: 27, cidade: 'Fortaleza, CE',
    distancia: 10, trabalho: 'Personal Trainer',
    foto: 'assets/profiles/profile-08.jpg',
    bio: 'Personal trainer, amo praia e corridas ao amanhecer. Sempre bem humorado. Prometo não te fazer correr 10km no primeiro encontro.',
    interesses: ['Fitness','Praia','Corrida','Nutrição','Esportes','Cachorros'],
    genero: 'M', orientacao: 'Mulheres'
  },
  {
    id: 9, nome: 'Camila', idade: 32, cidade: 'Brasília, DF',
    distancia: 6, trabalho: 'Advogada',
    foto: 'assets/profiles/profile-09.jpg',
    bio: 'Advogada, amante de arte e restaurantes novos. Adoro um bom debate e um vinho tinto. Procuro alguém inteligente e com boa energia.',
    interesses: ['Arte','Política','Gastronomia','Vinhos','Livros','Cinema'],
    genero: 'F', orientacao: 'Homens'
  },
  {
    id: 10, nome: 'Lucas', idade: 33, cidade: 'Vitória, ES',
    distancia: 4, trabalho: 'Músico',
    foto: 'assets/profiles/profile-10.jpg',
    bio: 'Músico e chef de cozinha nas horas vagas. Vou te fazer sorrir e comer bem. Violão, voz e uma massa fresquinha. Topa?',
    interesses: ['Música','Gastronomia','Viagens','Fotografia','Dança','Praia'],
    genero: 'M', orientacao: 'Mulheres'
  },
  {
    id: 11, nome: 'Júlia', idade: 22, cidade: 'Recife, PE',
    distancia: 1, trabalho: 'Estudante de Medicina',
    foto: 'assets/profiles/profile-11.jpg',
    bio: 'Estudante de medicina, frevo e maracatu nas veias. Adoro praia, gente feliz e um bom forró. Procuro alguém para aventuras leves.',
    interesses: ['Dança','Música','Praia','Estudos','Animais','Gastronomia'],
    genero: 'F', orientacao: 'Homens e mulheres'
  },
  {
    id: 12, nome: 'Bruno', idade: 31, cidade: 'Manaus, AM',
    distancia: 20, trabalho: 'Biólogo',
    foto: 'assets/profiles/profile-12.jpg',
    bio: 'Biólogo, apaixonado pela floresta e por aventuras. Histórias boas não faltam. Já vi onça de perto. Quer ouvir? Tem que chegar perto.',
    interesses: ['Natureza','Aventura','Fotografia','Ecologia','Esportes','Trilhas'],
    genero: 'M', orientacao: 'Mulheres'
  }
];

// Respostas automáticas simuladas para o chat (demo)
const RESPOSTAS_CHAT = [
  'Oi! Que bom que você deu match comigo 😊',
  'Hahaha, você é engraçado(a)!',
  'Nossa, que coincidência! Eu também amo isso.',
  'Vamos marcar de tomar um café um dia desses?',
  'Adorei seu perfil, você tem interesses muito legais.',
  'Que lugar você recomenda pra gente ir?',
  'Estava pensando em você hoje.',
  'Sério? Eu também! Que incrível.',
  'Me conta mais sobre você, quero te conhecer melhor.',
  'Você gosta de praia? A gente poderia ir sábado.',
  'Rindo muito aqui, você é demais!',
  'Amanhã à noite você está livre?',
  'Seu gosto musical é excelente, parabéns.',
  'Eu já fui nesse lugar! É maravilhoso, né?',
  'Combinado então! Te espero lá.'
];

const FRASES_MATCH = [
  'Vocês curtiram um ao outro!',
  'É match! Que venha o primeiro encontro.',
  'Alguém te correspondeu!',
  'O Cupido trabalhou hoje.',
  'Deu match! Agora é só conversar.'
];
