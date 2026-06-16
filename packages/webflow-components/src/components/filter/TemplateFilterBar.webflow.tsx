import { declareComponent } from '@webflow/react';
import { props } from '@webflow/data-types';
import { TemplateFilterBar } from './TemplateFilterBar';

export default declareComponent(TemplateFilterBar, {
  name: 'Template Filter Bar',
  description:
    'Renders styled category/subcategory pills plus Style, Type, Sort, Search, and Free-Only filter controls for the template marketplace. Communicates with Template Grid via URL params — place both on the same page.',
  group: 'Marketplace',
  props: {
    apiBase: props.Text({
      name: 'API Base URL',
      defaultValue: '',
      tooltip:
        'Base URL for the template search API (no trailing slash). Leave blank for production default. Must match the API Base URL set on Template Grid.',
    }),
    scopeOverride: props.Variant({
      name: 'Scope (preview)',
      options: ['all', 'featured', 'free', 'landing_pages'],
      defaultValue: 'all',
      tooltip:
        'For Designer preview of special pages. "all" = auto-detect from URL in production. Set "free", "featured", or "landing_pages" to preview page-specific pills in Designer.',
    }),
    categorySlug: props.Text({
      name: 'Category Slug (preview)',
      defaultValue: '',
      tooltip:
        'Category group slug for Designer preview, e.g. "architecture-and-design-websites". Production auto-detects from /templates/category/{slug}.',
    }),
    creatorSlug: props.Text({
      name: 'Creator Slug (preview)',
      defaultValue: '',
      tooltip:
        'Creator/designer slug for Designer preview, e.g. "brix-templates". Production auto-detects from /templates/designers/{slug}.',
    }),
    creatorRecordId: props.Text({
      name: 'Creator Record ID',
      defaultValue: '',
      tooltip:
        'Optional exact creator Airtable/Webflow sync record ID. Bind this on designer profile pages when available; otherwise creator slug is used.',
    }),
    subcategorySlug: props.Text({
      name: 'Subcategory Slug (preview)',
      defaultValue: '',
      tooltip:
        'Subcategory slug for Designer preview, e.g. "ai-websites". Production auto-detects from /templates/subcategory/{slug}.',
    }),
    styleSlug: props.Text({
      name: 'Style Slug (preview)',
      defaultValue: '',
      tooltip:
        'Style slug for Designer preview, e.g. "modern". Production auto-detects from /templates/style/{slug}.',
    }),
    tagSlug: props.Text({
      name: 'Tag Slug (preview)',
      defaultValue: '',
      tooltip:
        'Tag slug for Designer preview, e.g. "automation". Production auto-detects from /templates/tag/{slug}.',
    }),
    showSearch: props.Boolean({
      name: 'Show Search',
      defaultValue: false,
      tooltip: 'Show the keyword search input.',
    }),
    showStyles: props.Boolean({
      name: 'Show Styles',
      defaultValue: true,
      tooltip: 'Show the Style dropdown. Options are fetched from the API.',
    }),
    showTypes: props.Boolean({
      name: 'Show Types',
      defaultValue: true,
      tooltip: 'Show the Type dropdown. Options are fetched from the API.',
    }),
    showSort: props.Boolean({
      name: 'Show Sort',
      defaultValue: true,
      tooltip: 'Show sort controls. Presentation is controlled by Sort Display.',
    }),
    sortDisplay: props.Variant({
      name: 'Sort Display',
      options: ['auto', 'dropdown', 'segmented'],
      defaultValue: 'auto',
      tooltip:
        'Controls sort presentation. Auto and Dropdown use Landing page dropdown styling; Segmented uses the two-button Free page style.',
    }),
    showFreeOnly: props.Boolean({
      name: 'Show Free Only',
      defaultValue: false,
      tooltip: 'Show the Free Only checkbox. Not needed on pages that are already scoped to free.',
    }),
    showSubcategoryPills: props.Boolean({
      name: 'Show Subcategory Pills',
      defaultValue: true,
      tooltip: 'Show the category/subcategory pill row above the Style/Type/Sort controls when the page has a scoped template listing.',
    }),
    defaultSort: props.Variant({
      name: 'Default Sort',
      options: ['popular', 'newest', 'price_asc', 'price_desc'],
      defaultValue: 'popular',
      tooltip: 'Fallback sort when no ?sort= param is present. Should match Template Grid\'s Default Sort.',
    }),
    searchPlaceholder: props.Text({
      name: 'Search Placeholder',
      defaultValue: 'Search templates…',
      tooltip: 'Placeholder text for the search input.',
    }),
    stylesAllLabel: props.Text({
      name: 'Styles: All Label',
      defaultValue: 'All Styles',
      tooltip: 'Label for the "show all styles" option in the Style dropdown.',
    }),
    stylesLabel: props.Text({
      name: 'Styles: Button Label',
      defaultValue: 'Style',
      tooltip: 'Label shown on the closed Style dropdown when no styles are selected.',
    }),
    typesAllLabel: props.Text({
      name: 'Types: All Label',
      defaultValue: 'All Types',
      tooltip: 'Label for the "show all types" option in the Type dropdown.',
    }),
    typesLabel: props.Text({
      name: 'Types: Button Label',
      defaultValue: 'Type',
      tooltip: 'Label shown on the closed Type dropdown when no type is selected.',
    }),
    freeOnlyLabel: props.Text({
      name: 'Free Only Label',
      defaultValue: 'Free only',
      tooltip: 'Label for the Free Only checkbox.',
    }),
  },
});
