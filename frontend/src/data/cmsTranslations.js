export const translationStatusOptions = [
  { value: 'source', label: 'Source' },
  { value: 'pending', label: 'Pending' },
  { value: 'translated', label: 'Translated' },
  { value: 'reviewed', label: 'Reviewed' }
];

export const sourceLanguageOptions = [
  { value: 'en', label: 'English' },
  { value: 'bn', label: 'Bangla' }
];

export const defaultTranslationWorkflow = {
  sourceLanguage: 'en',
  enStatus: 'source',
  bnStatus: 'pending'
};
