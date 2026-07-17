import { sourceLanguageOptions, translationStatusOptions } from '../../../data/cmsTranslations';
import useLanguage from '../../../hooks/useLanguage';
import { toLocalizedText } from '../../../utils/localized';
import useCmsFormText from '../cmsFormText';

export function TranslationWorkflowFields({ value, onChange }) {
  const t = useCmsFormText();
  const { language } = useLanguage();
  const optionLabel = (option) => toLocalizedText(option.label, language);

  return (
    <div className="workflow-grid">
      <label>
        {t('sourceLanguage')}
        <select
          value={value.sourceLanguage}
          onChange={(event) => onChange('sourceLanguage', event.target.value)}
        >
          {sourceLanguageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('enTranslationStatus')}
        <select
          value={value.enStatus}
          onChange={(event) => onChange('enStatus', event.target.value)}
        >
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t('bnTranslationStatus')}
        <select
          value={value.bnStatus}
          onChange={(event) => onChange('bnStatus', event.target.value)}
        >
          {translationStatusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default TranslationWorkflowFields;
