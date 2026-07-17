import useLanguage from '../../hooks/useLanguage';
import { toLocalizedText } from '../../utils/localized';

// Shared bilingual labels for the CMS Studio authoring forms (Page/News/Blog/
// Gallery + the SEO/schedule and translation-workflow field groups). Keeping
// them in one place avoids drift between the four near-identical forms.
export const CMS_FORM_TEXT = {
  titleEn: { en: 'Title (EN)', bn: 'শিরোনাম (ইংরেজি)' },
  titleBn: { en: 'Title (BN)', bn: 'শিরোনাম (বাংলা)' },
  contentEn: { en: 'Content (EN)', bn: 'বিষয়বস্তু (ইংরেজি)' },
  contentBn: { en: 'Content (BN)', bn: 'বিষয়বস্তু (বাংলা)' },
  summaryEn: { en: 'Summary (EN)', bn: 'সারসংক্ষেপ (ইংরেজি)' },
  summaryBn: { en: 'Summary (BN)', bn: 'সারসংক্ষেপ (বাংলা)' },
  excerptEn: { en: 'Excerpt (EN)', bn: 'উদ্ধৃতাংশ (ইংরেজি)' },
  excerptBn: { en: 'Excerpt (BN)', bn: 'উদ্ধৃতাংশ (বাংলা)' },
  bodyEn: { en: 'Body (EN)', bn: 'মূল অংশ (ইংরেজি)' },
  bodyBn: { en: 'Body (BN)', bn: 'মূল অংশ (বাংলা)' },
  descriptionEn: { en: 'Description (EN)', bn: 'বর্ণনা (ইংরেজি)' },
  descriptionBn: { en: 'Description (BN)', bn: 'বর্ণনা (বাংলা)' },
  publishStatus: { en: 'Publish Status', bn: 'প্রকাশনার অবস্থা' },
  draft: { en: 'Draft', bn: 'খসড়া' },
  published: { en: 'Published', bn: 'প্রকাশিত' },
  tags: { en: 'Tags (comma separated)', bn: 'ট্যাগ (কমা দিয়ে পৃথক)' },
  coverImage: { en: 'Cover Image (optional)', bn: 'কভার ছবি (ঐচ্ছিক)' },
  pageSlug: { en: 'Page Slug', bn: 'পেজ স্লাগ' },
  blogSlug: { en: 'Blog Slug', bn: 'ব্লগ স্লাগ' },
  gallerySlug: { en: 'Gallery Slug', bn: 'গ্যালারি স্লাগ' },
  postType: { en: 'Post Type', bn: 'পোস্টের ধরন' },
  news: { en: 'News', bn: 'সংবাদ' },
  announcement: { en: 'Announcement', bn: 'ঘোষণা' },
  writeContentEn: { en: 'Write page content in English', bn: 'ইংরেজিতে পাতার বিষয়বস্তু লিখুন' },
  writeContentBn: { en: 'Write page content in Bangla', bn: 'বাংলায় পাতার বিষয়বস্তু লিখুন' },
  writeNewsEn: { en: 'Write detailed news body in English', bn: 'ইংরেজিতে বিস্তারিত সংবাদ লিখুন' },
  writeNewsBn: { en: 'Write detailed news body in Bangla', bn: 'বাংলায় বিস্তারিত সংবাদ লিখুন' },
  writeBlogEn: { en: 'Write blog body in English', bn: 'ইংরেজিতে ব্লগ লিখুন' },
  writeBlogBn: { en: 'Write blog body in Bangla', bn: 'বাংলায় ব্লগ লিখুন' },
  updatePage: { en: 'Update Page', bn: 'পাতা আপডেট' },
  createPage: { en: 'Create Page', bn: 'পাতা তৈরি' },
  updateItem: { en: 'Update Item', bn: 'আইটেম আপডেট' },
  createItem: { en: 'Create Item', bn: 'আইটেম তৈরি' },
  updateBlog: { en: 'Update Blog', bn: 'ব্লগ আপডেট' },
  createBlog: { en: 'Create Blog', bn: 'ব্লগ তৈরি' },
  updateGallery: { en: 'Update Gallery', bn: 'গ্যালারি আপডেট' },
  createGallery: { en: 'Create Gallery', bn: 'গ্যালারি তৈরি' },
  // Gallery item editor
  addMediaItem: { en: 'Add Media Item', bn: 'মিডিয়া আইটেম যোগ করুন' },
  mediaItem: { en: 'Media Item', bn: 'মিডিয়া আইটেম' },
  remove: { en: 'Remove', bn: 'সরান' },
  mediaType: { en: 'Media Type', bn: 'মিডিয়ার ধরন' },
  image: { en: 'Image', bn: 'ছবি' },
  video: { en: 'Video', bn: 'ভিডিও' },
  mediaUrl: { en: 'Media URL', bn: 'মিডিয়া URL' },
  thumbnailUrl: { en: 'Thumbnail URL (optional)', bn: 'থাম্বনেইল URL (ঐচ্ছিক)' },
  captionEn: { en: 'Caption (EN)', bn: 'ক্যাপশন (ইংরেজি)' },
  captionBn: { en: 'Caption (BN)', bn: 'ক্যাপশন (বাংলা)' },
  order: { en: 'Order', bn: 'ক্রম' },
  galleryMedia: { en: 'Gallery Media', bn: 'গ্যালারি মিডিয়া' },
  galleryMediaItems: { en: 'Gallery Media Items', bn: 'গ্যালারি মিডিয়া আইটেম' },
  addMedia: { en: 'Add Media', bn: 'মিডিয়া যোগ করুন' },
  itemPrefix: { en: 'Item', bn: 'আইটেম' },
  mediaUploadLabel: { en: 'Media (image upload or URL)', bn: 'মিডিয়া (ছবি আপলোড বা URL)' },
  // Translation workflow fields
  sourceLanguage: { en: 'Source Language', bn: 'উৎস ভাষা' },
  english: { en: 'English', bn: 'ইংরেজি' },
  bangla: { en: 'Bangla', bn: 'বাংলা' },
  translationStatus: { en: 'Translation Status', bn: 'অনুবাদের অবস্থা' },
  pending: { en: 'Pending', bn: 'অপেক্ষমাণ' },
  inProgress: { en: 'In progress', bn: 'চলমান' },
  complete: { en: 'Complete', bn: 'সম্পূর্ণ' },
  // SEO / schedule
  seoSchedule: { en: 'SEO & Scheduling (optional)', bn: 'এসইও ও সময়সূচি (ঐচ্ছিক)' },
  metaTitleEn: { en: 'Meta Title (EN)', bn: 'মেটা শিরোনাম (ইংরেজি)' },
  metaTitleBn: { en: 'Meta Title (BN)', bn: 'মেটা শিরোনাম (বাংলা)' },
  metaDescEn: { en: 'Meta Description (EN)', bn: 'মেটা বিবরণ (ইংরেজি)' },
  metaDescBn: { en: 'Meta Description (BN)', bn: 'মেটা বিবরণ (বাংলা)' },
  scheduleAt: { en: 'Schedule publish at', bn: 'প্রকাশের সময় নির্ধারণ' },
  metaTitlePlaceholder: {
    en: 'Overrides the browser tab / search title',
    bn: 'ব্রাউজার ট্যাব / সার্চ শিরোনাম প্রতিস্থাপন করে'
  },
  metaDescPlaceholder: {
    en: 'Short summary shown in search results (max ~160 chars)',
    bn: 'সার্চ ফলাফলে দেখানো সংক্ষিপ্ত সারসংক্ষেপ (সর্বোচ্চ ~১৬০ অক্ষর)'
  },
  scheduleHint: {
    en: 'Leave empty to publish immediately. With status set to “Published”, the item stays hidden from the public site until this time.',
    bn: 'তৎক্ষণাৎ প্রকাশ করতে খালি রাখুন। অবস্থা “প্রকাশিত” থাকলেও, এই সময়ের আগ পর্যন্ত আইটেমটি পাবলিক সাইটে দেখা যাবে না।'
  },
  enTranslationStatus: { en: 'EN Translation Status', bn: 'ইংরেজি অনুবাদের অবস্থা' },
  bnTranslationStatus: { en: 'BN Translation Status', bn: 'বাংলা অনুবাদের অবস্থা' }
};

export default function useCmsFormText() {
  const { language } = useLanguage();
  return (key) => toLocalizedText(CMS_FORM_TEXT[key], language);
}
