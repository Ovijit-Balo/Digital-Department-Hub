import { useEffect } from 'react';

const DEFAULT_TITLE = 'Digital Department Hub';

export default function usePageMeta({ title, description } = {}) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = title.includes('Digital Department Hub')
        ? title
        : `${title} | Digital Department Hub`;
    }

    let metaTag = document.querySelector('meta[name="description"]');
    const hadMeta = Boolean(metaTag);
    const previousDescription = metaTag?.getAttribute('content') ?? '';

    if (description) {
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'description');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (description && metaTag) {
        if (hadMeta) {
          metaTag.setAttribute('content', previousDescription);
        } else {
          metaTag.remove();
        }
      }
    };
  }, [title, description]);
}
