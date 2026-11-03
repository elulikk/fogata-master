// Paletas del fuego: cada escalón de la escalera (data/sizes.js) nombra la suya.
// Para sumar un color de fuego alcanza con agregar una entrada: la textura y las partículas se arman solas.
//   particles  colores de las lenguas, de recién nacida a punto de morir.
//   tongues    cuerpo de la llama: [pie, medio, punta] de cada lengua, de afuera hacia adentro.
//   shadow     halo del cuerpo de la llama.
//   ground, stone, tree, bed  tintes de la luz que tira sobre el suelo, las piedras, los árboles y el lecho.
//   light      tinte de la luz grande (null = el color propio de la textura).

export const FLAMES = {
  fuego: {
    baseKey: 'flame-base',
    particles: [0xffc870, 0xff9a30, 0xe85010, 0x6a1400],
    tongues: [
      ['rgba(255,150,40,0.85)', 'rgba(230,70,15,0.55)', 'rgba(120,20,5,0)'],
      ['rgba(255,190,70,0.9)', 'rgba(255,110,25,0.65)', 'rgba(200,50,10,0)'],
      ['rgba(255,235,150,0.95)', 'rgba(255,170,50,0.7)', 'rgba(255,110,25,0)'],
      ['rgba(255,255,235,1)', 'rgba(255,235,150,0.8)', 'rgba(255,200,90,0)'],
    ],
    shadow: 'rgba(255,120,30,0.8)',
    ground: 0xff8a40, stone: 0xff7a30, tree: 0xff6a20, bed: 0xff5a1a, light: null,
  },
  // Fuego de fragua: más blanco y amarillo, con el aire que le entra.
  forja: {
    baseKey: 'flame-base-forja',
    particles: [0xfff4c8, 0xffd060, 0xff8a20, 0x8a2c00],
    tongues: [
      ['rgba(255,190,70,0.9)', 'rgba(255,110,20,0.6)', 'rgba(150,40,5,0)'],
      ['rgba(255,225,120,0.95)', 'rgba(255,160,40,0.7)', 'rgba(230,80,15,0)'],
      ['rgba(255,250,200,1)', 'rgba(255,215,100,0.8)', 'rgba(255,150,40,0)'],
      ['rgba(255,255,250,1)', 'rgba(255,250,210,0.9)', 'rgba(255,230,140,0)'],
    ],
    shadow: 'rgba(255,170,60,0.85)',
    ground: 0xffa850, stone: 0xff9a40, tree: 0xff8a30, bed: 0xff8020, light: null,
  },
  // Fuego azul de la Gran Forja: la paleta más limpia y la más caliente.
  azul: {
    baseKey: 'flame-base-azul',
    particles: [0xeaf8ff, 0x9fdcff, 0x4a8cff, 0x1a2a90],
    tongues: [
      ['rgba(90,160,255,0.85)', 'rgba(50,90,230,0.55)', 'rgba(20,30,130,0)'],
      ['rgba(130,205,255,0.9)', 'rgba(70,140,255,0.65)', 'rgba(40,60,200,0)'],
      ['rgba(215,245,255,0.95)', 'rgba(130,205,255,0.75)', 'rgba(70,140,255,0)'],
      ['rgba(255,255,255,1)', 'rgba(225,248,255,0.9)', 'rgba(160,220,255,0)'],
    ],
    shadow: 'rgba(90,170,255,0.85)',
    ground: 0x70a8ff, stone: 0x6098ff, tree: 0x5088ff, bed: 0x4a90ff, light: 0xa8d0ff,
  },
};
