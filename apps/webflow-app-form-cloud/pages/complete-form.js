import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { track } from '@vercel/analytics';
import { TriangleAlert } from 'lucide-react';
import FormField from '../components/FormField';
import TextAreaField from '../components/TextAreaField';
import CheckboxGroup from '../components/CheckboxGroup';
import { withBasePath } from '../lib/runtimePaths';

const QuillEditor = dynamic(() => import('../components/QuillEditor'), { ssr: false });
const DEFAULT_UPDATE_TOGGLES_ENABLED = process.env.NEXT_PUBLIC_UPDATE_TOGGLES_ENABLED === 'true';
const DEFAULT_AUTOFILL_UPDATE_ENABLED = process.env.NEXT_PUBLIC_AUTOFILL_UPDATE_ENABLED === 'true';

function parseScopesField(scopesField) {
  if (Array.isArray(scopesField)) {
    return scopesField.filter(Boolean);
  }

  if (typeof scopesField !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(scopesField);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return scopesField
      .split(/\n|,/)
      .map((scope) => scope.trim())
      .filter(Boolean);
  }
}

function parseFeaturesText(featuresText) {
  if (typeof featuresText !== 'string') {
    return [];
  }

  return featuresText
    .split('\n')
    .map((feature) => feature.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 5);
}

function parseSupportField(supportField = '') {
  const parts = String(supportField)
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  const supportEmail = parts.find((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) || '';
  const supportUrl = parts.find((part) => /^https?:\/\//i.test(part)) || '';

  if (!supportEmail && !supportUrl && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supportField.trim())) {
    return { supportEmail: supportField.trim(), supportUrl: '' };
  }

  if (!supportEmail && !supportUrl && /^https?:\/\//i.test(supportField.trim())) {
    return { supportEmail: '', supportUrl: supportField.trim() };
  }

  return { supportEmail, supportUrl };
}

export default function CompleteMarketplaceForm() {
  // Feature flag: Update flow toggles
  const [updateTogglesEnabled, setUpdateTogglesEnabled] = useState(DEFAULT_UPDATE_TOGGLES_ENABLED);

  // Feature flag: Auto-fill update from Airtable
  const [autofillUpdateEnabled, setAutofillUpdateEnabled] = useState(DEFAULT_AUTOFILL_UPDATE_ENABLED);
  const [autofillToken, setAutofillToken] = useState('');
  const [isLoadingAppData, setIsLoadingAppData] = useState(false);
  const [airtableImages, setAirtableImages] = useState({
    appIcon: null,      // { url, filename }
    screenshots: []     // [{ url, filename }, ...]
  });
  // Track original data from Airtable to detect changes
  const [originalFormData, setOriginalFormData] = useState(null);

  // Track which sections are enabled for updating
  // Smart defaults: commonly updated sections start expanded
  const [updateSections, setUpdateSections] = useState({
    appIcon: true,           // Commonly updated - branding changes
    appCapabilities: false,
    paymentAndVisibility: false,
    category: false,
    creatorInfo: false,
    descriptions: true,      // Commonly updated - marketing copy
    screenshots: true,       // Commonly updated - visual updates
    features: false,
    urls: false,
    credentials: false,
    supportInfo: false,      // Support URLs, privacy policy, terms
  });

  // Dark mode detection
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect feature flags on mount
  useEffect(() => {
    let nextUpdateTogglesEnabled = DEFAULT_UPDATE_TOGGLES_ENABLED;
    let nextAutofillUpdateEnabled = DEFAULT_AUTOFILL_UPDATE_ENABLED;

    // First, check iframe's own URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    let updateTogglesFlag = urlParams.get('updateToggles');
    let autofillUpdateFlag = urlParams.get('autofillUpdate');

    // If not found and we're in an iframe, try to read parent URL
    if ((!updateTogglesFlag || !autofillUpdateFlag) && window.parent !== window) {
      try {
        const parentParams = new URLSearchParams(window.parent.location.search);
        if (!updateTogglesFlag) updateTogglesFlag = parentParams.get('updateToggles');
        if (!autofillUpdateFlag) autofillUpdateFlag = parentParams.get('autofillUpdate');
      } catch (e) {
        // Cross-origin access blocked - this is expected for security
      }
    }

    // Set feature flags
    if (updateTogglesFlag === 'true') {
      nextUpdateTogglesEnabled = true;
    } else if (updateTogglesFlag === 'false') {
      nextUpdateTogglesEnabled = false;
    }

    if (autofillUpdateFlag === 'true') {
      nextAutofillUpdateEnabled = true;
    } else if (autofillUpdateFlag === 'false') {
      nextAutofillUpdateEnabled = false;
    }

    setUpdateTogglesEnabled(nextUpdateTogglesEnabled);
    setAutofillUpdateEnabled(nextAutofillUpdateEnabled);

    // Listen for feature flags from parent via postMessage
    const handleFeatureFlagMessage = (event) => {
      // Verify the message is about feature flags
      if (event.data && event.data.type === 'featureFlag') {
        if (event.data.updateToggles !== undefined) {
          setUpdateTogglesEnabled(event.data.updateToggles === true || event.data.updateToggles === 'true');
        }
        if (event.data.autofillUpdate !== undefined) {
          setAutofillUpdateEnabled(event.data.autofillUpdate === true || event.data.autofillUpdate === 'true');
        }
      }
    };

    window.addEventListener('message', handleFeatureFlagMessage);

    return () => {
      window.removeEventListener('message', handleFeatureFlagMessage);
    };
  }, []);

  useEffect(() => {
    // Check for dark mode preference
    const checkDarkMode = () => {
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(darkModeMediaQuery.matches);
    };

    // Initial check
    checkDarkMode();

    // Listen for changes
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setIsDarkMode(e.matches);

    if (darkModeMediaQuery.addEventListener) {
      darkModeMediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      darkModeMediaQuery.addListener(handleChange);
    }

    return () => {
      if (darkModeMediaQuery.removeEventListener) {
        darkModeMediaQuery.removeEventListener('change', handleChange);
      } else {
        darkModeMediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formStatus, setFormStatus] = useState({ type: '', message: '' });

  const [formData, setFormData] = useState({
    // App Info
    submissionType: '',
    appName: '',
    clientId: '',
    appCapabilities: '',
    appInstallUrl: '',
    appScopes: [], // Array of selected API scopes
    appAvatarImage: null,
    appAvatarAltText: '',
    paymentType: [], // Array to allow both Free and Paid
    visibility: [], // Array to allow selection (though only one should be selected)
    appCategory: [],

    // Creator Info
    creatorName: '',
    creatorWebsite: '',
    creatorContactEmail: '',

    // App Details
    appPreviewDescription: '',
    appDetailDescription: '',
    appScreenshots: [],
    appScreenshotAltTexts: ['', '', '', '', ''],
    appVideoUrl: '',
    appChangelogUrl: '',
    appPrivacyPolicyUrl: '',
    appFeaturesOverview: ['', '', '', '', ''], // Array of 5 features
    appWebsiteUrl: '',
    appDeveloperNotes: '',

    // App Access Credentials
    appAccessCredentials: '',
    credentialsTierConfirmation: false,

    // Support Info
    appDemoVideoUrl: '',
    appSupportEmail: '',
    appSupportUrl: '',
    appTermsUrl: '',

    // Agreement
    agreementAccepted: false
  });

  // Scope selection state
  const [selectedScope, setSelectedScope] = useState('');
  const [originalScopes, setOriginalScopes] = useState([]);
  const [scopeJustification, setScopeJustification] = useState('');

  const [validationState, setValidationState] = useState({
    clientIdVerified: false,
    clientIdVerifying: false,
    clientIdError: '',
    errors: {},
    // Inline error messages for specific sections
    avatarFileError: '',
    screenshotFileErrors: ['', '', '', '', ''], // One error per screenshot slot
    supportError: '',
    featuresError: '',
    screenshotsCountError: '',
    fileSizeError: '',
    submissionError: '',
    requiredFields: new Set([
      'submissionType', 'appName', 'clientId', 'appCapabilities', 'appInstallUrl',
      'appAvatarImage', 'appAvatarAltText', 'paymentType', 'visibility', 'appCategory',
      'creatorName', 'creatorWebsite', 'creatorContactEmail', 'appPreviewDescription',
      'appDetailDescription', 'appFeaturesOverview', 'appWebsiteUrl', 'appAccessCredentials', 'credentialsTierConfirmation',
      'appDemoVideoUrl', 'appPrivacyPolicyUrl', 'appTermsUrl', 'agreementAccepted'
      // Note: appSupportEmail and appSupportUrl are either/or - handled separately
    ])
  });

  // Refs for file inputs
  const quillDetailRef = useRef();
  const avatarFileRef = useRef();
  const screenshotFileRefs = useRef([]);

  // Initialize screenshot refs
  useEffect(() => {
    screenshotFileRefs.current = Array(5).fill(null).map(() => ({ current: null }));
  }, []);

  // Handle form field changes
  const handleInputChange = (name, value) => {
    // Validate app name doesn't contain "Webflow"
    if (name === 'appName' && value && /webflow/i.test(value)) {
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          appName: 'App name cannot contain "Webflow". Please choose a different name.'
        }
      }));
      return; // Don't update the value
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation errors
    if (validationState.errors[name]) {
      setValidationState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [name]: undefined
        }
      }));
    }

    // Handle submission type changes - clear Client ID validation
    if (name === 'submissionType') {
      setAutofillToken('');
      setOriginalFormData(null);
      setOriginalScopes([]);
      setAirtableImages({ appIcon: null, screenshots: [] });
      setScopeJustification('');
      setValidationState(prev => ({
        ...prev,
        clientIdVerified: false,
        clientIdError: formData.clientId ? 'Please verify the Client ID for the new submission type.' : ''
      }));
    }

    // Handle Client ID changes - require re-verification
    if (name === 'clientId') {
      setAutofillToken('');
      setOriginalFormData(null);
      setOriginalScopes([]);
      setAirtableImages({ appIcon: null, screenshots: [] });
      setScopeJustification('');
      setValidationState(prev => ({
        ...prev,
        clientIdVerified: false,
        clientIdError: value && prev.clientIdVerified ? 'Client ID has not yet been verified or has been changed. Please verify it.' : ''
      }));
    }

    // Clear Install URL when switching to Designer Extension (not needed for that app type)
    if (name === 'appCapabilities' && value === 'Designer Extension') {
      setFormData(prev => ({
        ...prev,
        appInstallUrl: ''
      }));
    }
  };

  // Scope handlers
  const handleAddScope = () => {
    if (selectedScope && !formData.appScopes.includes(selectedScope)) {
      setFormData(prev => ({ ...prev, appScopes: [...prev.appScopes, selectedScope] }));
      setSelectedScope('');
    }
  };

  const handleRemoveScope = (scope) => {
    setFormData(prev => ({ ...prev, appScopes: prev.appScopes.filter(s => s !== scope) }));
  };

  const scopesChanged = () => {
    return JSON.stringify([...formData.appScopes].sort()) !== JSON.stringify([...originalScopes].sort());
  };

  // Check if field is required based on submission type
  const isFieldRequired = (fieldName) => {
    if (formData.submissionType === 'Update') {
      // Client ID, Submission Type, and Agreement are required for updates
      return ['clientId', 'submissionType', 'agreementAccepted'].includes(fieldName);
    }
    return validationState.requiredFields.has(fieldName);
  };

  // Toggle section for updates
  const toggleUpdateSection = (sectionName) => {
    setUpdateSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  // Check if we should show a section (either not in update mode, or toggles disabled, or section is enabled)
  const shouldShowSection = (sectionName) => {
    if (formData.submissionType !== 'Update') return true;
    if (!updateTogglesEnabled) return true;
    return updateSections[sectionName];
  };

  // Valid client IDs are 64-character hexadecimal strings (SHA-256 hashes)
  const CLIENT_ID_PATTERN = /^[a-f0-9]{64}$/i;

  // Verify Client ID
  const verifyClientId = async () => {
    const clientIdValue = formData.clientId;
    const submissionType = formData.submissionType;

    // Check if the client ID input is empty
    if (clientIdValue === '') {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Please enter a valid Client ID to verify.',
        clientIdVerified: false
      }));
      return;
    }

    // Validate format before API call
    if (!CLIENT_ID_PATTERN.test(clientIdValue)) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Invalid format. Client ID must be a 64-character hexadecimal string.',
        clientIdVerified: false
      }));
      return;
    }

    // Check if submission type is selected
    if (submissionType === '') {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Please select a submission type before verifying.',
        clientIdVerified: false
      }));
      return;
    }

    // Clear previous messages
    setValidationState(prev => ({
      ...prev,
      clientIdVerifying: true,
      clientIdError: '',
      clientIdVerified: false
    }));

    try {
      const response = await fetch(withBasePath('/api/verify-client-id'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientIdValue,
          submissionType: submissionType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Handle different scenarios based on clientIdExists and submission type
      if (data.clientIdExists && submissionType === 'Update') {
        track('Client ID Verified', { submissionType: 'Update', status: 'success' });
        setAutofillToken(data.autofillToken || '');
        setValidationState(prev => ({
          ...prev,
          clientIdVerifying: false,
          clientIdVerified: true,
          clientIdError: ''
        }));
      } else if (!data.clientIdExists && submissionType === 'Update') {
        track('Client ID Verification Failed', { submissionType: 'Update', reason: 'not_found' });
        setAutofillToken('');
        setValidationState(prev => ({
          ...prev,
          clientIdVerifying: false,
          clientIdVerified: false,
          clientIdError: 'Client ID unverified. Please double-check input or submit as a new app.'
        }));
      } else if (data.clientIdExists && submissionType === 'New') {
        track('Client ID Verification Failed', { submissionType: 'New', reason: 'already_exists' });
        setAutofillToken('');
        setValidationState(prev => ({
          ...prev,
          clientIdVerifying: false,
          clientIdVerified: false,
          clientIdError: 'Client ID taken. Please submit an update.'
        }));
      } else if (!data.clientIdExists && submissionType === 'New') {
        track('Client ID Verified', { submissionType: 'New', status: 'success' });
        setAutofillToken('');
        setValidationState(prev => ({
          ...prev,
          clientIdVerifying: false,
          clientIdVerified: true,
          clientIdError: ''
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setAutofillToken('');
      setValidationState(prev => ({
        ...prev,
        clientIdVerifying: false,
        clientIdVerified: false,
        clientIdError: 'An error occurred. Please try again.'
      }));
    }
  };

  // Load existing app data from Airtable (autofillUpdate feature)
  const loadAppData = async () => {
    if (!formData.clientId || !validationState.clientIdVerified) {
      return;
    }

    if (!autofillToken) {
      setFormStatus({
        type: 'error',
        message: 'Autofill authorization is missing or expired. Please verify the Client ID again.'
      });
      return;
    }

    setIsLoadingAppData(true);

    try {
      const response = await fetch(withBasePath(`/api/airtable/get-app?clientId=${encodeURIComponent(formData.clientId)}`), {
        headers: {
          'x-autofill-token': autofillToken
        }
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setFormStatus({
          type: 'error',
          message: data.message || 'Failed to load app data'
        });
        setIsLoadingAppData(false);
        return;
      }

      // Map Airtable fields to form state
      const fields = data.app.fields;

      // Handle support email/URL - field contains both in a single field
      const { supportEmail, supportUrl } = parseSupportField(fields['🔗Support Email/URL'] || '');

      // Build the loaded data object
      const loadedData = {
        submissionType: 'Update',
        appName: fields['Name'] || '',
        appCapabilities: fields['ℹ️Capabilities (🖥️ only)'] || '',
        appInstallUrl: fields['🔗Install URL (🖥️ only)'] || '',
        appScopes: parseScopesField(fields['ℹ️Scopes'] || fields['Scopes'] || fields['all-selected-scopes']),
        appAvatarAltText: fields['App Avatar Alt Text'] || '',
        // Payment type is already an array in Airtable
        paymentType: fields['ℹ️💲Payment Types'] || [],
        // Visibility is a string, wrap in array
        visibility: fields['ℹ️Visibility (🖥️ only)'] ? [fields['ℹ️Visibility (🖥️ only)']] : [],
        // Categories come as array of strings
        appCategory: fields['ℹ️🪣Categories (Text)'] || [],
        creatorName: fields['🎨Creator Name'] || '',
        creatorWebsite: fields['👀🎨📧 Creator WF Account Email (Override)'] || '',
        creatorContactEmail: fields['🎨📧 Creator Email'] || '',
        appPreviewDescription: fields['ℹ️Description (Short)'] || '',
        appDetailDescription: fields['ℹ️Description (Long).html'] || '',
        appScreenshotAltTexts: [
          fields['Alt Text Screenshot 1'] || '',
          fields['Alt Text Screenshot 2'] || '',
          fields['Alt Text Screenshot 3'] || '',
          fields['Alt Text Screenshot 4'] || '',
          fields['Alt Text Screenshot 5'] || ''
        ],
        appFeaturesOverview: parseFeaturesText(fields['❓ℹ️✨Features Text (MIGRATE TO LINKED FIELD)']),
        appWebsiteUrl: fields['🔗Website URL'] || '',
        appDeveloperNotes: fields['Developer Notes'] || '',
        appAccessCredentials: fields['ℹ️Credentials'] || '',
        appVideoUrl: fields['🔗Promo Video URL (🖥️ only)'] || '',
        appDemoVideoUrl: fields['🔗Demo Video URL'] || '',
        appPrivacyPolicyUrl: fields['🔗Privacy Policy URL'] || '',
        appSupportEmail: supportEmail || '',
        appSupportUrl: supportUrl || '',
        appTermsUrl: fields['🔗Terms & Conditions URL'] || ''
      };

      // Save original data for change detection
      setOriginalFormData(loadedData);
      setOriginalScopes(loadedData.appScopes || []);

      // Update form with loaded data
      setFormData(prev => ({
        ...prev,
        ...loadedData
      }));

      // Extract image URLs from Airtable
      const thumbnailImages = fields['🖼️Thumbnail Image'];
      const carouselImages = fields['🖼️Carousel Images'];

      setAirtableImages({
        appIcon: thumbnailImages?.[0] ? {
          url: thumbnailImages[0].url,
          filename: thumbnailImages[0].filename,
          thumbnails: thumbnailImages[0].thumbnails
        } : null,
        screenshots: carouselImages?.map(img => ({
          url: img.url,
          filename: img.filename,
          thumbnails: img.thumbnails
        })) || []
      });

      track('App Data Loaded', { clientId: formData.clientId });
      setIsLoadingAppData(false);
      setFormStatus({
        type: 'success',
        message: 'App data loaded successfully! Review and update the fields you want to change.'
      });

    } catch (error) {
      console.error('Failed to load app data:', error);
      setFormStatus({
        type: 'error',
        message: 'An error occurred while loading app data. Please try again.'
      });
      setIsLoadingAppData(false);
    }
  };

  // Handle file uploads
  const handleFileUpload = (fieldName, file, index = null) => {
    if (!file) return;

    // Clear previous errors for this field
    if (fieldName === 'appAvatarImage') {
      setValidationState(prev => ({ ...prev, avatarFileError: '' }));
    } else if (fieldName === 'appScreenshots' && index !== null) {
      setValidationState(prev => {
        const newErrors = [...prev.screenshotFileErrors];
        newErrors[index] = '';
        return { ...prev, screenshotFileErrors: newErrors };
      });
    }

    // Validate filename length (100 char limit per Admin requirements)
    const MAX_FILENAME_LENGTH = 100;
    if (file.name.length > MAX_FILENAME_LENGTH) {
      const errorMsg = `Filename is too long (${file.name.length} characters). Maximum is ${MAX_FILENAME_LENGTH} characters. Please rename the file and try again.`;

      if (fieldName === 'appAvatarImage') {
        setValidationState(prev => ({ ...prev, avatarFileError: errorMsg }));
      } else if (fieldName === 'appScreenshots' && index !== null) {
        setValidationState(prev => {
          const newErrors = [...prev.screenshotFileErrors];
          newErrors[index] = errorMsg;
          return { ...prev, screenshotFileErrors: newErrors };
        });
      }
      return;
    }

    // Validate individual file size (2MB per file)
    const maxFileSize = 2 * 1024 * 1024; // 2MB per file
    if (file.size > maxFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const errorMsg = `File "${file.name}" is too large (${sizeMB}MB). Maximum file size is 2MB. Please compress the image and try again.`;

      if (fieldName === 'appAvatarImage') {
        setValidationState(prev => ({ ...prev, avatarFileError: errorMsg }));
      } else if (fieldName === 'appScreenshots' && index !== null) {
        setValidationState(prev => {
          const newErrors = [...prev.screenshotFileErrors];
          newErrors[index] = errorMsg;
          return { ...prev, screenshotFileErrors: newErrors };
        });
      }
      return;
    }

    // Validate image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Clean up the object URL
      URL.revokeObjectURL(objectUrl);

      let expectedDimensions;
      let dimensionError = false;

      // Check dimensions based on field type
      if (fieldName === 'appAvatarImage') {
        expectedDimensions = '900px by 900px';
        if (img.width !== 900 || img.height !== 900) {
          dimensionError = true;
        }
      } else if (fieldName === 'appScreenshots') {
        expectedDimensions = '1280px by 846px';
        if (img.width !== 1280 || img.height !== 846) {
          dimensionError = true;
        }
      }

      if (dimensionError) {
        const errorMsg = `Image dimensions are incorrect. Expected: ${expectedDimensions} | Actual: ${img.width}px by ${img.height}px. Please resize your image and try again.`;

        if (fieldName === 'appAvatarImage') {
          setValidationState(prev => ({ ...prev, avatarFileError: errorMsg }));
        } else if (fieldName === 'appScreenshots' && index !== null) {
          setValidationState(prev => {
            const newErrors = [...prev.screenshotFileErrors];
            newErrors[index] = errorMsg;
            return { ...prev, screenshotFileErrors: newErrors };
          });
        }

        // Clear the file input
        if (fieldName === 'appAvatarImage' && avatarFileRef.current) {
          avatarFileRef.current.value = '';
        } else if (fieldName === 'appScreenshots' && index !== null && screenshotFileRefs.current[index]) {
          screenshotFileRefs.current[index].value = '';
        }
        return;
      }

      // Dimensions are correct, update form data
      if (fieldName === 'appScreenshots' && index !== null) {
        track('Screenshot Uploaded', { index: index + 1, fileSize: file.size });
        setFormData(prev => {
          const newScreenshots = [...prev.appScreenshots];
          newScreenshots[index] = file;
          return {
            ...prev,
            appScreenshots: newScreenshots
          };
        });
      } else {
        track('Avatar Uploaded', { fileSize: file.size });
        setFormData(prev => ({
          ...prev,
          [fieldName]: file
        }));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const errorMsg = 'Failed to load image. Please make sure the file is a valid image.';

      if (fieldName === 'appAvatarImage') {
        setValidationState(prev => ({ ...prev, avatarFileError: errorMsg }));
      } else if (fieldName === 'appScreenshots' && index !== null) {
        setValidationState(prev => {
          const newErrors = [...prev.screenshotFileErrors];
          newErrors[index] = errorMsg;
          return { ...prev, screenshotFileErrors: newErrors };
        });
      }

      // Clear the file input
      if (fieldName === 'appAvatarImage' && avatarFileRef.current) {
        avatarFileRef.current.value = '';
      } else if (fieldName === 'appScreenshots' && index !== null && screenshotFileRefs.current[index]) {
        screenshotFileRefs.current[index].value = '';
      }
    };

    img.src = objectUrl;
  };


  // Handle payment type change (allow multiple selection like original)
  const handlePaymentTypeChange = (value) => {
    const currentPaymentTypes = [...formData.paymentType];
    const index = currentPaymentTypes.indexOf(value);

    if (index > -1) {
      currentPaymentTypes.splice(index, 1);
    } else {
      currentPaymentTypes.push(value);
    }

    track('Payment Type Selected', { paymentTypes: currentPaymentTypes.join(', ') });
    handleInputChange('paymentType', currentPaymentTypes);

    // Validate immediately like original form
    validatePaymentType(currentPaymentTypes);
  };

  // Handle visibility change (exclusive selection like original)
  const handleVisibilityChange = (value) => {
    const currentVisibility = [...formData.visibility];

    if (currentVisibility.includes(value)) {
      // If clicking the same option, unselect it
      track('Visibility Changed', { visibility: 'none' });
      handleInputChange('visibility', []);
      validateVisibility([]);
    } else {
      // If clicking a different option, select only that one (exclusive)
      track('Visibility Changed', { visibility: value });
      handleInputChange('visibility', [value]);
      validateVisibility([value]);
    }
  };

  // Validate payment type selection
  const validatePaymentType = (paymentTypes) => {
    const isValid = paymentTypes.length > 0;
    setValidationState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        paymentType: isValid ? undefined : 'Please select at least one payment type (Free and/or Paid).'
      }
    }));
    return isValid;
  };

  // Validate visibility selection
  const validateVisibility = (visibility) => {
    const isValid = visibility.length > 0;
    setValidationState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        visibility: isValid ? undefined : 'Please select marketplace visibility (Public or Private).'
      }
    }));
    return isValid;
  };

  // Trigger file upload
  const triggerFileUpload = (fileInputRef) => {
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleActionButtonKeyDown = (event, action) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };



  // Check required fields
  const checkRequiredFields = () => {
    const errors = {};
    validationState.requiredFields.forEach(field => {
      if (isFieldRequired(field)) {
        const value = formData[field];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          errors[field] = 'This field is required';
        }
      }
    });
    return errors;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormStatus({ type: '', message: '' });

    // Clear all previous inline errors
    setValidationState(prev => ({
      ...prev,
      supportError: '',
      featuresError: '',
      screenshotsCountError: '',
      fileSizeError: '',
      submissionError: ''
    }));

    // Validate checkbox groups like original form (only for non-Update submissions)
    if (formData.submissionType !== 'Update') {
      const paymentTypeValid = validatePaymentType(formData.paymentType);
      const visibilityValid = validateVisibility(formData.visibility);

      if (!paymentTypeValid || !visibilityValid) {
        // Scroll to first error like original form
        const firstError = document.querySelector('.validation-error-message[style*="display: block"]');
        if (firstError) {
          firstError.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        const firstInvalidControl = !paymentTypeValid
          ? document.getElementById('Checkbox-Free')
          : document.getElementById('Checkbox-Public');
        firstInvalidControl?.focus({ preventScroll: true });
        setIsSubmitting(false);
        return;
      }
    }

    // Validate Client ID verification for both New and Update submissions
    if (formData.clientId && !validationState.clientIdVerified) {
      setValidationState(prev => ({
        ...prev,
        clientIdError: 'Please verify your Client ID before submitting.'
      }));

      // Scroll to Client ID field
      const clientIdField = document.getElementById('client-id');
      if (clientIdField) {
        clientIdField.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      setIsSubmitting(false);
      return;
    }

    // Validate Support Email/URL - exactly one is required (either/or, not both)
    if (formData.submissionType !== 'Update') {
      const hasEmail = formData.appSupportEmail && formData.appSupportEmail.trim() !== '';
      const hasUrl = formData.appSupportUrl && formData.appSupportUrl.trim() !== '';

      if (!hasEmail && !hasUrl) {
        setValidationState(prev => ({
          ...prev,
          supportError: 'Please provide either a Support Email OR Support URL.'
        }));

        // Scroll to support section
        const supportSection = document.getElementById('App-Support-Email');
        if (supportSection) {
          supportSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        setIsSubmitting(false);
        return;
      }

      if (hasEmail && hasUrl) {
        setValidationState(prev => ({
          ...prev,
          supportError: 'Please provide EITHER a Support Email OR Support URL, not both.'
        }));

        // Scroll to support section
        const supportSection = document.getElementById('App-Support-Email');
        if (supportSection) {
          supportSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        setIsSubmitting(false);
        return;
      }
    }

    // Validate App Avatar Image - required for new submissions
    if (formData.submissionType !== 'Update' && !avatarFileRef.current?.files?.[0]) {
      setValidationState(prev => ({
        ...prev,
        avatarFileError: 'App icon is required. Please upload a 900px by 900px image.'
      }));

      // Scroll to avatar section
      const avatarSection = document.getElementById('App-Avatar-Image-2');
      if (avatarSection) {
        avatarSection.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      setIsSubmitting(false);
      return;
    }

    // Validate Features Overview - at least one feature is required
    const hasFeatures = formData.appFeaturesOverview.some(feature => feature.trim() !== '');
    if (isFieldRequired('appFeaturesOverview') && !hasFeatures) {
      setValidationState(prev => ({
        ...prev,
        featuresError: 'Please provide at least one app feature.'
      }));

      // Scroll to features section
      const featuresSection = document.getElementById('Feature-1');
      if (featuresSection) {
        featuresSection.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      setIsSubmitting(false);
      return;
    }

    // Format features overview as numbered list
    const featuresText = formData.appFeaturesOverview
      .filter(feature => feature.trim() !== '')
      .map((feature, index) => `${index + 1}. ${feature}`)
      .join('\n');

    // Create FormData object to handle file uploads
    const formDataToSubmit = new FormData();

    // Add all text fields with formatted features
    const finalFormData = {
      ...formData,
      appFeaturesOverview: featuresText
    };

    // Helper function to check if a value has changed from original
    const hasChanged = (key, currentValue) => {
      // If no original data (new submission), all fields have "changed"
      if (!originalFormData) return true;

      // Special case: always include submissionType and clientId
      if (key === 'submissionType' || key === 'clientId') return true;

      const originalValue = originalFormData[key];

      // Compare arrays
      if (Array.isArray(currentValue) && Array.isArray(originalValue)) {
        if (currentValue.length !== originalValue.length) return true;
        return !currentValue.every((val, idx) => val === originalValue[idx]);
      }

      // Compare strings/other values
      return currentValue !== originalValue;
    };

    // Add all form fields to FormData - only include changed fields for autofill updates
    Object.keys(finalFormData).forEach(key => {
      const value = finalFormData[key];
      const changed = hasChanged(key, value);

      // Only send fields that have changed (or for new submissions, send everything)
      if (!changed) {
        // Skip unchanged fields entirely - don't send them at all
        return;
      }

      if (Array.isArray(value)) {
        // Handle arrays (like categories, scopes)
        value.forEach(item => {
          formDataToSubmit.append(key, item);
        });
      } else if (value !== null && value !== undefined) {
        formDataToSubmit.append(key, value);
      }
    });

    // Validate minimum screenshots (4 recommended, only for New submissions)
    const screenshotCount = screenshotFileRefs.current.filter(ref => ref?.files?.[0]).length;
    if (formData.submissionType !== 'Update' && screenshotCount < 4) {
      setValidationState(prev => ({
        ...prev,
        screenshotsCountError: `We recommend uploading at least 4 screenshots to show key workflows. You currently have ${screenshotCount} screenshot(s).`
      }));

      // Scroll to screenshots section
      const screenshotsSection = document.querySelector('[id*="Screenshot"]');
      if (screenshotsSection) {
        screenshotsSection.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      setIsSubmitting(false);
      return;
    }

    // Validate file sizes before upload
    let totalFileSize = 0;
    const maxTotalSize = 4 * 1024 * 1024; // 4MB total limit for Vercel

    if (avatarFileRef.current?.files?.[0]) {
      totalFileSize += avatarFileRef.current.files[0].size;
    }

    screenshotFileRefs.current.forEach((ref) => {
      if (ref?.files?.[0]) {
        totalFileSize += ref.files[0].size;
      }
    });

    if (totalFileSize > maxTotalSize) {
      const sizeMB = (totalFileSize / (1024 * 1024)).toFixed(2);
      setValidationState(prev => ({
        ...prev,
        fileSizeError: `Total file size (${sizeMB}MB) exceeds the 4MB limit. Please compress your images or upload fewer screenshots.`
      }));

      // Scroll to top of form to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setIsSubmitting(false);
      return;
    }

    // Add uploaded files
    if (avatarFileRef.current?.files?.[0]) {
      formDataToSubmit.append('avatar', avatarFileRef.current.files[0]);
    }

    // Add screenshot files and their alt texts
    const consolidatedAltTexts = [];
    screenshotFileRefs.current.forEach((ref, index) => {
      if (ref?.files?.[0]) {
        formDataToSubmit.append('screenshots', ref.files[0]);
        // Include alt text for this screenshot
        const altText = finalFormData.appScreenshotAltTexts[index] || '';
        formDataToSubmit.append(`screenshotAltText${index}`, altText);

        // Add to consolidated list if not empty
        if (altText) {
          consolidatedAltTexts.push(`${index + 1}. ${altText}`);
        }
      }
    });

    // Add consolidated screenshot alt texts as numbered list
    if (consolidatedAltTexts.length > 0) {
      formDataToSubmit.append('consolidatedScreenshotAltTexts', consolidatedAltTexts.join('\n'));
    }

    // Add scope justification if scopes changed for Update submissions
    if (formData.submissionType === 'Update' && scopesChanged() && scopeJustification) {
      formDataToSubmit.append('Scope-Justification', scopeJustification);
    }

    try {
      const response = await fetch(withBasePath('/api/submit-form'), {
        method: 'POST',
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
        body: formDataToSubmit
      });

      // Handle 413 Payload Too Large error
      if (response.status === 413) {
        setValidationState(prev => ({
          ...prev,
          submissionError: 'File size too large. Please compress your images and try again. Total upload size must be under 4MB.'
        }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, show the raw response
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text.substring(0, 100)}`);
      }

      if (response.ok) {
        // Track successful submission
        track('Form Submitted', {
          submissionType: formData.submissionType,
          paymentType: formData.paymentType.join(', '),
          visibility: formData.visibility[0] || 'none',
          category: formData.appCategory.join(', '),
          screenshotCount: screenshotCount
        });

        // Show success state
        setSubmissionSuccess(true);

        // Try multiple scroll methods for iframe context
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        } catch (e) {
          // Scroll attempt failed - expected in some iframe contexts
        }

        // Notify parent frame if in iframe
        if (window.parent !== window) {
          // Notify parent of successful submission
          window.parent.postMessage({
            type: 'FORM_SUBMITTED',
            data: finalFormData,
            filesUploaded: result.filesUploaded || 0
          }, '*');

          // Request parent to scroll to iframe top
          window.parent.postMessage({
            type: 'SCROLL_TO_FORM',
            source: 'webflow-form-app'
          }, '*');

          // Also try hash change which some parent pages respond to
          try {
            window.parent.location.hash = '#form-top';
          } catch (e) {
            // Cross-origin restriction, expected
          }
        }
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setValidationState(prev => ({
        ...prev,
        submissionError: `Error: ${error.message}`
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      // Re-enable submit button (unless submission was successful)
      if (!submissionSuccess) {
        setIsSubmitting(false);
      }
    }
  };

  // Style inheritance from parent
  useEffect(() => {
    // Request styles from parent
    if (window.parent !== window) {
      // Send initial request for styles
      window.parent.postMessage({
        type: 'REQUEST_STYLES',
        source: 'webflow-form-app'
      }, '*');

      // Request styles periodically in case parent page updates
      const intervalId = setInterval(() => {
        window.parent.postMessage({
          type: 'REQUEST_STYLES',
          source: 'webflow-form-app'
        }, '*');
      }, 5000);

      return () => clearInterval(intervalId);
    }
  }, []);

  // Listen for style updates from parent
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'PARENT_STYLES' && event.data.source === 'webflow-parent') {
        // Apply inherited styles through CSS variables
        const styles = event.data.styles;
        const root = document.documentElement;

        // Set CSS variables that components can use
        if (styles.fontFamily) root.style.setProperty('--webflow-font-family', styles.fontFamily);
        if (styles.fontSize) root.style.setProperty('--webflow-font-size', styles.fontSize);
        if (styles.color) root.style.setProperty('--webflow-color', styles.color);
        if (styles.backgroundColor) root.style.setProperty('--webflow-background-color', styles.backgroundColor);
        if (styles.lineHeight) root.style.setProperty('--webflow-line-height', styles.lineHeight);

        // Apply CSS variables from parent
        if (styles.cssVariables) {
          Object.entries(styles.cssVariables).forEach(([property, value]) => {
            root.style.setProperty(property, value);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Handle iframe resizing
  useEffect(() => {
    let lastSentHeight = 0;
    let isResizing = false;

    const sendHeight = () => {
      if (window.parent !== window && !isResizing) {
        const body = document.body;
        const html = document.documentElement;
        const height = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight
        );

        // Only send if height has changed significantly (more than 10px)
        if (Math.abs(height - lastSentHeight) > 10) {
          isResizing = true;
          lastSentHeight = height;

          window.parent.postMessage({
            type: 'RESIZE_IFRAME',
            height: height,
            source: 'webflow-form-app'
          }, '*');

          // Reset the flag after a short delay
          setTimeout(() => {
            isResizing = false;
          }, 100);
        }
      }
    };

    // Send height on load and whenever it changes
    sendHeight();

    // Monitor for height changes with debouncing
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(sendHeight, 50);
    });

    if (document.body) {
      resizeObserver.observe(document.body);
    }

    // Also send on form state changes with debouncing
    let mutationTimeout;
    const observer = new MutationObserver(() => {
      clearTimeout(mutationTimeout);
      mutationTimeout = setTimeout(sendHeight, 100);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    // Send height when content settles
    const timeouts = [500, 1000].map(delay =>
      setTimeout(sendHeight, delay)
    );

    return () => {
      resizeObserver.disconnect();
      observer.disconnect();
      timeouts.forEach(clearTimeout);
      clearTimeout(resizeTimeout);
      clearTimeout(mutationTimeout);
    };
  }, [formData]);

  // Handle anchor link clicks for iframe context
  // Standard anchor links don't work when iframe has scrolling disabled
  useEffect(() => {
    const handleAnchorClick = (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const targetId = link.getAttribute('href').slice(1);
      const targetElement = document.getElementById(targetId);

      if (targetElement) {
        e.preventDefault();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // Handle query parameters for submission type
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    if (type) {
      handleInputChange('submissionType', type === 'update' ? 'Update' : 'New');
    }
  }, []);

  // Apply dark mode class to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Handle HTML5 validation errors
  useEffect(() => {
    const form = document.getElementById('wf-form-Marketplace-App-Submission');
    if (!form) return;

    const handleInvalid = (e) => {
      e.preventDefault();
      const target = e.target;

      // Scroll to the invalid field
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Add error styling
      target.classList.add('error');
      target.setAttribute('aria-invalid', 'true');

      // Show custom error message
      let errorMessage = target.validationMessage;

      // Customize common error messages
      if (target.validity.typeMismatch && target.type === 'url') {
        errorMessage = 'Please enter a valid URL starting with http:// or https://';
      } else if (target.validity.valueMissing) {
        errorMessage = 'This field is required';
      }

      // Try to find or create error message element
      let errorElement = target.parentElement.querySelector('.validation-error-message');
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'validation-error-message cc-error_text';
        target.parentElement.appendChild(errorElement);
      }

      const targetId = target.id || `${target.name || 'field'}-${Date.now()}`;
      if (!target.id) {
        target.id = targetId;
      }
      const errorElementId = `${target.id}-error`;
      errorElement.id = errorElementId;
      errorElement.textContent = errorMessage;
      errorElement.style.display = 'block';

      const existingDescribedBy = target.getAttribute('aria-describedby');
      const describedByIds = [existingDescribedBy, errorElementId].filter(Boolean).join(' ');
      target.setAttribute('aria-describedby', describedByIds);

      target.focus({ preventScroll: true });

      // Clear error on input
      const clearError = () => {
        target.classList.remove('error');
        target.removeAttribute('aria-invalid');
        if (errorElement) {
          errorElement.style.display = 'none';
        }
        const existingDescribedBy = (target.getAttribute('aria-describedby') || '')
          .split(' ')
          .filter(Boolean)
          .filter((id) => id !== errorElementId)
          .join(' ');
        if (existingDescribedBy) {
          target.setAttribute('aria-describedby', existingDescribedBy);
        } else {
          target.removeAttribute('aria-describedby');
        }
        target.removeEventListener('input', clearError);
      };
      target.addEventListener('input', clearError);
    };

    // Add invalid event listeners to all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('invalid', handleInvalid);
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('invalid', handleInvalid);
      });
    };
  }, []);

  // Toggle component for Update mode
  const SectionToggle = ({ sectionName, label, description }) => {
    if (formData.submissionType !== 'Update' || !updateTogglesEnabled) return null;

    const isEnabled = updateSections[sectionName];

    return (
      <div style={{
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: isDarkMode
          ? 'var(--_color---neutral--gray-900, #171717)'
          : 'var(--_color---neutral--gray-100, #f0f0f0)',
        borderRadius: '8px',
        border: `2px solid ${isEnabled
          ? 'var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))'
          : 'var(--colors--border, var(--_color---neutral--gray-400, #898989))'}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
      onClick={() => toggleUpdateSection(sectionName)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px',
            height: '24px',
            backgroundColor: isEnabled
              ? 'var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))'
              : 'var(--_color---neutral--gray-400, #898989)',
            borderRadius: '12px',
            position: 'relative',
            transition: 'background-color 0.2s ease'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: isEnabled ? '22px' : '2px',
              transition: 'left 0.2s ease',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
              {label}
            </div>
            {description && (
              <div style={{ fontSize: '0.875rem', color: 'var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a))' }}>
                {description}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`u-mb-0 w-form ${isDarkMode ? 'dark-mode' : ''}`}>
        <form
          id="wf-form-Marketplace-App-Submission"
          name="wf-form-Marketplace-App-Submission"
          className="form-wrapper"
          onSubmit={handleSubmit}
          style={{display: submissionSuccess ? 'none' : 'block'}}
        >

        {/* General Form Errors */}
        {(formStatus.message || validationState.fileSizeError || validationState.submissionError) && (
          <div className="form-section" style={{marginBottom: '2rem'}}>
            {formStatus.message && (
              <div
                className={`status-banner status-banner-${formStatus.type || 'info'}`}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {formStatus.message}
              </div>
            )}
            {validationState.fileSizeError && (
              <div className="cc-error_text" style={{
                display: 'block',
                backgroundColor: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
                {validationState.fileSizeError}
              </div>
            )}
            {validationState.submissionError && (
              <div className="cc-error_text" style={{
                display: 'block',
                backgroundColor: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '1rem'
              }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
                {validationState.submissionError}
              </div>
            )}
          </div>
        )}

        {/* App Information Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">App info</h2>
          </div>

          <div className="input-group">
            <label htmlFor="submissionType" className="input-label">
              Submission type
              {isFieldRequired('submissionType') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="select-field">
              <select
                id="Submission-Type"
                name="submissionType"
                className="input cc-select w-select"
                value={formData.submissionType}
                onChange={(e) => handleInputChange('submissionType', e.target.value)}
                required={isFieldRequired('submissionType')}
              >
                <option value="">Select...</option>
                <option value="New">New App</option>
                <option value="Update">App Update</option>
              </select>
            </div>
          </div>

          {formData.submissionType === 'Update' && (
            <div className="warning-banner">
              <strong>App Update Mode</strong>
              <p>Only updating app information. Name and other core details cannot be changed.</p>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="App-Name" className="input-label">
              App name <span className="dyn-asterisk" style={{display: isFieldRequired('appName') ? 'inline' : 'none'}}>*</span>
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>Character limit: 30 characters</span></p>
              </div>
            </div>
            <input
              className="input w-input"
              maxLength="30"
              name="App-Name"
              data-name="App Name"
              placeholder=""
              minLength="5"
              type="text"
              id="app-name"
              data-originally-required="true"
              style={{display: formData.submissionType === 'Update' ? 'none' : 'block'}}
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
              required={isFieldRequired('appName')}
            />
            {validationState.errors.appName && formData.submissionType !== 'Update' && (
              <div className="validation-error-message" style={{display: 'block'}}>
                {validationState.errors.appName}
              </div>
            )}
            <input
              id="app-name-disabled"
              type="text"
              className="input w-input"
              disabled
              value="Name updates must be requested via Support"
              style={{display: formData.submissionType === 'Update' ? 'block' : 'none'}}
            />
            <div id="update-notification" className="form-input-notification" style={{display: formData.submissionType === 'Update' ? 'flex' : 'none', alignItems: 'flex-start', gap: '0.5rem'}}>
              <TriangleAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>The App Name field is locked for existing apps. If you need to update your app's name, please submit a request through our Support team at <a href="https://support.webflow.com/" target="_blank" rel="noopener noreferrer">https://support.webflow.com/</a></span>
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="client-id" className="input-label">
              App client ID
              {isFieldRequired('clientId') && <span className="dyn-asterisk">*</span>}
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
              <input
                className="input w-input"
                maxLength="256"
                name="Client-Id"
                placeholder=""
                type="text"
                id="client-id"
                value={formData.clientId}
                onChange={(e) => handleInputChange('clientId', e.target.value)}
                required={isFieldRequired('clientId')}
                style={{ flex: '1', marginBottom: '0' }}
              />
              <button
                id="Check-Client-ID"
                type="button"
                className="btn w-button"
                onClick={(e) => {
                  e.preventDefault();
                  verifyClientId();
                }}
                style={{
                  whiteSpace: 'nowrap',
                  flex: '0 0 auto',
                  alignSelf: 'stretch'
                }}
              >
                {validationState.clientIdVerifying ? 'Verifying...' : 'Check Client ID'}
              </button>
            </div>
            <div
              id="ID-Error"
              className="cc-error_text"
              style={{ display: validationState.clientIdError ? 'block' : 'none' }}
            >
              {validationState.clientIdError || 'Error message'}
            </div>
            <div
              id="ID-Success"
              className="cc-success-text"
              style={{ display: validationState.clientIdVerified ? 'block' : 'none' }}
            >
              {validationState.clientIdVerified ? 'Client ID successfully verified' : 'Success message'}
            </div>

            {/* Load Existing App Data Button (autofillUpdate feature flag) */}
            {autofillUpdateEnabled && validationState.clientIdVerified && (
              <div style={{ marginTop: '0.75rem' }}>
                {formData.submissionType !== 'Update' ? (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#856404'
                  }}>
                    ℹ️ To load existing app data, please select <strong>"App Update"</strong> from the Submission Type dropdown above.
                  </div>
                ) : !autofillToken ? (
                  <div style={{
                    padding: '0.75rem',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    color: '#856404'
                  }}>
                    Autofill is not available in this environment yet. Set `ADMIN_API_TOKEN` or `AUTOFILL_TOKEN_SECRET`, then verify the Client ID again.
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn w-button"
                      onClick={(e) => {
                        e.preventDefault();
                        loadAppData();
                      }}
                      disabled={isLoadingAppData}
                      style={{
                        backgroundColor: '#146ef5',
                        color: 'white',
                        width: '100%'
                      }}
                    >
                      {isLoadingAppData ? 'Loading App Data...' : 'Load Existing App Data'}
                    </button>
                    <p style={{
                      fontSize: '0.875rem',
                      color: '#666',
                      marginTop: '0.5rem',
                      marginBottom: 0
                    }}>
                      Click to auto-fill form fields with your existing app information
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="w-embed w-script">
              <input
                type="checkbox"
                id="ID-Check-Success"
                required={isFieldRequired('clientId')}
                className="sr-only"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                  border: 0
                }}
                checked={validationState.clientIdVerified}
                onChange={() => {}} // Controlled by verification process
              />
            </div>
          </div>

          <SectionToggle
            sectionName="appCapabilities"
            label="Update App Capabilities & Install URL"
            description="Update app capabilities and installation URL"
          />

          {shouldShowSection('appCapabilities') && (
          <>
          <div className="input-group">
            <label htmlFor="appCapabilities" className="input-label">
              App capabilities
              {isFieldRequired('appCapabilities') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p>
                  <span><strong>‍</strong>Select the option that best represents your app. </span>
                  <a href="https://developers.webflow.com/data/v2.0.0/docs/getting-started-apps" target="_blank" rel="noopener noreferrer">
                    <span>Learn more</span>
                  </a>
                </p>
              </div>
            </div>
            <div className="select-field">
              <select
                id="App-Capabilities"
                name="appCapabilities"
                className="input cc-select w-select"
                value={formData.appCapabilities}
                onChange={(e) => handleInputChange('appCapabilities', e.target.value)}
                required={isFieldRequired('appCapabilities') && shouldShowSection('appCapabilities')}
              >
                <option value="">Select one...</option>
                <option value="Data Client v2">Data Client</option>
                <option value="Designer Extension">Designer Extension</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          {/* App Install URL - Only shown for Data Client v2 and Hybrid apps */}
          {(formData.appCapabilities === 'Data Client v2' || formData.appCapabilities === 'Hybrid') && (
            <>
              <FormField
                id="App-Install-URL"
                name="appInstallUrl"
                label="App install URL"
                type="url"
                value={formData.appInstallUrl}
                onChange={(value) => handleInputChange('appInstallUrl', value)}
                required={shouldShowSection('appCapabilities')}
                showAsterisk={true}
                placeholder="https://yourapp.com/auth/webflow"
                description="The URL where users begin installing your app. This is your app's authorization page that initiates the OAuth flow—<strong>NOT</strong> your OAuth callback/redirect URI. <a href='https://developers.webflow.com/apps/docs/marketplace/submitting-your-app#installation-configuration' target='_blank' rel='noopener noreferrer'>Learn more</a>"
                helpText="Installation URL scopes must match your app configuration exactly."
              />
              {formData.appInstallUrl && /\/(callback|redirect|oauth\/callback)/i.test(formData.appInstallUrl) && (
                <div className="warning-text" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  <TriangleAlert size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>This looks like an OAuth callback URL. The Install URL should be your app's authorization page, not the redirect URI.</span>
                </div>
              )}
            </>
          )}

          {/* Scope Builder */}
          <div className="input-group">
            <label className="input-label">
              Scopes
            </label>
            <div className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p>Select the API scopes your app requires. You can add multiple scopes.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch' }}>
              <div className="select-field" style={{ flex: 1 }}>
                <select
                  id="scope-selector"
                  className="input cc-select w-select"
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  <option value="">Select a scope to add...</option>
                  <option value="app-subscriptions">App Subscriptions</option>
                  <option value="assets">Assets</option>
                  <option value="authorized-user">Authorized user</option>
                  <option value="cms">CMS</option>
                  <option value="comments">Comments</option>
                  <option value="components">Components</option>
                  <option value="custom-code">Custom Code</option>
                  <option value="ecommerce">Ecommerce</option>
                  <option value="forms">Forms</option>
                  <option value="pages">Pages</option>
                  <option value="sites">Sites</option>
                  <option value="site-activity">Site activity</option>
                  <option value="site-config">Site config</option>
                  <option value="user-accounts">User Accounts</option>
                  <option value="workspace">Workspace</option>
                </select>
              </div>
              <button
                type="button"
                className="btn w-button"
                onClick={handleAddScope}
                disabled={!selectedScope}
                style={{ whiteSpace: 'nowrap', flex: '0 0 auto', alignSelf: 'stretch', width: 'auto' }}
              >
                Add Scope
              </button>
            </div>

            {/* Selected scopes display */}
            {formData.appScopes.length > 0 && (
              <div className="scope-chip-list">
                {formData.appScopes.map(scope => (
                  <div key={scope} className="scope-chip">
                    <span>{scope}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveScope(scope)}
                      className="scope-chip-remove"
                      aria-label={`Remove ${scope}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scope Change Justification (for Updates with changed scopes) */}
          {formData.submissionType === 'Update' && scopesChanged() && (
            <div className="input-group">
              <label htmlFor="scope-justification" className="input-label">
                Scope Change Justification <span className="dyn-asterisk">*</span>
              </label>
              <div className="rich-text-component paragraph-sm">
                <div className="rich-text w-richtext">
                  <p>Please explain why you need to add or remove scopes for this update.</p>
                </div>
              </div>
              <textarea
                id="scope-justification"
                className="input cc-textarea w-input"
                value={scopeJustification}
                onChange={(e) => setScopeJustification(e.target.value)}
                placeholder="Explain the reason for scope changes..."
                required
                rows={4}
              />
            </div>
          )}
          </>
          )}

          <SectionToggle
            sectionName="appIcon"
            label="Update App Icon"
            description="Update your app's icon image and alt text"
          />

          {shouldShowSection('appIcon') && (
          <>
          <div className="input-group">
            <label htmlFor="Email" className="input-label">
              App icon image <span className="dyn-asterisk" style={{display: 'none'}}>*</span><br />
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>File Type(s): PNG<br/>Dimensions: 900px by 900px, 1:1 aspect ratio<br/>Title of file should be icon alt text<br/>‍<br/>Accepted: Logomarks (pictoral marks); Not accepted: Logotypes (text)</span></p>
              </div>
            </div>
            <div className="form-file_upload w-file-upload">
              <div className="u-w-100 w-file-upload-default" style={{display: formData.appAvatarImage ? 'none' : 'block'}}>
                <input
                  className="w-file-upload-input"
                  accept=".bmp, .dng, .eps, .gif, .jpg, .jpeg, .png, .ps, .raw, .svg, .tga, .tif, .tiff"
                  name="App-Avatar-Image"
                  data-name="App Avatar Image"
                  aria-hidden="true"
                  type="file"
                  id="App-Avatar-Image-2"
                  tabIndex="-1"
                  ref={avatarFileRef}
                  onChange={(e) => handleFileUpload('appAvatarImage', e.target.files[0])}
                  style={{height: '69.2031px', width: '1px'}}
                />
                <label
                  htmlFor="App-Avatar-Image-2"
                  role="button"
                  tabIndex="0"
                  className="form-file_upload-button w-file-upload-label"
                  onKeyDown={(event) => handleActionButtonKeyDown(event, () => triggerFileUpload(avatarFileRef))}
                >
                  <div className="w-inline-block">Upload File</div>
                </label>
                <div className="u-w-100 u-text-center u-text-main">Max file size 50kb.</div>
              </div>
              <div tabIndex="-1" className="u-w-100 w-file-upload-uploading w-hidden">
                <div className="form-file_upload-button w-file-upload-uploading-btn">
                  <svg className="w-icon-file-upload-uploading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true">
                    <path fill="currentColor" opacity=".2" d="M15 30a15 15 0 1 1 0-30 15 15 0 0 1 0 30zm0-3a12 12 0 1 0 0-24 12 12 0 0 0 0 24z"></path>
                    <path fill="currentColor" opacity=".75" d="M0 15A15 15 0 0 1 15 0v3A12 12 0 0 0 3 15H0z">
                      <animateTransform attributeName="transform" attributeType="XML" dur="0.6s" from="0 15 15" repeatCount="indefinite" to="360 15 15" type="rotate"></animateTransform>
                    </path>
                  </svg>
                  <div className="w-inline-block">Uploading...</div>
                </div>
              </div>
              <div tabIndex="-1" className="w-file-upload-success" style={{display: formData.appAvatarImage ? 'block' : 'none'}}>
                <div className="w-file-upload-file">
                  <div className="w-file-upload-file-name">
                    {formData.appAvatarImage?.name || 'fileuploaded.jpg'}
                  </div>
                  <div
                    aria-label="Remove file"
                    role="button"
                    tabIndex="0"
                    className="w-file-remove-link"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        appAvatarImage: null,
                        appAvatarAltText: ''
                      }));
                      // Clear the file input
                      if (avatarFileRef.current) {
                        avatarFileRef.current.value = '';
                      }
                    }}
                    onKeyDown={(event) => handleActionButtonKeyDown(event, () => {
                      setFormData(prev => ({
                        ...prev,
                        appAvatarImage: null,
                        appAvatarAltText: ''
                      }));
                      if (avatarFileRef.current) {
                        avatarFileRef.current.value = '';
                      }
                    })}
                  >
                    <div className="w-icon-file-upload-remove" aria-hidden="true"></div>
                  </div>
                </div>
              </div>
              <div tabIndex="-1" className="form-error u-w-100 w-file-upload-error w-hidden">
                <div className="w-file-upload-error-msg" data-w-size-error="Upload failed. Max size for files is 10 MB." data-w-type-error="Upload failed. Invalid file type." data-w-generic-error="Upload failed. Something went wrong. Please retry.">
                  Upload failed. Max size for files is 10 MB.
                </div>
              </div>
            </div>
          </div>

          {/* Display current app icon from Airtable */}
          {airtableImages.appIcon && !formData.appAvatarImage && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '4px'
            }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Current App Icon:
              </p>
              <img
                src={airtableImages.appIcon.thumbnails?.large?.url || airtableImages.appIcon.url}
                alt="Current app icon"
                style={{
                  maxWidth: '200px',
                  maxHeight: '200px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '4px'
                }}
              />
              <p style={{
                fontSize: '0.75rem',
                color: '#6B7280',
                marginTop: '0.5rem',
                marginBottom: 0
              }}>
                Upload a new file above to replace this icon
              </p>
            </div>
          )}

          {/* Avatar File Error */}
          {validationState.avatarFileError && (
            <div className="cc-error_text" style={{
              display: 'block',
              backgroundColor: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '4px',
              padding: '0.75rem',
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}>
              <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
              {validationState.avatarFileError}
            </div>
          )}

          <div className="input-group" style={{display: formData.appAvatarImage ? 'block' : 'none'}}>
            <label htmlFor="App-Avatar-Alt-Text" className="input-label">
              App icon image alt text <span className="dyn-asterisk">*</span><br />
            </label>
            <input
              className="input w-input"
              maxLength="500"
              name="App-Avatar-Alt-Text"
              data-name="App Icon Alt Text"
              placeholder=""
              type="text"
              id="App-Avatar-Alt-Text"
              required={formData.appAvatarImage ? true : false}
              value={formData.appAvatarAltText}
              onChange={(e) => handleInputChange('appAvatarAltText', e.target.value)}
            />
          </div>
          </>
          )}

          <SectionToggle
            sectionName="paymentAndVisibility"
            label="Update Payment Type & Visibility"
            description="Update pricing model and marketplace visibility"
          />

          {shouldShowSection('paymentAndVisibility') && (
          <>
          <CheckboxGroup
            label="Payment type"
            description="Select the pricing for the app itself (not other services required to use the app). A trial plan does not mean free - apps must have an ongoing free tier to be marked as Free."
            options={[
              { value: 'Free', label: 'Free' },
              { value: 'Paid', label: 'Paid' }
            ]}
            selectedValues={formData.paymentType}
            onChange={(values) => {
              handleInputChange('paymentType', values);
              validatePaymentType(values);
            }}
            errorMessage={validationState.errors.paymentType}
            showAsterisk={isFieldRequired('paymentType')}
          />
          <div className="w-embed" style={{ display: 'none' }}>
            <input
              type="checkbox"
              id="Payment-Validation"
              required={isFieldRequired('paymentType')}
              className="sr-only"
              checked={formData.paymentType.length > 0}
              onChange={() => {}}
              tabIndex={-1}
              aria-hidden="true"
            />
            <input
              type="hidden"
              id="Selected-Payment-Type-Hidden"
              name="Selected Payment Type"
              value={formData.paymentType.join(', ')}
            />
          </div>

          <div className="input-group">
            <label htmlFor="Marketplace-Visibility" className="input-label">
              Marketplace visibility
              {isFieldRequired('visibility') && <span className="dyn-asterisk">*</span>}
            </label>
            <div className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p>
                  <span>
                    Public listings are visible to everyone in the Marketplace, while Private listings are not displayed in the public Marketplace interface. However, users outside of your Workspace can still install private apps if they have the direct URL to the listing.
                    <br /><br />
                    Private apps undergo the same review process as public apps and must meet all guidelines to be approved. Apps that don't comply with all requirements may be rejected regardless of visibility status.
                  </span>
                </p>
              </div>
            </div>
            <div className="row">
              <div className="col col-shrink">
                <label
                  className="w-checkbox input-group cc-toggle"
                  style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0'}}
                >
                  <input
                    id="Checkbox-Public"
                    type="checkbox"
                    name="Checkbox-Public"
                    checked={formData.visibility.includes('Public')}
                    onChange={() => handleVisibilityChange('Public')}
                    style={{width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: '0', flexShrink: '0'}}
                  />
                  <span className="input-label cc-toggle w-form-label" style={{marginBottom: '0'}}>
                    Public
                  </span>
                </label>
              </div>
              <div className="col col-shrink">
                <label
                  className="w-checkbox input-group cc-toggle"
                  style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0'}}
                >
                  <input
                    id="Checkbox-Private"
                    type="checkbox"
                    name="Checkbox-Private"
                    checked={formData.visibility.includes('Private')}
                    onChange={() => handleVisibilityChange('Private')}
                    style={{width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: '0', flexShrink: '0'}}
                  />
                  <span className="input-label cc-toggle w-form-label" style={{marginBottom: '0'}}>
                    Private
                  </span>
                </label>
              </div>
            </div>
            {validationState.errors.visibility && (
              <div
                id="error-marketplace-visibility"
                className="validation-error-message"
                style={{
                  color: 'rgb(231, 76, 60)',
                  fontSize: '14px',
                  marginTop: '8px',
                  display: 'block'
                }}
              >
                {validationState.errors.visibility}
              </div>
            )}
            <div className="w-embed">
              <input
                type="checkbox"
                id="Visibility-Validation"
                required={isFieldRequired('visibility')}
                className="sr-only"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                  border: 0
                }}
                checked={formData.visibility.length > 0}
                onChange={() => {}} // Controlled by the visible checkboxes
              />
              <input
                type="hidden"
                id="Selected-Visibility-Type-Hidden"
                name="Selected Visibility Type"
                value={formData.visibility.join(', ')}
              />
            </div>
          </div>
          </>
          )}

        </div>

        {/* Creator Information Section */}
        <div className="form-section">
          <div className="heading-component">
            <h2 className="h5">Creator info</h2>
          </div>

          <SectionToggle
            sectionName="creatorInfo"
            label="Update Creator Information"
            description="Update creator name, website, and contact email"
          />

          {shouldShowSection('creatorInfo') && (
          <>
          <FormField
            id="Creator-Name"
            name="creatorName"
            label="Creator name"
            type="text"
            value={formData.creatorName}
            onChange={(value) => handleInputChange('creatorName', value)}
            required={isFieldRequired('creatorName') && shouldShowSection('creatorInfo')}
            showAsterisk={isFieldRequired('creatorName')}
            placeholder="Your name or company name"
            autoComplete="name"
          />

          <FormField
            id="Creator-Website"
            name="creatorWebsite"
            label="Creator website"
            type="url"
            value={formData.creatorWebsite}
            onChange={(value) => handleInputChange('creatorWebsite', value)}
            required={isFieldRequired('creatorWebsite')}
            showAsterisk={isFieldRequired('creatorWebsite')}
            placeholder="https://yourwebsite.com"
            autoComplete="url"
          />

          <FormField
            id="Creator-Contact-Email"
            name="creatorContactEmail"
            label="Contact email"
            type="email"
            value={formData.creatorContactEmail}
            onChange={(value) => handleInputChange('creatorContactEmail', value)}
            required={isFieldRequired('creatorContactEmail')}
            showAsterisk={isFieldRequired('creatorContactEmail')}
            placeholder="email@example.com"
            description="Email address for the account owner or review-specific contact"
            autoComplete="email"
          />
          </>
          )}
        </div>

        {/* App Details Section */}
        <div className="form-section u-position-relative">
          <div id="app-details" className="u-scroll-offset"></div>
          <div data-wf--heading--alignment="left-align" id="" className="heading-component">
            <h2 data-heading-mask="" className="h5">App details</h2>
          </div>

          <SectionToggle
            sectionName="category"
            label="Update App Category"
            description="Update the categories that describe your app"
          />

          {shouldShowSection('category') && (
          <div className="input-group">
            <label htmlFor="App-Category" className="input-label">
              App category {isFieldRequired('appCategory') && <span className="dyn-asterisk">*</span>} <br />
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>Select up to 2 options that best describe your app<br/>Use CMD+Click/CTRL+Click to select multiple</span></p>
              </div>
            </div>
            <select
              id="App-Category"
              name="App-Category"
              data-name="App Category"
              required={isFieldRequired('appCategory')}
              multiple
              className="input cc-select w-select"
              value={formData.appCategory}
              onChange={(e) => {
                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                if (selectedOptions.length <= 2) {
                  handleInputChange('appCategory', selectedOptions);
                }
              }}
            >
              <option value="AI">AI</option>
              <option value="Analytics">Analytics</option>
              <option value="Asset Management">Asset Management</option>
              <option value="Automation">Automation</option>
              <option value="Compliance">Compliance</option>
              <option value="Content Management">Content Management</option>
              <option value="Customer Support">Customer Support</option>
              <option value="Data Sync">Data Sync</option>
              <option value="Design">Design</option>
              <option value="Development and Coding">Development and Coding</option>
              <option value="Ecommerce">Ecommerce</option>
              <option value="Forms and Surveys">Forms and Surveys</option>
              <option value="Icons">Icons</option>
              <option value="Localization">Localization</option>
              <option value="Marketing">Marketing</option>
              <option value="Scheduling">Scheduling</option>
              <option value="SEO">SEO</option>
              <option value="User Management">User Management</option>
              <option value="Utilities">Utilities</option>
            </select>
            <div id="category-counter" style={{marginTop: '5px'}}>
              {formData.appCategory.length} of 2 categories selected
            </div>
          </div>
          )}

          <SectionToggle
            sectionName="descriptions"
            label="Update App Descriptions"
            description="Update preview and detail descriptions"
          />

          {shouldShowSection('descriptions') && (
          <>
          <div className="input-group">
            <label htmlFor="Short-Description" className="input-label">
              App preview description (short) {isFieldRequired('appPreviewDescription') && <span className="dyn-asterisk">*</span>}<br />
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>Character limit: 100 characters<br /></span></p>
              </div>
            </div>
            <textarea
              required={isFieldRequired('appPreviewDescription')}
              placeholder=""
              maxLength="100"
              id="Short-Description"
              name="Short-Description"
              data-name="Short Description"
              className="input cc-text-area w-input"
              value={formData.appPreviewDescription}
              onChange={(e) => handleInputChange('appPreviewDescription', e.target.value)}
            />
            <div
              style={{marginTop: '5px', fontSize: '0.875rem', color: 'var(--colors--text-secondary, #5a5a5a)'}}
              aria-live="polite"
              aria-atomic="true"
            >
              {formData.appPreviewDescription.length}/100 characters
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="Long-Description" className="input-label">
              App detail description {isFieldRequired('appDetailDescription') && <span className="dyn-asterisk">*</span>}<br />
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>Character limit: 10,000 characters<br/>Markdown supported, but not <strong>links</strong><br /></span></p>
              </div>
            </div>
            <div className="w-embed">
              <QuillEditor
                ref={quillDetailRef}
                value={formData.appDetailDescription}
                onChange={(htmlContent) => {
                  handleInputChange('appDetailDescription', htmlContent);
                }}
                theme="snow"
                placeholder="Comprehensive description of your app"
                className="quill-wrapper"
                formats={[
                  'header',
                  'bold', 'italic', 'underline', 'link',
                  'list', 'bullet'
                ]}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'link'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                  ],
                }}
              />
              <textarea
                name="Long-Description"
                style={{display:'none'}}
                id="Long-Description"
                value={formData.appDetailDescription}
                readOnly
              />
            </div>
          </div>

          <FormField
            id="Promo-Video-URL"
            name="Promo-Video-URL"
            label="App promo video URL"
            type="url"
            value={formData.appVideoUrl}
            onChange={(value) => handleInputChange('appVideoUrl', value)}
            maxLength={256}
            placeholder="https://www.youtube.com/watch?v=xyz"
            description="Provide a 1-2 min. video for your app's listing page highlighting features for prospective users. (optional)<br/><br/>Video must be hosted on YouTube"
          />
          </>
          )}

          <SectionToggle
            sectionName="screenshots"
            label="Update App Screenshots"
            description="Update app screenshots and their alt text"
          />

          {shouldShowSection('screenshots') && (
          <div className="input-group">
            <label htmlFor="Email" className="input-label">
              App screenshots <span className="dyn-asterisk" style={{display: 'none'}}>*</span><br />
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>Dimensions: 1280px by 846px <br/>4 screenshots recommended (up to 5 maximum)<br/>Max file size: 2MB per screenshot<br/>Accepted: Highlight the app features with clear visuals</span></p>
              </div>
            </div>

            {/* Display current screenshots from Airtable */}
            {airtableImages.screenshots.length > 0 && !formData.appScreenshots.some(s => s) && (
              <div style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                padding: '1rem',
                backgroundColor: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '4px'
              }}>
                <p style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  marginBottom: '0.75rem',
                  color: '#374151'
                }}>
                  Current App Screenshots:
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '1rem'
                }}>
                  {airtableImages.screenshots.map((screenshot, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}>
                      <img
                        src={screenshot.thumbnails?.large?.url || screenshot.url}
                        alt={`Screenshot ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          border: '1px solid #D1D5DB',
                          borderRadius: '4px'
                        }}
                      />
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        margin: 0
                      }}>
                        Screenshot {idx + 1}
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  marginTop: '0.75rem',
                  marginBottom: 0
                }}>
                  Upload new files below to replace these screenshots
                </p>
              </div>
            )}

            {[1, 2, 3, 4, 5].map(index => (
              <div key={index} className="input-group">
                <div id={`app-screenshot-${index}`} className="form-file_upload w-file-upload">
                  <div className="u-w-100 w-file-upload-default" style={{display: formData.appScreenshots[index-1] ? 'none' : 'block'}}>
                    <input
                      className="w-file-upload-input"
                      accept=".bmp, .dng, .eps, .gif, .jpg, .jpeg, .png, .ps, .raw, .svg, .tga, .tif, .tiff"
                      name={`App-Screenshot-${index}`}
                      data-name={`App Screenshot ${index}`}
                      aria-hidden="true"
                      type="file"
                      id={`App-Screenshot-${index}`}
                      tabIndex="-1"
                      ref={el => screenshotFileRefs.current[index-1] = el}
                      onChange={(e) => handleFileUpload('appScreenshots', e.target.files[0], index-1)}
                      style={{height: '69.2031px', width: '1px'}}
                    />
                    <label
                      htmlFor={`App-Screenshot-${index}`}
                      role="button"
                      tabIndex="0"
                      className="form-file_upload-button w-file-upload-label"
                      onKeyDown={(event) => handleActionButtonKeyDown(event, () => triggerScreenshotUpload(index - 1))}
                    >
                      <div className="w-inline-block">Upload File</div>
                    </label>
                  </div>
                  <div tabIndex="-1" className="w-file-upload-success" style={{display: formData.appScreenshots[index-1] ? 'block' : 'none'}}>
                    <div className="w-file-upload-file">
                      <div className="w-file-upload-file-name">
                        {formData.appScreenshots[index-1]?.name || 'fileuploaded.jpg'}
                      </div>
                      <div
                        aria-label="Remove file"
                        role="button"
                        tabIndex="0"
                        className="w-file-remove-link"
                        onClick={() => {
                          const newScreenshots = [...formData.appScreenshots];
                          newScreenshots[index-1] = null;
                          const newAltTexts = [...formData.appScreenshotAltTexts];
                          newAltTexts[index-1] = '';
                          setFormData(prev => ({
                            ...prev,
                            appScreenshots: newScreenshots,
                            appScreenshotAltTexts: newAltTexts
                          }));
                          // Clear the file input
                          if (screenshotFileRefs.current[index-1]) {
                            screenshotFileRefs.current[index-1].value = '';
                          }
                        }}
                        onKeyDown={(event) => handleActionButtonKeyDown(event, () => {
                          const newScreenshots = [...formData.appScreenshots];
                          newScreenshots[index-1] = null;
                          const newAltTexts = [...formData.appScreenshotAltTexts];
                          newAltTexts[index-1] = '';
                          setFormData(prev => ({
                            ...prev,
                            appScreenshots: newScreenshots,
                            appScreenshotAltTexts: newAltTexts
                          }));
                          if (screenshotFileRefs.current[index-1]) {
                            screenshotFileRefs.current[index-1].value = '';
                          }
                        })}
                      >
                        <div className="w-icon-file-upload-remove" aria-hidden="true"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <input
                  className="input u-mt-sm w-input"
                  maxLength="256"
                  name={`Alt-Text-Screenshot-${index}`}
                  data-name={`Alt Text Screenshot ${index}`}
                  placeholder="Provide alt text for your screenshot"
                  type="text"
                  id={`Alt-Text-Screenshot-${index}`}
                  style={{display: formData.appScreenshots[index-1] ? 'block' : 'none'}}
                  required={formData.appScreenshots[index-1] ? true : false}
                  value={formData.appScreenshotAltTexts[index-1] || ''}
                  onChange={(e) => {
                    const newAltTexts = [...formData.appScreenshotAltTexts];
                    newAltTexts[index-1] = e.target.value;
                    setFormData(prev => ({ ...prev, appScreenshotAltTexts: newAltTexts }));
                  }}
                />
                {/* Screenshot File Error */}
                {validationState.screenshotFileErrors[index-1] && (
                  <div className="cc-error_text" style={{
                    display: 'block',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #EF4444',
                    borderRadius: '4px',
                    padding: '0.75rem',
                    marginTop: '0.5rem'
                  }}>
                    <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
                    {validationState.screenshotFileErrors[index-1]}
                  </div>
                )}
              </div>
            ))}

            <div className="w-embed">
              <input
                type="hidden"
                id="consolidated-screenshot-alt-texts"
                name="consolidated-screenshot-alt-texts"
                value={formData.appScreenshotAltTexts.filter(text => text).map((text, i) => `${i+1}. ${text}`).join('\n')}
              />
            </div>

            {/* Screenshots Count Error */}
            {validationState.screenshotsCountError && (
              <div className="cc-error_text" style={{
                display: 'block',
                backgroundColor: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '0.75rem',
                marginTop: '1rem'
              }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
                {validationState.screenshotsCountError}
              </div>
            )}
          </div>
          )}

          <SectionToggle
            sectionName="features"
            label="Update Features Overview"
            description="Update the list of key app features"
          />

          {shouldShowSection('features') && (
          <div className="input-group">
            <label className="input-label">
              Features overview {isFieldRequired('appFeaturesOverview') && <span className="dyn-asterisk">*</span>}
            </label>
            <div data-wf--rich-text--alignment="left-align" className="rich-text-component paragraph-sm">
              <div className="rich-text w-richtext">
                <p><span>List up to five highlighted app features (at least one required)</span></p>
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((featureNum) => (
              <div key={featureNum} style={{ marginBottom: '1rem' }}>
                <FormField
                  id={`Feature-${featureNum}`}
                  name={`Feature-${featureNum}`}
                  label={`Feature ${featureNum}`}
                  type="text"
                  value={formData.appFeaturesOverview[featureNum - 1]}
                  onChange={(value) => {
                    const newFeatures = [...formData.appFeaturesOverview];
                    newFeatures[featureNum - 1] = value;
                    handleInputChange('appFeaturesOverview', newFeatures);
                  }}
                  required={featureNum === 1 && isFieldRequired('appFeaturesOverview')}
                  showAsterisk={featureNum === 1 && isFieldRequired('appFeaturesOverview')}
                  maxLength={200}
                  placeholder={`Enter feature ${featureNum}`}
                />
              </div>
            ))}

            {/* Features Error */}
            {validationState.featuresError && (
              <div className="cc-error_text" style={{
                display: 'block',
                backgroundColor: '#FEE2E2',
                border: '1px solid #EF4444',
                borderRadius: '4px',
                padding: '0.75rem',
                marginTop: '1rem'
              }}>
                <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
                {validationState.featuresError}
              </div>
            )}
          </div>
          )}

          <SectionToggle
            sectionName="urls"
            label="Update URLs & Developer Notes"
            description="Update website URL and additional notes"
          />

          {shouldShowSection('urls') && (
          <>
          <FormField
            id="Website-URL-2"
            name="Website-URL"
            label="Website URL"
            type="text"
            value={formData.appWebsiteUrl}
            onChange={(value) => handleInputChange('appWebsiteUrl', value)}
            required={isFieldRequired('appWebsiteUrl') && shouldShowSection('urls')}
            showAsterisk={isFieldRequired('appWebsiteUrl')}
            maxLength={256}
            placeholder="Example Text"
            description="Add the website URL where users can learn more about your app/company<br />"
          />

          <TextAreaField
            id="developer-notes"
            name="Developer-Notes"
            label="Additional Notes"
            value={formData.appDeveloperNotes}
            onChange={(value) => handleInputChange('appDeveloperNotes', value)}
            required={isFieldRequired('appDeveloperNotes')}
            showAsterisk={isFieldRequired('appDeveloperNotes')}
            maxLength={5000}
            placeholder="Any additional context, special instructions, or information that would help reviewers understand your app (excluding credentials)..."
            description="Add any other relevant information for reviewers. <strong>Note:</strong> App credentials should be provided in the dedicated <a href='#app-credentials-info'>App Credentials section</a> above, not in this notes field.<br />"
          />
          </>
          )}
        </div>

        {/* App Access Credentials Section */}
        <div className="form-section u-position-relative">
          <div id="app-credentials-info" className="u-scroll-offset"></div>
          <h2 className="h5">App Access Credentials</h2>

          <SectionToggle
            sectionName="credentials"
            label="Update App Access Credentials"
            description="Update test credentials for app review"
          />

          {shouldShowSection('credentials') && (
          <>
          {/* Intro context section */}
          <div style={{backgroundColor: 'var(--_color---neutral--gray-100, #f0f0f0)', borderLeft: '4px solid var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))', padding: '1.5rem', marginBottom: '2rem', borderRadius: '4px'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
              <TriangleAlert size={20} style={{ color: 'var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{margin: '0 0 12px 0', fontWeight: '600', color: 'var(--colors--text, var(--_color---neutral--black, #080808))'}}>Critical for Review Process</p>
                <p style={{margin: '0', color: 'var(--colors--text-secondary, var(--_color---neutral--gray-600, #5a5a5a))', lineHeight: '1.5'}}>
                  App access credentials are required for our review team to test your app thoroughly.
                  The account must have permanent access to the highest tier with all features unlocked.
                </p>
              </div>
            </div>
          </div>

          {/* Main credentials field */}
          <div className="input-group">
            <label htmlFor="app-access-credentials" className="input-label">
              App Access Credentials {isFieldRequired('appAccessCredentials') && <span className="dyn-asterisk">*</span>}
            </label>
            <p className="paragraph-sm">
              Please provide login credentials for our review team, including username, email, password, and any additional details needed. When creating an account, please use marketplaceteam@webflow.com and share setup details in the Notes.
            </p>
            <label className="input-label">If your app doesn't need credentials, enter "N/A"</label>
            <textarea
              id="app-access-credentials"
              name="App-Access-Credentials"
              maxLength="2000"
              data-name="App Access Credentials"
              placeholder={`Username/Email: your-demo-account@example.com
Password: YourSecurePassword123
Additional access notes: Account has been upgraded to Premium plan
Special instructions: Use 2FA code generator app (backup codes: xxxxx)

OR if no credentials needed:
N/A`}
              className="input cc-textarea w-input"
              required={isFieldRequired('appAccessCredentials')}
              value={formData.appAccessCredentials}
              onChange={(e) => handleInputChange('appAccessCredentials', e.target.value)}
            />
            <div style={{fontSize: '0.875rem', color: 'var(--colors--text-secondary)', marginTop: '8px'}}>
              Character count: <span id="credentials-char-count" style={{color: 'rgb(102, 102, 102)'}}>{formData.appAccessCredentials.length}</span>/2000
            </div>
          </div>

          {/* Single confirmation checkbox */}
          <div className="field-group">
            <label
              className="w-checkbox input-group cc-toggle"
              style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginBottom: '0'}}
            >
              <input
                type="checkbox"
                name="credentials-tier-confirmation"
                id="credentials-tier-confirmation"
                data-name="Credentials Tier Confirmation"
                value="on"
                required={isFieldRequired('credentialsTierConfirmation')}
                checked={formData.credentialsTierConfirmation}
                onChange={(e) => handleInputChange('credentialsTierConfirmation', e.target.checked)}
                style={{width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: '0.25rem 0 0 0', flexShrink: '0'}}
              />
              <span className="input-label cc-toggle cc-line-height w-form-label" style={{marginBottom: '0', marginLeft: '0'}}>
                <strong>I confirm that the provided information above is accurate</strong>
                (either valid credentials with highest tier access, or appropriate N/A designation if no credentials are needed)
                and will remain valid permanently for review and audit purposes.
                <span className="dyn-asterisk" style={{display: 'none'}}>*</span>
              </span>
            </label>
          </div>

          {/* Consolidated warning section */}
          <div style={{backgroundColor: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 14%, transparent)', border: '1px solid color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 40%, transparent)', borderRadius: '4px', padding: '1rem', marginTop: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px'}}>
              <TriangleAlert size={18} style={{ color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{margin: '0 0 8px 0', fontWeight: '600', color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', fontSize: '0.9rem'}}>Marketplace Agreement</p>
                <p style={{margin: '0 0 8px 0', color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', fontSize: '0.85rem', lineHeight: '1.4'}}>
                  By providing these credentials, you agree that Webflow may access your app at any time for review,
                  audit, and quality assurance purposes. Account access must remain active for the duration of your
                  app's presence in the Webflow Marketplace.
                </p>
                <div id="paid-app-requirements" style={{display: formData.paymentType.includes('Paid') ? 'block' : 'none', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 50%, transparent)'}}>
                  <p style={{margin: '0 0 8px 0', fontWeight: '600', color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', fontSize: '0.9rem'}}>Paid App Requirements</p>
                  <p style={{margin: '0 0 8px 0', color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', fontSize: '0.85rem', lineHeight: '1.4'}}>
                    Since your app has paid features, the provided account must be permanently upgraded to bypass all paywalls.
                  </p>
                </div>
                <p style={{margin: '0', color: 'color-mix(in srgb, var(--_color---secondary--yellow, #ffae13) 90%, black)', fontSize: '0.85rem', lineHeight: '1.4', fontWeight: '600'}}>
                  Failure to provide proper credentials or ensure access remains active will result in review delays and may lead to app delisting.
                </p>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Support Information Section */}
        <div className="form-section" style={{ marginTop: '3rem' }}>
          <div className="heading-component">
            <h2 className="h5">Support info</h2>
          </div>

          <SectionToggle
            sectionName="supportInfo"
            label="Update Support Information"
            description="Update demo video, privacy policy, support contacts, and terms"
          />

          {shouldShowSection('supportInfo') && (
          <>
          <FormField
            id="Demo-Video-URL"
            name="appDemoVideoUrl"
            label="Review Team Demo Video URL"
            type="url"
            value={formData.appDemoVideoUrl}
            onChange={(value) => handleInputChange('appDemoVideoUrl', value)}
            required={isFieldRequired('appDemoVideoUrl') && shouldShowSection('supportInfo')}
            showAsterisk={isFieldRequired('appDemoVideoUrl')}
            placeholder="https://yourapp.com/demo"
            description="Provide a full walkthrough of app installation, setup, and complete functionality for the review team (not to be confused with the promo video)"
          />

          <FormField
            id="Privacy-Policy-URL-2"
            name="appPrivacyPolicyUrl"
            label="Privacy Policy URL"
            type="url"
            value={formData.appPrivacyPolicyUrl}
            onChange={(value) => handleInputChange('appPrivacyPolicyUrl', value)}
            required={isFieldRequired('appPrivacyPolicyUrl') && shouldShowSection('supportInfo')}
            showAsterisk={isFieldRequired('appPrivacyPolicyUrl')}
            placeholder="https://yourapp.com/privacy"
            description="Add the website URL where users can access your Privacy Policy"
          />

          {formData.submissionType !== 'Update' && (
            <div style={{
              backgroundColor: 'color-mix(in srgb, var(--_color---primary--webflow-blue, #146ef5) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--_color---primary--webflow-blue, #146ef5) 30%, transparent)',
              borderRadius: '4px',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{fontSize: '1rem', color: 'var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))'}}>i</span>
              <span style={{fontSize: '0.875rem', color: 'var(--colors--primary-accent, var(--_color---primary--webflow-blue, #146ef5))'}}>
                <strong>Either/Or Required:</strong> Provide EITHER a Support Email OR Support URL
              </span>
            </div>
          )}

          <FormField
            id="App-Support-Email"
            name="appSupportEmail"
            label="Support Email"
            type="email"
            value={formData.appSupportEmail}
            onChange={(value) => {
              handleInputChange('appSupportEmail', value);
              // Clear support error only if exactly one field has a value
              const hasEmail = value && value.trim() !== '';
              const hasUrl = formData.appSupportUrl && formData.appSupportUrl.trim() !== '';
              // Clear error if exactly one is filled (XOR logic)
              if ((hasEmail && !hasUrl) || (!hasEmail && hasUrl)) {
                setValidationState(prev => ({ ...prev, supportError: '' }));
              }
            }}
            required={false}
            showAsterisk={false}
            placeholder="support@yourapp.com"
            description="Add an email where users can contact your customer support"
            autoComplete="email"
          />

          <FormField
            id="Support-URL"
            name="appSupportUrl"
            label="Support URL"
            type="url"
            value={formData.appSupportUrl}
            onChange={(value) => {
              handleInputChange('appSupportUrl', value);
              // Clear support error only if exactly one field has a value
              const hasUrl = value && value.trim() !== '';
              const hasEmail = formData.appSupportEmail && formData.appSupportEmail.trim() !== '';
              // Clear error if exactly one is filled (XOR logic)
              if ((hasUrl && !hasEmail) || (!hasUrl && hasEmail)) {
                setValidationState(prev => ({ ...prev, supportError: '' }));
              }
            }}
            required={false}
            showAsterisk={false}
            placeholder="https://yourapp.com/support"
            description="Add a website URL where users can contact your customer support"
            autoComplete="url"
          />

          {/* Support Error */}
          {validationState.supportError && (
            <div className="cc-error_text" style={{
              display: 'block',
              backgroundColor: '#FEE2E2',
              border: '1px solid #EF4444',
              borderRadius: '4px',
              padding: '0.75rem',
              marginTop: '0.5rem',
              marginBottom: '1rem'
            }}>
              <TriangleAlert size={16} style={{ flexShrink: 0, marginRight: '0.5rem', display: 'inline' }} />
              {validationState.supportError}
            </div>
          )}

          <FormField
            id="terms-conditions-url"
            name="appTermsUrl"
            label="Terms and Conditions URL"
            type="url"
            value={formData.appTermsUrl}
            onChange={(value) => handleInputChange('appTermsUrl', value)}
            required={isFieldRequired('appTermsUrl') && shouldShowSection('supportInfo')}
            showAsterisk={isFieldRequired('appTermsUrl')}
            placeholder="https://yourapp.com/terms"
            description="Add the website URL where users can access your Terms and Conditions"
          />
          </>
          )}
        </div>


        {/* Acknowledgements Section */}
        <div className="form-section u-position-relative">
          <div id="acknowledgements" className="u-scroll-offset"></div>
          <div data-wf--heading--alignment="left-align" id="" className="heading-component">
            <h2 data-heading-mask="" className="h5">Acknowledgements</h2>
          </div>
          <label
            data-wf-native-id-path="d06e7dc5-4657-6c37-d764-112c58414692"
            data-wf-ao-click-engagement-tracking="true"
            data-wf-element-id="d06e7dc5-4657-6c37-d764-112c58414692"
            className="w-checkbox input-group cc-toggle"
            style={{display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', marginBottom: '0'}}
          >
            <input
              type="checkbox"
              name="Checkbox-Agree-To-Webflow-Policies-And-Terms"
              id="Checkbox-Agree-To-Webflow-Policies-And-Terms"
              data-name="Checkbox Agree To Webflow Policies And Terms"
              required={isFieldRequired('agreementAccepted')}
              checked={formData.agreementAccepted}
              onChange={(e) => handleInputChange('agreementAccepted', e.target.checked)}
              style={{width: '1.25rem', height: '1.25rem', cursor: 'pointer', margin: '0.25rem 0 0 0', flexShrink: '0'}}
            />
            <span className="input-label cc-toggle cc-line-height w-form-label" style={{marginBottom: '0', marginLeft: '0'}}>
              By checking this box, you agree to <a href="https://webflow.com/legal/privacy" target="_blank" rel="noopener noreferrer">Webflow's Privacy Policy</a>, <a href="https://webflow.com/legal/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>, and <a href="https://developers.webflow.com/docs/webflows-developer-terms-of-service" target="_blank" rel="noopener noreferrer">Developer Terms of Service</a>.&nbsp;*
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="form-section">
          <div className="input-group">
            <input
              type="submit"
              className="btn u-mt-sm w-button"
              value={isSubmitting ? "Submitting..." : "Submit"}
              data-wait="Please wait..."
              disabled={isSubmitting || (formData.clientId && !validationState.clientIdVerified)}
            />
          </div>
        </div>

        </form>

        {/* Success State */}
        <div
          className="form-success w-form-done"
          tabIndex="-1"
          role="region"
          aria-label="Marketplace App Submission success"
          aria-live="polite"
          aria-atomic="true"
          style={{display: submissionSuccess ? 'block' : 'none'}}
        >
          <div className="form-success_flex cc-relative">
            <h3>
              Thank you! Your submission has been received.
            </h3>
            <div
              data-wf--rich-text--alignment="left-align"
              className="rich-text-component u-mb-0"
            >
              <div className="rich-text w-richtext">
                <p>
                  Our team will get back to you after reviewing your application.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
