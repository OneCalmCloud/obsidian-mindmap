import i18next from 'i18next'
import zh from './zh'
import en from './en'

i18next.init({
  fallbackLng: 'en',
  lng: 'en',
  // debug: true,
  resources: {
    zh,
    en,
  }
})

export default i18next