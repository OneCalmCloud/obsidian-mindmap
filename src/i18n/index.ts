import i18next from 'i18next'
import zh from './zh'
import en from './en'
import ru from './ru';
import fr from './fr';
import ja from './ja';
import ko from './ko';
import pt from './pt';

i18next.init({
  fallbackLng: 'en',
  lng: 'en',
  // debug: true,
  resources: {
    zh,
    en,
    ru,
    fr,
    ja,
    ko,
    pt,
  },
});

export default i18next