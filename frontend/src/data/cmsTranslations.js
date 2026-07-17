export const translationStatusOptions = [
  { value: 'source', label: { en: 'Source', bn: 'উৎস' } },
  { value: 'pending', label: { en: 'Pending', bn: 'অপেক্ষমাণ' } },
  { value: 'translated', label: { en: 'Translated', bn: 'অনুবাদিত' } },
  { value: 'reviewed', label: { en: 'Reviewed', bn: 'পর্যালোচিত' } }
];

export const sourceLanguageOptions = [
  { value: 'en', label: { en: 'English', bn: 'ইংরেজি' } },
  { value: 'bn', label: { en: 'Bangla', bn: 'বাংলা' } }
];

export const defaultTranslationWorkflow = {
  sourceLanguage: 'en',
  enStatus: 'source',
  bnStatus: 'pending'
};
