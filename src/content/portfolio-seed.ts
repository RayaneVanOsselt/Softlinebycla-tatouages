/**
 * Portfolio initial, construit à partir des photos et vidéos fournies dans `ressources/`.
 * Tout est ensuite modifiable depuis l'administration (titres, textes, ordre, mise en avant, publication).
 * Catégories = styles réellement visibles dans les réalisations (aucune spécialité inventée).
 */
import type { Localized } from "@/lib/db/schema";

export interface SeedCategory {
  slug: string;
  name: Localized;
}

export interface SeedProject {
  slug: string;
  category: string;
  media: string[];
  featured?: boolean;
  title: Required<Localized>;
  description: Required<Localized>;
  alt: Required<Localized>;
  focal?: [number, number];
}

export const seedCategories: SeedCategory[] = [
  { slug: "floral-nature", name: { fr: "Floral & nature", nl: "Bloemen & natuur", en: "Floral & nature" } },
  { slug: "lettering", name: { fr: "Lettrage", nl: "Lettering", en: "Lettering" } },
  { slug: "minimal", name: { fr: "Minimaliste", nl: "Minimalistisch", en: "Minimal" } },
  { slug: "illustration", name: { fr: "Illustration", nl: "Illustratie", en: "Illustration" } },
  { slug: "studies", name: { fr: "Études & flash", nl: "Studies & flash", en: "Studies & flash" } },
];

export const seedProjects: SeedProject[] = [
  {
    slug: "lys-avant-bras",
    category: "floral-nature",
    media: ["video-floral-forearm"],
    featured: true,
    title: { fr: "Lys sur l'avant-bras", nl: "Lelies op de onderarm", en: "Lilies on the forearm" },
    description: {
      fr: "Composition de lys en fine line qui suit la ligne de l'avant-bras, ponctuée de petites étoiles.",
      nl: "Een fine line-compositie van lelies die de lijn van de onderarm volgt, met kleine sterretjes.",
      en: "A fine line composition of lilies following the line of the forearm, dotted with tiny stars.",
    },
    alt: {
      fr: "Vidéo d'un tatouage fine line de lys sur l'avant-bras",
      nl: "Video van een fine line-tatoeage met lelies op de onderarm",
      en: "Video of a fine line lily tattoo on the forearm",
    },
  },
  {
    slug: "papillon-fleuri",
    category: "floral-nature",
    media: ["img-5984"],
    featured: true,
    title: { fr: "Papillon fleuri", nl: "Bloeiende vlinder", en: "Blooming butterfly" },
    description: {
      fr: "Un bouquet de fleurs délicates qui se fond dans les ailes d'un papillon, à l'arrière du bras.",
      nl: "Een boeket fijne bloemen dat overgaat in de vleugels van een vlinder, op de achterkant van de arm.",
      en: "A bouquet of delicate flowers melting into the wings of a butterfly, on the back of the arm.",
    },
    alt: {
      fr: "Tatouage fine line d'un papillon et de fleurs à l'arrière du bras",
      nl: "Fine line-tatoeage van een vlinder met bloemen op de achterkant van de arm",
      en: "Fine line tattoo of a butterfly and flowers on the back of the arm",
    },
    focal: [55, 55],
  },
  {
    slug: "lys-et-papillon",
    category: "floral-nature",
    media: ["img-5966"],
    featured: true,
    title: { fr: "Lys & papillon", nl: "Lelie & vlinder", en: "Lily & butterfly" },
    description: {
      fr: "Une tige de lys tracée en lignes fines, prolongée par un papillon aux ailes ombrées.",
      nl: "Een leliestengel in fijne lijnen, aangevuld met een vlinder met gearceerde vleugels.",
      en: "A lily stem drawn in fine lines, extended by a butterfly with shaded wings.",
    },
    alt: {
      fr: "Tatouage fine line d'une tige de lys et d'un papillon",
      nl: "Fine line-tatoeage van een leliestengel en een vlinder",
      en: "Fine line tattoo of a lily stem and a butterfly",
    },
    focal: [50, 40],
  },
  {
    slug: "envol-de-papillons",
    category: "floral-nature",
    media: ["img-5983"],
    featured: true,
    title: { fr: "Envol de papillons", nl: "Vlinders in vlucht", en: "Butterflies in flight" },
    description: {
      fr: "Trois papillons et quelques éclats d'étoiles qui remontent le long du bras.",
      nl: "Drie vlinders en enkele sterretjes die langs de arm omhoog dwarrelen.",
      en: "Three butterflies and a few star sparks drifting up the arm.",
    },
    alt: {
      fr: "Tatouage de trois papillons et d'étoiles sur le bras",
      nl: "Tatoeage van drie vlinders en sterren op de arm",
      en: "Tattoo of three butterflies and stars on the arm",
    },
    focal: [55, 45],
  },
  {
    slug: "perfectly-imperfect",
    category: "lettering",
    media: ["img-5982"],
    featured: true,
    title: { fr: "Perfectly imperfect", nl: "Perfectly imperfect", en: "Perfectly imperfect" },
    description: {
      fr: "Une citation manuscrite en lettrage fin, déroulée le long de l'avant-bras.",
      nl: "Een handgeschreven citaat in fijne lettering, langs de onderarm.",
      en: "A handwritten quote in fine lettering, running along the forearm.",
    },
    alt: {
      fr: "Tatouage lettrage « Perfectly imperfect » sur l'avant-bras",
      nl: "Lettering-tatoeage „Perfectly imperfect” op de onderarm",
      en: "“Perfectly imperfect” lettering tattoo on the forearm",
    },
  },
  {
    slug: "lys-et-citation",
    category: "lettering",
    media: ["img-5958"],
    featured: true,
    title: { fr: "Lys & citation", nl: "Lelie & citaat", en: "Lily & quote" },
    description: {
      fr: "Une citation en écriture fine, une petite croix et un lys réunis sur l'avant-bras.",
      nl: "Een citaat in fijn schrift, een klein kruis en een lelie samen op de onderarm.",
      en: "A quote in fine script, a small cross and a lily together on the forearm.",
    },
    alt: {
      fr: "Tatouage fine line : citation, croix et lys sur l'avant-bras",
      nl: "Fine line-tatoeage: citaat, kruis en lelie op de onderarm",
      en: "Fine line tattoo: quote, cross and lily on the forearm",
    },
    focal: [45, 45],
  },
  {
    slug: "croix-et-roses",
    category: "floral-nature",
    media: ["img-5967"],
    featured: true,
    title: { fr: "Croix & roses", nl: "Kruis & rozen", en: "Cross & roses" },
    description: {
      fr: "Roses et feuillages ombrés enveloppant une croix, sur toute la longueur de l'avant-bras.",
      nl: "Gearceerde rozen en bladeren rond een kruis, over de hele onderarm.",
      en: "Shaded roses and foliage wrapping around a cross, along the whole forearm.",
    },
    alt: {
      fr: "Tatouage de roses ombrées autour d'une croix sur l'avant-bras",
      nl: "Tatoeage van gearceerde rozen rond een kruis op de onderarm",
      en: "Tattoo of shaded roses around a cross on the forearm",
    },
    focal: [35, 55],
  },
  {
    slug: "rose-sur-la-main",
    category: "floral-nature",
    media: ["img-5965"],
    title: { fr: "Rose sur la main", nl: "Roos op de hand", en: "Rose on the hand" },
    description: {
      fr: "Une rose ombrée posée sur le dos de la main, en écho à la composition de l'avant-bras.",
      nl: "Een gearceerde roos op de rug van de hand, in harmonie met de onderarm.",
      en: "A shaded rose on the back of the hand, echoing the forearm piece.",
    },
    alt: {
      fr: "Tatouage d'une rose ombrée sur le dos de la main",
      nl: "Tatoeage van een gearceerde roos op de rug van de hand",
      en: "Tattoo of a shaded rose on the back of the hand",
    },
    focal: [50, 65],
  },
  {
    slug: "rose-et-ecriture",
    category: "floral-nature",
    media: ["img-5970"],
    title: { fr: "Rose & écriture", nl: "Roos & schrift", en: "Rose & script" },
    description: {
      fr: "Une rose sur sa tige accompagnée d'une ligne d'écriture, sur l'intérieur de l'avant-bras.",
      nl: "Een roos op haar stengel met een regel schrift, aan de binnenkant van de onderarm.",
      en: "A long-stemmed rose with a line of script on the inner forearm.",
    },
    alt: {
      fr: "Tatouage fine line d'une rose et d'une écriture sur l'avant-bras",
      nl: "Fine line-tatoeage van een roos en schrift op de onderarm",
      en: "Fine line tattoo of a rose and script on the forearm",
    },
  },
  {
    slug: "bouquet-et-prenom",
    category: "floral-nature",
    media: ["img-5976"],
    title: { fr: "Bouquet & prénom", nl: "Boeket & naam", en: "Bouquet & name" },
    description: {
      fr: "Un bouquet fin et un prénom calligraphié réunis sur l'avant-bras.",
      nl: "Een fijn boeket en een gekalligrafeerde naam op de onderarm.",
      en: "A delicate bouquet and a calligraphed name on the forearm.",
    },
    alt: {
      fr: "Tatouage d'un bouquet de fleurs et d'un prénom sur l'avant-bras",
      nl: "Tatoeage van een bloemenboeket en een naam op de onderarm",
      en: "Tattoo of a flower bouquet and a name on the forearm",
    },
  },
  {
    slug: "fine-line-sur-la-jambe",
    category: "floral-nature",
    media: ["img-5980"],
    title: { fr: "Fine line sur la jambe", nl: "Fine line op het been", en: "Fine line on the leg" },
    description: {
      fr: "Motifs botaniques en lignes fines sur la jambe.",
      nl: "Botanische motieven in fijne lijnen op het been.",
      en: "Botanical motifs in fine lines on the leg.",
    },
    alt: {
      fr: "Tatouages fine line botaniques sur la jambe",
      nl: "Botanische fine line-tatoeages op het been",
      en: "Botanical fine line tattoos on the leg",
    },
  },
  {
    slug: "ohana",
    category: "lettering",
    media: ["img-5981"],
    title: { fr: "Ohana", nl: "Ohana", en: "Ohana" },
    description: {
      fr: "Lettrage cursif et dates reliées par une ligne pointillée, comme un arbre de famille.",
      nl: "Cursieve lettering en data verbonden door een stippellijn, als een stamboom.",
      en: "Cursive lettering and dates linked by a dotted line, like a family tree.",
    },
    alt: {
      fr: "Tatouage lettrage « Ohana » avec des dates",
      nl: "Lettering-tatoeage „Ohana” met data",
      en: "“Ohana” lettering tattoo with dates",
    },
  },
  {
    slug: "prenoms-entrelaces",
    category: "lettering",
    media: ["img-5972"],
    title: { fr: "Prénoms entrelacés", nl: "Verweven namen", en: "Intertwined names" },
    description: {
      fr: "Plusieurs prénoms en écriture cursive, liés par une même ligne et de petits cœurs.",
      nl: "Meerdere namen in sierschrift, verbonden door één lijn en kleine hartjes.",
      en: "Several names in cursive script, joined by a single line and small hearts.",
    },
    alt: {
      fr: "Tatouage de prénoms en écriture cursive",
      nl: "Tatoeage van namen in sierschrift",
      en: "Tattoo of names in cursive script",
    },
  },
  {
    slug: "chiffres-romains",
    category: "lettering",
    media: ["img-5974", "img-5973"],
    title: { fr: "Chiffres romains", nl: "Romeinse cijfers", en: "Roman numerals" },
    description: {
      fr: "Chiffres romains à empattements, nets et alignés le long de l'avant-bras.",
      nl: "Romeinse cijfers met schreven, strak uitgelijnd langs de onderarm.",
      en: "Serif Roman numerals, crisp and aligned along the forearm.",
    },
    alt: {
      fr: "Tatouage de chiffres romains sur l'avant-bras",
      nl: "Tatoeage van Romeinse cijfers op de onderarm",
      en: "Roman numerals tattoo on the forearm",
    },
  },
  {
    slug: "date",
    category: "lettering",
    media: ["img-5977"],
    title: { fr: "Une date", nl: "Een datum", en: "A date" },
    description: {
      fr: "Une date en chiffres fins, discrète, à l'arrière du bras.",
      nl: "Een datum in fijne cijfers, discreet op de achterkant van de arm.",
      en: "A date in fine numerals, discreet on the back of the arm.",
    },
    alt: { fr: "Tatouage d'une date en chiffres fins", nl: "Tatoeage van een datum in fijne cijfers", en: "Tattoo of a date in fine numerals" },
  },
  {
    slug: "annee-2006",
    category: "lettering",
    media: ["img-5978"],
    title: { fr: "2006", nl: "2006", en: "2006" },
    description: {
      fr: "Une année en chiffres italiques, sur l'avant-bras.",
      nl: "Een jaartal in cursieve cijfers, op de onderarm.",
      en: "A year in italic numerals, on the forearm.",
    },
    alt: { fr: "Tatouage de l'année 2006 en chiffres italiques", nl: "Tatoeage van het jaartal 2006 in cursieve cijfers", en: "Tattoo of the year 2006 in italic numerals" },
  },
  {
    slug: "infini",
    category: "minimal",
    media: ["img-5969"],
    title: { fr: "Infini", nl: "Oneindig", en: "Infinity" },
    description: {
      fr: "Un symbole de l'infini tracé d'un seul trait, habité de mots.",
      nl: "Een oneindigheidsteken in één lijn, met woorden erin verweven.",
      en: "An infinity symbol drawn in a single line, woven with words.",
    },
    alt: { fr: "Tatouage d'un symbole infini avec des mots", nl: "Tatoeage van een oneindigheidsteken met woorden", en: "Infinity symbol tattoo with words" },
  },
  {
    slug: "sablier",
    category: "minimal",
    media: ["img-5975"],
    title: { fr: "Sablier", nl: "Zandloper", en: "Hourglass" },
    description: {
      fr: "Un petit sablier ombré, sur l'épaule.",
      nl: "Een kleine gearceerde zandloper, op de schouder.",
      en: "A small shaded hourglass, on the shoulder.",
    },
    alt: { fr: "Petit tatouage de sablier sur l'épaule", nl: "Kleine zandlopertatoeage op de schouder", en: "Small hourglass tattoo on the shoulder" },
  },
  {
    slug: "symbole",
    category: "minimal",
    media: ["img-5959"],
    title: { fr: "Symbole", nl: "Symbool", en: "Symbol" },
    description: {
      fr: "Un symbole graphique aux lignes pleines, sous la clavicule.",
      nl: "Een grafisch symbool met volle lijnen, onder het sleutelbeen.",
      en: "A bold-lined graphic symbol, below the collarbone.",
    },
    alt: { fr: "Tatouage d'un symbole graphique sous la clavicule", nl: "Tatoeage van een grafisch symbool onder het sleutelbeen", en: "Graphic symbol tattoo below the collarbone" },
  },
  {
    slug: "ailes",
    category: "illustration",
    media: ["img-5971"],
    title: { fr: "Ailes", nl: "Vleugels", en: "Wings" },
    description: {
      fr: "Une paire d'ailes déployées au creux des reins.",
      nl: "Een paar gespreide vleugels onderaan de rug.",
      en: "A pair of spread wings on the lower back.",
    },
    alt: { fr: "Tatouage d'ailes dans le bas du dos", nl: "Tatoeage van vleugels onderaan de rug", en: "Wings tattoo on the lower back" },
  },
  {
    slug: "personnage-line-art",
    category: "illustration",
    media: ["img-5961"],
    title: { fr: "Personnage en line art", nl: "Personage in line art", en: "Line art character" },
    description: {
      fr: "Un personnage dessiné uniquement au trait, sur le mollet.",
      nl: "Een personage, enkel met lijnen getekend, op de kuit.",
      en: "A character drawn in outline only, on the calf.",
    },
    alt: { fr: "Tatouage d'un personnage en line art sur le mollet", nl: "Tatoeage van een personage in line art op de kuit", en: "Line art character tattoo on the calf" },
  },
  {
    slug: "etude-dague-fleurie",
    category: "studies",
    media: ["video-dagger-study"],
    title: { fr: "Étude — dague fleurie", nl: "Studie — bloemendolk", en: "Study — floral dagger" },
    description: {
      fr: "Dague, fleurs et masque travaillés sur peau d'entraînement.",
      nl: "Dolk, bloemen en masker uitgewerkt op oefenhuid.",
      en: "Dagger, flowers and mask worked on practice skin.",
    },
    alt: { fr: "Vidéo d'une étude de dague fleurie sur peau d'entraînement", nl: "Video van een studie van een bloemendolk op oefenhuid", en: "Video of a floral dagger study on practice skin" },
  },
  {
    slug: "etude-rose",
    category: "studies",
    media: ["img-5964"],
    title: { fr: "Étude — rose ombrée", nl: "Studie — gearceerde roos", en: "Study — shaded rose" },
    description: {
      fr: "Travail du dégradé et des volumes sur une rose, sur peau d'entraînement.",
      nl: "Oefening in schaduw en volume op een roos, op oefenhuid.",
      en: "Shading and volume practice on a rose, on practice skin.",
    },
    alt: { fr: "Étude d'une rose ombrée sur peau d'entraînement", nl: "Studie van een gearceerde roos op oefenhuid", en: "Shaded rose study on practice skin" },
  },
  {
    slug: "etude-sablier",
    category: "studies",
    media: ["img-5979"],
    title: { fr: "Étude — sablier", nl: "Studie — zandloper", en: "Study — hourglass" },
    description: {
      fr: "Un sablier aux lignes nettes et ombrages, sur peau d'entraînement.",
      nl: "Een zandloper met strakke lijnen en schaduw, op oefenhuid.",
      en: "An hourglass with crisp lines and shading, on practice skin.",
    },
    alt: { fr: "Étude d'un sablier sur peau d'entraînement", nl: "Studie van een zandloper op oefenhuid", en: "Hourglass study on practice skin" },
  },
  {
    slug: "etude-planche-florale",
    category: "studies",
    media: ["img-5962"],
    title: { fr: "Étude — planche florale", nl: "Studie — bloemenplaat", en: "Study — floral sheet" },
    description: {
      fr: "Fleurs, lettrage et motifs réunis sur une même planche d'entraînement.",
      nl: "Bloemen, lettering en motieven samen op één oefenplaat.",
      en: "Flowers, lettering and motifs brought together on one practice sheet.",
    },
    alt: { fr: "Planche d'entraînement avec fleurs et lettrage", nl: "Oefenplaat met bloemen en lettering", en: "Practice sheet with flowers and lettering" },
  },
  {
    slug: "etude-compositions",
    category: "studies",
    media: ["img-5960"],
    title: { fr: "Étude — compositions", nl: "Studie — composities", en: "Study — compositions" },
    description: {
      fr: "Plusieurs motifs au trait travaillés sur peau d'entraînement.",
      nl: "Verschillende lijnmotieven uitgewerkt op oefenhuid.",
      en: "Several line motifs worked on practice skin.",
    },
    alt: { fr: "Motifs au trait sur peau d'entraînement", nl: "Lijnmotieven op oefenhuid", en: "Line motifs on practice skin" },
  },
];
