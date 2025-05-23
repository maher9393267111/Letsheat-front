'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Tab } from '@headlessui/react';
import { toast } from 'react-toastify';
import { 
  XMarkIcon, 
  PhotoIcon, 
  PaintBrushIcon, 
  MegaphoneIcon, 
  LinkIcon, 
  DocumentTextIcon, 
  CodeBracketIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  HomeIcon,
  UserIcon,
  ShoppingCartIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  CalendarIcon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  SquaresPlusIcon,
  ArrowPathIcon,
  PlayCircleIcon
} from '@heroicons/react/24/outline';
import { getSiteSettings, updateSiteSettings, getPublishedForms } from '@services/api';
import http from '@services/api/http';
import { Disclosure } from '@headlessui/react';
import Card from '@components/ui/Card';
import SiteSeoDashboard from '@components/SEO/Site/SiteSeoDashboard';
import WorkingHoursSection from './WorkingHoursSection';
//mediaModal
import MediaModal from '@components/modal/MediaModal';
import MediaUpload from '@components/ui/MediaUpload';
import { useDispatch } from 'react-redux';
import { setSettings as setReduxSettings } from '@features/settings/settingsSlice';

function parseWorkingHoursString(workingHoursStr) {
  const defaultWorkingHours = [
    { day: 'Monday', title: 'Monday', startTime: '09:00', endTime: '17:00', isOpen: true },
    { day: 'Tuesday', title: 'Tuesday', startTime: '09:00', endTime: '17:00', isOpen: true },
    { day: 'Wednesday', title: 'Wednesday', startTime: '09:00', endTime: '17:00', isOpen: true },
    { day: 'Thursday', title: 'Thursday', startTime: '09:00', endTime: '17:00', isOpen: true },
    { day: 'Friday', title: 'Friday', startTime: '09:00', endTime: '17:00', isOpen: true },
    { day: 'Saturday', title: 'Saturday', startTime: '10:00', endTime: '14:00', isOpen: true },
    { day: 'Sunday', title: 'Sunday', startTime: '00:00', endTime: '00:00', isOpen: false }
  ];
  
  if (!workingHoursStr || typeof workingHoursStr !== 'string') {
    return defaultWorkingHours;
  }
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const result = days.map(day => {
    const defaultDay = defaultWorkingHours.find(d => d.day === day);
    
    // Look for lines containing this day in the string
    const regex = new RegExp(`${day}[^\\n]*`, 'i');
    const match = workingHoursStr.match(regex);
    
    if (match) {
      const line = match[0];
      const isClosed = /closed/i.test(line);
      
      if (isClosed) {
        return {
          day,
          title: day,
          startTime: '00:00',
          endTime: '00:00',
          isOpen: false
        };
      }
      
      // Try to extract times using regex for formats like "9:00 AM - 5:00 PM" or "09:00 - 17:00"
      const timeRegex = /(\d{1,2}):(\d{2})(?:\s*(?:AM|PM)?)?\s*-\s*(\d{1,2}):(\d{2})(?:\s*(?:AM|PM)?)?/i;
      const timeMatch = line.match(timeRegex);
      
      if (timeMatch) {
        let [_, startHour, startMin, endHour, endMin] = timeMatch;
        
        // Convert to 24-hour format if needed
        startHour = parseInt(startHour);
        endHour = parseInt(endHour);
        
        // Simple AM/PM detection
        if (/PM/i.test(line)) {
          if (startHour < 12 && line.indexOf('AM') > line.indexOf(startHour)) {
            startHour += 12;
          }
          if (endHour < 12 && line.indexOf('PM') > line.indexOf(endHour)) {
            endHour += 12;
          }
        }
        
        // Format as HH:MM
        const startTime = `${startHour.toString().padStart(2, '0')}:${startMin}`;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMin}`;
        
        return {
          day,
          title: day,
          startTime,
          endTime,
          isOpen: true
        };
      }
    }
    
    // Return default for this day if no match or parsing failed
    return defaultDay || {
      day,
      title: day,
      startTime: '09:00',
      endTime: '17:00',
      isOpen: day !== 'Sunday'
    };
  });
  
  return result;
}

// Create a map of icon components for easier selection and preview
const iconMap = {
  HomeIcon,
  UserIcon,
  ShoppingCartIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  DocumentDuplicateIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  BookOpenIcon,
  CalendarIcon,
  PaintBrushIcon,
  MegaphoneIcon,
  LinkIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  ChartPieIcon,
  CursorArrowRaysIcon,
  FingerPrintIcon,
  SquaresPlusIcon,
  ArrowPathIcon,
  PlayCircleIcon
};

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function EnhancedFileUpload({ file, onDrop, onRemove, loading, error, maxSize = 5 * 1024 * 1024, identifier }) {
  return (
    <MediaUpload
      file={file}
      onDrop={(e, id) => {
        // Handle media library selection
        if (e.mediaLibraryFile) {
          onDrop({ mediaLibraryFile: e.mediaLibraryFile });
          return;
        }
        // Handle regular file upload
        onDrop(e);
      }}
      onRemove={(id, isFromLibrary) => onRemove(isFromLibrary)}
      loading={loading}
      error={error}
      maxSize={maxSize}
      identifier={identifier}
      helperText="Upload or select an image from the media library"
    />
  );
}

export default function SettigsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedNavItem, setExpandedNavItem] = useState(null);
  const [expandedFooterColumn, setExpandedFooterColumn] = useState(null);
  const [publishedForms, setPublishedForms] = useState([]);
  const dispatch = useDispatch();
  
  // Get all icon names from our iconMap
  const iconList = Object.keys(iconMap);

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    setValue, 
    watch, 
    reset,
    control
  } = useForm({
    defaultValues: {
      title: '',
      description: '',
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      primaryColor: '#2563eb',
      footerText: '',
      socialLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: ''
      },
      scripts: {
        head: '',
        body: ''
      },
      footerLinks: [
        { heading: 'Company', links: [{ title: '', url: '' }] },
        { heading: 'Resources', links: [{ title: '', url: '' }] }
      ],
      navTitles: {
        items: [{ title: 'Home', icon: 'HomeIcon' }],
        fontSize: 'text-md',
        textColor: '#374151',
        iconColor: '#4f46e5',
        bgColor: '#ffffff',
        animationEnabled: true,
      },
      linksInfo: [],
      contactSection: {
        phones: [{ number: '' }],
        emails: [{ address: '' }],
        siteMapUrl: '',
        adminEmail: '',
        address: '',
        workingHours: '',
        googleMapsEmbed: ''
      },
      // New SEO fields for static pages
      blogMetaTitle: '',
      blogMetaDescription: '',
      blogMetaKeywords: '',
      contactMetaTitle: '',
      contactMetaDescription: '',
      contactMetaKeywords: '',
    }
  });

  // Setup field arrays for dynamic content
  const footerLinksArray = useFieldArray({
    control,
    name: "footerLinks"
  });

  const navTitlesArray = useFieldArray({
    control,
    name: "navTitles.items"
  });

  // 4. Add field array for working hours
// In your existing useForm initialization, add a new useFieldArray for working hours
// Find the existing array initializations and add:
const workingHoursArray = useFieldArray({
  control,
  name: "contactSection.workingHours"
});

  // Add primaryColor to watched values
  const watchedPrimaryColor = watch('primaryColor');
  const watchedNavTextColor = watch('navTitles.textColor');
  const watchedNavIconColor = watch('navTitles.iconColor');
  const watchedNavBgColor = watch('navTitles.bgColor');

  // Add field arrays for phones and emails
  const phonesArray = useFieldArray({
    control,
    name: "contactSection.phones"
  });

  const emailsArray = useFieldArray({
    control,
    name: "contactSection.emails"
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getSiteSettings();
        setSettings(data);
        console.log('data', data);
        
        // Prepare data for reset, ensuring hex colors
        const resetData = {
          ...data,
          primaryColor: data?.primaryColor || '#2563eb',
          logo: data.logo || null,
          footerLogo: data.footerLogo || null,
          ogImage: data.ogImage || null,
          socialLinks: data.socialLinks || {
            facebook: '',
            twitter: '',
            instagram: '',
            linkedin: '',
            youtube: ''
          },
          scripts: data.scripts || {
            head: '',
            body: ''
          },
          footerLinks: data.footerLinks || [
            { heading: 'Company', links: [{ title: '', url: '' }] }
          ],
          navTitles: {
            items: data.navTitles?.items || [{ title: 'Home', icon: 'HomeIcon' }],
            fontSize: data.navTitles?.fontSize || 'text-md',
            textColor: data.navTitles?.textColor?.startsWith('#') ? data.navTitles.textColor : '#374151',
            iconColor: data.navTitles?.iconColor?.startsWith('#') ? data.navTitles.iconColor : '#4f46e5',
            bgColor: data.navTitles?.bgColor?.startsWith('#') ? data.navTitles.bgColor : '#ffffff',
            animationEnabled: data.navTitles?.animationEnabled !== false,
          },
          linksInfo: data.linksInfo || [],
          contactSection: data.contactSection || {
            phones: [{ number: '' }],
            emails: [{ address: '' }],
            siteMapUrl: '',
            adminEmail: '',
            address: '',
            workingHours: '',
            googleMapsEmbed: ''
          },
          blogSection: data.blogSection || {
            heroImage: '',
            heroTitle: ''
          },
          // Initialize new SEO fields
          blogMetaTitle: data.blogMetaTitle || '',
          blogMetaDescription: data.blogMetaDescription || '',
          blogMetaKeywords: data.blogMetaKeywords || '',
          contactMetaTitle: data.contactMetaTitle || '',
          contactMetaDescription: data.contactMetaDescription || '',
          contactMetaKeywords: data.contactMetaKeywords || '',
        };
        
        reset(resetData);
        
        // Apply ALL colors as CSS variables initially
        if (resetData.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', resetData.primaryColor);
        }
        if (resetData.navTitles?.textColor) {
          document.documentElement.style.setProperty('--nav-text-color', resetData.navTitles.textColor);
        }
        if (resetData.navTitles?.iconColor) {
          document.documentElement.style.setProperty('--nav-icon-color', resetData.navTitles.iconColor);
        }
        if (resetData.navTitles?.bgColor) {
          document.documentElement.style.setProperty('--nav-bg-color', resetData.navTitles.bgColor);
        }
        
        console.log('Form state after reset:', watch());
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [reset, setValue, watch]);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const forms = await getPublishedForms();
        setPublishedForms(forms);
      } catch (error) {
        console.error('Error fetching forms:', error);
        toast.error('Failed to load published forms');
      }
    };

    fetchForms();
  }, []);

  const handleFileUpload = async (e, fieldName) => {
    // Handle media library selection
    if (e.mediaLibraryFile) {
      const mediaFile = e.mediaLibraryFile;
      setValue(fieldName, {
        _id: mediaFile._id,
        url: mediaFile.url,
        fromMediaLibrary: true,
        mediaId: mediaFile.mediaId
      });
      toast.success('Image selected successfully');
      return;
    }

    const file = e.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('addToMediaLibrary', 'true');
      formData.append('setAsInUse', 'true');
      
      try {
        const response = await http.post('/uploadfile', formData);
        if (response.data) {
          setValue(fieldName, {
            _id: response.data._id,
            url: response.data.url,
            fromMediaLibrary: response.data.fromMediaLibrary || false,
            mediaId: response.data.mediaId
          });
          toast.success('Image uploaded successfully');
        }
      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Error uploading image');
      }
    }
  };

  const handleFileRemove = async (fieldName, isFromLibrary = false) => {
    const fileValue = watch(fieldName);
    if (fileValue && fileValue._id && !isFromLibrary && !fileValue.fromMediaLibrary) {
      try {
        await http.delete(`/deletefile?fileName=${fileValue._id}`);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
    setValue(fieldName, null);
    toast.success('Image removed successfully');
  };

  const onSubmit = async (formData) => {
    setSaving(true);
    try {
      // Apply ALL colors immediately via CSS variables
      document.documentElement.style.setProperty('--primary-color', formData.primaryColor);
      document.documentElement.style.setProperty('--nav-text-color', formData.navTitles.textColor);
      document.documentElement.style.setProperty('--nav-icon-color', formData.navTitles.iconColor);
      document.documentElement.style.setProperty('--nav-bg-color', formData.navTitles.bgColor);
      
      // Processed data should now contain the correct hex codes
      const processedData = { ...formData };

      console.log('Submitting settings data:', processedData);
       const updatedSettings = await updateSiteSettings(processedData);
      toast.success('Settings updated successfully');
      
      // Dispatch action to update Redux store
      if (updatedSettings) {
        dispatch(setReduxSettings(updatedSettings));
      }
      
      // Reload settings to get the updated data (optional, as state is set)
      // const updated = await getSiteSettings();
      // setSettings(updated); // You might not need this if reset + CSS vars cover updates

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Handle footer link functions
  const addFooterColumn = () => {
    footerLinksArray.append({ heading: 'New Column', links: [{ title: '', url: '' }] });
    // Optional: Automatically expand the newly added column
    setExpandedFooterColumn(watch('footerLinks').length - 1); 
  };

  const addFooterLink = (columnIndex) => {
    const currentColumn = watch(`footerLinks.${columnIndex}`);
    const updatedLinks = [...(currentColumn.links || []), { title: '', url: '' }];
    // Use update method from useFieldArray to ensure state propagation
    footerLinksArray.update(columnIndex, { ...currentColumn, links: updatedLinks });
  };

  const removeFooterLink = (columnIndex, linkIndex) => {
    const currentColumn = watch(`footerLinks.${columnIndex}`);
    const updatedLinks = currentColumn.links.filter((_, i) => i !== linkIndex);
    // Use update method from useFieldArray to ensure state propagation
    footerLinksArray.update(columnIndex, { ...currentColumn, links: updatedLinks });
  };

  // Add navTitle item
  const addNavTitleItem = () => {
    navTitlesArray.append({ title: '', icon: 'HomeIcon' });
    setExpandedNavItem(watch('navTitles.items').length - 1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tabItems = [
    { name: 'General', icon: <PaintBrushIcon className="w-5 h-5" /> },
    { name: 'SEO', icon: <MegaphoneIcon className="w-5 h-5" /> },
    { name: 'Social', icon: <LinkIcon className="w-5 h-5" /> },
    { name: 'Footer', icon: <DocumentTextIcon className="w-5 h-5" /> },
    { name: 'Nav Titles', icon: <ArrowsUpDownIcon className="w-5 h-5" /> },
    { name: 'Links Info', icon: <LinkIcon className="w-5 h-5" /> },
    { name: 'Contact', icon: <PhoneIcon className="w-5 h-5" /> },
    { name: 'Blog', icon: <BookOpenIcon className="w-5 h-5" /> }, // Add this line
    { name: 'Scripts', icon: <CodeBracketIcon className="w-5 h-5" /> },
  ];

  return (
    <Card 
      title="Site Settings" 
      className="max-w-5xl mx-auto mt-6 mb-12" 
      bodyClass="p-0 md:p-6"
    >
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <div className="relative overflow-hidden">
          <Tab.List className="flex overflow-x-auto scrollbar-hide p-1 space-x-1 bg-gray-100 rounded-lg mb-6 no-scrollbar">
            {tabItems.map((item) => (
              <Tab
                key={item.name}
                className={({ selected }) =>
                  classNames(
                    'flex-shrink-0 min-w-[70px] md:min-w-0 whitespace-nowrap py-2.5 px-3 text-sm leading-5 font-medium rounded-lg flex items-center justify-center',
                    'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-primary-400 ring-primary-500',
                    'transition-all duration-200 touch-manipulation',
                    selected
                      ? 'bg-white text-primary-600 shadow'
                      : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                  )
                }
                aria-label={item.name}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="hidden xs:inline ml-1.5">{item.name}</span>
              </Tab>
            ))}
          </Tab.List>
          <div className="absolute -bottom-1 left-0 w-full h-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Tab.Panels>
            {/* General Settings */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Site Title
                    </label>
                    <input
                      type="text"
                      className={`w-full rounded-lg border-2 ${errors.title ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-primary-500'} focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none`}
                      placeholder="Enter site title"
                      {...register('title', { required: 'Site title is required' })}
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>
                  
                  {/* Primary Color */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Primary Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        className="h-10 w-10 rounded border-2 border-gray-200 cursor-pointer"
                        {...register('primaryColor', { required: 'Primary color is required' })}
                      />
                      <input
                        type="text"
                        readOnly
                        className="ml-2 flex-1 rounded-lg border-2 border-gray-200 bg-gray-100 px-3 py-2 outline-none"
                        value={watchedPrimaryColor || ''}
                      />
                    </div>
                    {errors.primaryColor && (
                      <p className="mt-1 text-sm text-red-600">{errors.primaryColor.message}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Site Description
                  </label>
                  <textarea
                    className="w-full h-24 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="Enter site description"
                    {...register('description')}
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Site Logo 
                    </label>
                    <EnhancedFileUpload
                      file={watch('logo')}
                      onDrop={(e) => handleFileUpload(e, 'logo')}
                      onRemove={(isFromLibrary) => handleFileRemove('logo', isFromLibrary)}
                      loading={false}
                      error={!!errors.logo}
                      identifier="logo"
                    />
                    {errors.logo && (
                      <p className="mt-1 text-sm text-red-600">{errors.logo.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Footer Logo
                    </label>
                    <EnhancedFileUpload
                      file={watch('footerLogo')}
                      onDrop={(e) => handleFileUpload(e, 'footerLogo')}
                      onRemove={(isFromLibrary) => handleFileRemove('footerLogo', isFromLibrary)}
                      loading={false}
                      error={!!errors.footerLogo}
                      identifier="footerLogo"
                    />
                    {errors.footerLogo && (
                      <p className="mt-1 text-sm text-red-600">{errors.footerLogo.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            {/* SEO Settings */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Meta Title (Default)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                      placeholder="Enter meta title"
                      {...register('metaTitle')}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Recommended length: 50-60 characters. Used as default if specific page SEO is not set.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Meta Keywords (Default)
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                      placeholder="Enter comma-separated keywords"
                      {...register('metaKeywords')}
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Meta Description (Default)
                  </label>
                  <textarea
                    className="w-full h-24 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="Enter meta description"
                    {...register('metaDescription')}
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended length: 150-160 characters. Used as default.
                  </p>
                </div>
                
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    OG Image (Default)
                  </label>
                  <EnhancedFileUpload
                    file={watch('ogImage')}
                    onDrop={(e) => handleFileUpload(e, 'ogImage')}
                    onRemove={(isFromLibrary) => handleFileRemove('ogImage', isFromLibrary)}
                    loading={false}
                    error={!!errors.ogImage}
                    identifier="ogImage"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This image will be used when sharing on social media (default).
                  </p>
                </div>
              </div>

              {/* Site SEO Analyzer */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  AI SEO Analysis & Optimization
                </h3>
                <SiteSeoDashboard 
                  siteData={watch()} 
                  pageData={null} 
                  onUpdateSuggestions={(data) => {
                    if (data?.applySuggestion) {
                      // Handle suggestion application
                      if (data.type === 'title') {
                        setValue('title', data.value);
                      } else if (data.type === 'metaTitle') {
                        setValue('metaTitle', data.value);
                      } else if (data.type === 'metaDescription') {
                        setValue('metaDescription', data.value);
                      } else if (data.type === 'keywords') {
                        setValue('metaKeywords', data.value);
                      }
                      // Could add more field updates as needed
                    }
                  }} 
                />
              </div>

              {/* Static Pages SEO Section */}
              <div className="pt-6 mt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Static Pages SEO
                </h3>
                <div className="space-y-4 md:space-y-6">
                  {/* Blog Page SEO */}
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Blog Page</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Blog Meta Title
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Meta title for blog page"
                          {...register('blogMetaTitle')}
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Blog Meta Description
                        </label>
                        <textarea
                          className="w-full h-20 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Meta description for blog page"
                          {...register('blogMetaDescription')}
                        ></textarea>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Blog Meta Keywords
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Comma-separated keywords for blog page"
                          {...register('blogMetaKeywords')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Page SEO */}
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Contact Page</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Meta Title
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Meta title for contact page"
                          {...register('contactMetaTitle')}
                        />
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Meta Description
                        </label>
                        <textarea
                          className="w-full h-20 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Meta description for contact page"
                          {...register('contactMetaDescription')}
                        ></textarea>
                      </div>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Contact Meta Keywords
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Comma-separated keywords for contact page"
                          {...register('contactMetaKeywords')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            {/* Social Links */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                {['facebook', 'twitter', 'instagram', 'linkedin', 'youtube'].map((platform) => (
                  <div key={platform}>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                      placeholder={`https://${platform}.com/your-profile`}
                      {...register(`socialLinks.${platform}`)}
                    />
                  </div>
                ))}
              </div>
            </Tab.Panel>
            
            {/* Footer Settings */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Footer Text
                  </label>
                  <textarea
                    className="w-full h-24 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="Enter footer text or copyright information"
                    {...register('footerText')}
                  ></textarea>
                </div>
                
                {/* Footer Columns Management */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Footer Columns</h3>
                    <button
                      type="button"
                      onClick={addFooterColumn}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Column
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {footerLinksArray.fields.map((column, columnIndex) => (
                      <Disclosure
                        key={column.id}
                        as="div"
                        className="border border-gray-200 rounded-lg overflow-hidden"
                        defaultOpen={columnIndex === expandedFooterColumn}
                      >
                        {({ open }) => (
                          <>
                            <Disclosure.Button 
                              className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 text-left font-medium text-gray-700"
                              onClick={() => setExpandedFooterColumn(open ? null : columnIndex)}
                            >
                              <span>{column.heading || `Column ${columnIndex + 1}`}</span>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    footerLinksArray.remove(columnIndex);
                                  }}
                                  className="mr-2 p-1 rounded-full hover:bg-red-100 text-red-500"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                                <ChevronDownIcon
                                  className={`${open ? 'transform rotate-180' : ''} w-5 h-5 text-gray-500`}
                                />
                              </div>
                            </Disclosure.Button>
                            
                            <Disclosure.Panel className="px-4 py-3 bg-white">
                              <div className="space-y-4">
                                <div>
                                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                                    Column Heading
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                                    placeholder="Enter column heading"
                                    {...register(`footerLinks.${columnIndex}.heading`)}
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <label className="block text-sm font-semibold text-gray-700">
                                      Links
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => addFooterLink(columnIndex)}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-600 hover:bg-primary-100"
                                    >
                                      <PlusIcon className="h-3 w-3 mr-1" />
                                      Add Link
                                    </button>
                                  </div>
                                  
                                  {column.links && column.links.map((link, linkIndex) => (
                                    <div key={linkIndex} className="flex items-start space-x-2">
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="text"
                                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                                          placeholder="Link Title"
                                          {...register(`footerLinks.${columnIndex}.links.${linkIndex}.title`)}
                                        />
                                        <input
                                          type="text"
                                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                                          placeholder="URL"
                                          {...register(`footerLinks.${columnIndex}.links.${linkIndex}.url`)}
                                        />
                                      </div>
                                      
                                      <button
                                        type="button"
                                        onClick={() => removeFooterLink(columnIndex, linkIndex)}
                                        className="p-2 rounded-full hover:bg-red-100 text-red-500 mt-1"
                                      >
                                        <TrashIcon className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    ))}
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            {/* Nav Titles */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Font Size */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Font Size
                    </label>
                    <select 
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                      {...register('navTitles.fontSize')}
                    >
                      <option value="text-sm">Small</option>
                      <option value="text-md">Medium</option>
                      <option value="text-lg">Large</option>
                      <option value="text-xl">Extra Large</option>
                      <option value="text-2xl">2X Large</option>
                    </select>
                  </div>
                  
                  {/* Text Color */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Text Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        className="h-10 w-10 rounded border-2 border-gray-200 cursor-pointer"
                        {...register('navTitles.textColor')}
                      />
                      <input
                        type="text"
                        readOnly
                        className="ml-2 flex-1 rounded-lg border-2 border-gray-200 bg-gray-100 px-3 py-2 outline-none"
                        value={watchedNavTextColor || ''}
                      />
                    </div>
                  </div>
                  
                  {/* Icon Color */}
                  <div>
                    <label className="block mb-2 text-sm font-semibold text-gray-700">
                      Icon Color
                    </label>
                    <div className="flex items-center">
                      <input
                        type="color"
                        className="h-10 w-10 rounded border-2 border-gray-200 cursor-pointer"
                        {...register('navTitles.iconColor')}
                      />
                      <input
                        type="text"
                        readOnly
                        className="ml-2 flex-1 rounded-lg border-2 border-gray-200 bg-gray-100 px-3 py-2 outline-none"
                        value={watchedNavIconColor || ''}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Background Color - NEW */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Background Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      className="h-10 w-10 rounded border-2 border-gray-200 cursor-pointer"
                      {...register('navTitles.bgColor')}
                    />
                    <input
                      type="text"
                      readOnly
                      className="ml-2 flex-1 rounded-lg border-2 border-gray-200 bg-gray-100 px-3 py-2 outline-none"
                      value={watchedNavBgColor || ''}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Set the background color for the navigation title area.
                  </p>
                </div>
                
                {/* Animation Toggle */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="h-5 w-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      {...register('navTitles.animationEnabled')}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      Enable infinite sliding animation
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-gray-500 ml-7">
                    When disabled, titles will be centered and static. When enabled, titles will continuously slide across the screen.
                  </p>
                </div>
                
                {/* Nav Items */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">Navigation Titles</h3>
                    <button
                      type="button"
                      onClick={addNavTitleItem}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {navTitlesArray.fields.map((item, index) => (
                      <Disclosure
                        key={item.id}
                        as="div"
                        className="border border-gray-200 rounded-lg overflow-hidden"
                        defaultOpen={index === expandedNavItem}
                      >
                        {({ open }) => (
                          <>
                            <Disclosure.Button 
                              className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 text-left font-medium text-gray-700"
                              onClick={() => setExpandedNavItem(open ? null : index)}
                            >
                              <div className="flex items-center">
                                {/* Show the selected icon in the accordion header */}
                                {iconMap[watch(`navTitles.items.${index}.icon`)] && (
                                  React.createElement(iconMap[watch(`navTitles.items.${index}.icon`)], {
                                    className: "h-5 w-5 mr-2 text-primary-500"
                                  })
                                )}
                                <span>{watch(`navTitles.items.${index}.title`) || `Item ${index + 1}`}</span>
                              </div>
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navTitlesArray.remove(index);
                                  }}
                                  className="mr-2 p-1 rounded-full hover:bg-red-100 text-red-500"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                                <ChevronDownIcon
                                  className={`${open ? 'transform rotate-180' : ''} w-5 h-5 text-gray-500`}
                                />
                              </div>
                            </Disclosure.Button>
                            
                            <Disclosure.Panel className="px-4 py-3 bg-white">
                              <div className="space-y-4">
                                <div>
                                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                                    placeholder="Enter title"
                                    {...register(`navTitles.items.${index}.title`, { required: true })}
                                  />
                                  {errors.navTitles?.items?.[index]?.title && (
                                    <p className="mt-1 text-sm text-red-600">Title is required</p>
                                  )}
                                </div>
                                
                                <div>
                                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                                    Icon
                                  </label>
                                  <select
                                    className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                                    {...register(`navTitles.items.${index}.icon`, { required: true })}
                                  >
                                    {iconList.map((iconName) => (
                                      <option key={iconName} value={iconName}>
                                        {iconName.replace('Icon', '')}
                                      </option>
                                    ))}
                                  </select>
                                  {errors.navTitles?.items?.[index]?.icon && (
                                    <p className="mt-1 text-sm text-red-600">Icon is required</p>
                                  )}
                                </div>
                                
                                {/* Icon Preview */}
                                <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                                  {watch(`navTitles.items.${index}.icon`) && iconMap[watch(`navTitles.items.${index}.icon`)] && (
                                    <div className="flex flex-col items-center">
                                      {React.createElement(iconMap[watch(`navTitles.items.${index}.icon`)], { 
                                        className: "w-8 h-8 mb-2 text-primary-600"
                                      })}
                                      <span className="text-xs text-gray-500">
                                        {watch(`navTitles.items.${index}.icon`).replace('Icon', '')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Disclosure.Panel>
                          </>
                        )}
                      </Disclosure>
                    ))}
                  </div>
                </div>
              </div>
            </Tab.Panel>
            
            {/* Links Info */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <LinksInfoSection
                register={register}
                control={control}
                watch={watch}
                setValue={setValue}
                errors={errors}
              />
            </Tab.Panel>
            
            {/* Contact Settings */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                {/* Phones Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold text-gray-800">Phone Numbers</h3>
                    <button
                      type="button"
                      onClick={() => phonesArray.append({ number: '' })}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Phone
                    </button>
                  </div>
                  
                  {phonesArray.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Phone #{index + 1}
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="+1 (123) 456-7890"
                          {...register(`contactSection.phones.${index}.number`)}
                        />
                      </div>
                      {phonesArray.fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => phonesArray.remove(index)}
                          className="mt-7 p-2 rounded-full hover:bg-red-100 text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Emails Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-md font-semibold text-gray-800">Email Addresses</h3>
                    <button
                      type="button"
                      onClick={() => emailsArray.append({ address: '' })}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Email
                    </button>
                  </div>
                  
                  {emailsArray.fields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Email #{index + 1}
                        </label>
                        <input
                          type="email"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="contact@example.com"
                          {...register(`contactSection.emails.${index}.address`)}
                        />
                      </div>
                      {emailsArray.fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => emailsArray.remove(index)}
                          className="mt-7 p-2 rounded-full hover:bg-red-100 text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Admin Email */}
                <div className="pt-4 border-t">
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Admin Email (for receiving messages)
                  </label>
                  <input
                    type="email"
                    className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="admin@example.com"
                    {...register('contactSection.adminEmail')}
                  />
                  <p className="mt-1 text-xs text-gray-500">This email will receive form submissions and contact messages.</p>
                </div>
                
                {/* Site Map URL */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Site Map URL
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="https://example.com/sitemap.xml"
                    {...register('contactSection.siteMapUrl')}
                  />
                </div>
                
                {/* Physical Address */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Physical Address
                  </label>
                  <textarea
                    className="w-full h-24 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="123 Business Street, City, State, ZIP"
                    {...register('contactSection.address')}
                  ></textarea>
                </div>
                
                {/* Working Hours */}
             {/* Working Hours */}
<div className="pt-4 border-t">
  <WorkingHoursSection 
    register={register}
    control={control}
    watch={watch}
    setValue={setValue}
    errors={errors}
  />
</div>
                
                {/* Google Maps Embed */}
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Google Maps Embed Code
                  </label>
                  <textarea
                    className="w-full h-24 rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none font-mono text-sm"
                    placeholder="<iframe src='https://maps.google.com/...'></iframe>"
                    {...register('contactSection.googleMapsEmbed')}
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">
                    Paste the embed code from Google Maps to show your location on the contact page.
                  </p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Contact Form
                  </label>
                  <div className="flex flex-col space-y-2">
                    <select
                      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                      value={watch('contactSection.contactFormId') || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : null;
                        setValue('contactSection.contactFormId', value);
                      }}
                    >
                      <option value="">None (Use default contact form)</option>
                      {publishedForms.map(form => (
                        <option key={form.id} value={form.id}>{form.title}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">
                      Select a form to display on the contact page. If none is selected, the default contact form will be used.
                    </p>
                  </div>
                </div>


{/* --contact hero image and title  */}
<div className="space-y-4 border-b pb-6 mb-6">
  <h3 className="text-md font-semibold text-gray-800">Contact Page Hero Section</h3>
  
  <div>
    <label className="block mb-2 text-sm font-semibold text-gray-700">
      Hero Title
    </label>
    <input
      type="text"
      className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
      placeholder="Enter hero title for contact page"
      {...register('contactSection.heroTitle')}
    />
    <p className="mt-1 text-xs text-gray-500">
      This will be displayed as the main heading on the contact page.
    </p>
  </div>
  
  <div>
    <label className="block mb-2 text-sm font-semibold text-gray-700">
      Hero Image
    </label>
    <EnhancedFileUpload
      file={watch('contactSection.heroImage')}
      onDrop={(e) => handleFileUpload(e, 'contactSection.heroImage')}
      onRemove={(isFromLibrary) => handleFileRemove('contactSection.heroImage', isFromLibrary)}
      loading={false}
      error={!!errors.contactSection?.heroImage}
      identifier="contactSection.heroImage"
    />
    <p className="mt-1 text-xs text-gray-500">
      Recommended image size: 640x329 pixels. This image will be displayed at the top of the contact page.
    </p>
  </div>
</div>



              </div>
            </Tab.Panel>

            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
  <div className="space-y-4 md:space-y-6">
    <div className="space-y-4 border-b pb-6 mb-6">
      <h3 className="text-md font-semibold text-gray-800">Blog Page Hero Section</h3>
      
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Hero Title
        </label>
        <input
          type="text"
          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
          placeholder="Enter hero title for blog page"
          {...register('blogSection.heroTitle')}
        />
        <p className="mt-1 text-xs text-gray-500">
          This will be displayed as the main heading on the blog listing page.
        </p>
      </div>
      
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Hero Image
        </label>
        <EnhancedFileUpload
          file={watch('blogSection.heroImage')}
          onDrop={(e) => handleFileUpload(e, 'blogSection.heroImage')}
          onRemove={(isFromLibrary) => handleFileRemove('blogSection.heroImage', isFromLibrary)}
          loading={false}
          error={!!errors.blogSection?.heroImage}
          identifier="blogSection.heroImage"
        />
        <p className="mt-1 text-xs text-gray-500">
          Recommended image size: 640x329 pixels. This image will be displayed at the top of the blog page.
        </p>
      </div>
    </div>
    
    {/* Additional blog-related settings could go here */}
    <div className="space-y-4">
      <h3 className="text-md font-semibold text-gray-800">Blog Page Settings</h3>
      
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Posts Per Page
        </label>
        <input
          type="number"
          min="1"
          max="24"
          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
          placeholder="Number of posts to display per page"
          {...register('blogSection.postsPerPage', { 
            valueAsNumber: true,
            min: 1,
            max: 24
          })}
        />
        <p className="mt-1 text-xs text-gray-500">
          Number of blog posts to display on each page (1-24).
        </p>
      </div>
      
      <div>
        <label className="block mb-2 text-sm font-semibold text-gray-700">
          Featured Category ID
        </label>
        <input
          type="number"
          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
          placeholder="ID of the category to feature"
          {...register('blogSection.featuredCategoryId', { 
            valueAsNumber: true 
          })}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional: Add a category ID to highlight posts from this category at the top of the blog page.
        </p>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="showSidebar"
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          {...register('blogSection.showSidebar')}
        />
        <label htmlFor="showSidebar" className="ml-2 block text-sm text-gray-700">
          Show sidebar with categories and recent posts
        </label>
      </div>
      
      <div className="flex items-center">
        <input
          type="checkbox"
          id="showAuthor"
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
          {...register('blogSection.showAuthor')}
        />
        <label htmlFor="showAuthor" className="ml-2 block text-sm text-gray-700">
          Show author information on posts
        </label>
      </div>
    </div>
  </div>
</Tab.Panel>
            
            {/* Custom Scripts */}
            <Tab.Panel className="bg-white rounded-lg p-2 md:p-4">
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Head Scripts (Google Analytics, etc.)
                  </label>
                  <textarea
                    className="w-full h-40 font-mono text-sm rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="<!-- Your <script> tags or code here -->"
                    {...register('scripts.head')}
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">
                    Scripts added here will be placed in the <code>&lt;head&gt;</code> section of the site.
                  </p>
                </div>
                
                <div>
                  <label className="block mb-2 text-sm font-semibold text-gray-700">
                    Body Scripts (Chat widgets, etc.)
                  </label>
                  <textarea
                    className="w-full h-40 font-mono text-sm rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                    placeholder="<!-- Your <script> tags or code here -->"
                    {...register('scripts.body')}
                  ></textarea>
                  <p className="mt-1 text-xs text-gray-500">
                    Scripts added here will be placed before the closing <code>&lt;/body&gt;</code> tag.
                  </p>
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
          
          <div className="flex justify-end pt-4 md:pt-6 border-t">
            <button
              type="submit"
              className="w-full sm:w-auto rounded-lg px-4 sm:px-6 py-2.5 font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-all shadow"
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : 'Save Settings'}
            </button>
          </div>
        </form>
      </Tab.Group>
    </Card>
  );
}

function LinksInfoSection({ register, control, watch, setValue, errors }) {
  const { fields: linksFields, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: "linksInfo"
  });

  const addMainLink = () => {
    appendLink({ 
      title: '', 
      href: '#',
      hasChildren: false,
      children: [] 
    });
  };

  const addChildLink = (parentIndex) => {
    const currentLinks = watch(`linksInfo`);
    if (!currentLinks[parentIndex].children) {
      setValue(`linksInfo.${parentIndex}.children`, []);
    }
    
    const updatedChildren = [
      ...(currentLinks[parentIndex].children || []), 
      { name: '', href: '#', icon: 'ChartPieIcon', description: '' }
    ];
    
    setValue(`linksInfo.${parentIndex}.hasChildren`, true);
    setValue(`linksInfo.${parentIndex}.children`, updatedChildren);
  };

  const removeChildLink = (parentIndex, childIndex) => {
    const currentChildren = watch(`linksInfo.${parentIndex}.children`);
    const updatedChildren = currentChildren.filter((_, i) => i !== childIndex);
    setValue(`linksInfo.${parentIndex}.children`, updatedChildren);
    
    // If no children left, update hasChildren flag
    if (updatedChildren.length === 0) {
      setValue(`linksInfo.${parentIndex}.hasChildren`, false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">Navigation Links</h3>
        <button
          type="button"
          onClick={addMainLink}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Main Link
        </button>
      </div>
      
      <div className="space-y-4">
        {linksFields.map((link, index) => (
          <Disclosure
            key={link.id}
            as="div"
            className="border border-gray-200 rounded-lg overflow-hidden"
            defaultOpen={false}
          >
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full px-4 py-3 flex justify-between items-center bg-gray-50 hover:bg-gray-100 text-left font-medium text-gray-700">
                  <span>{watch(`linksInfo.${index}.title`) || `Link ${index + 1}`}</span>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLink(index);
                      }}
                      className="mr-2 p-1 rounded-full hover:bg-red-100 text-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                    <ChevronDownIcon
                      className={`${open ? 'transform rotate-180' : ''} w-5 h-5 text-gray-500`}
                    />
                  </div>
                </Disclosure.Button>
                
                <Disclosure.Panel className="px-4 py-3 bg-white">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Title
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Enter title"
                          {...register(`linksInfo.${index}.title`)}
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm font-semibold text-gray-700">
                          Link (URL)
                        </label>
                        <input
                          type="text"
                          className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none"
                          placeholder="Enter URL"
                          {...register(`linksInfo.${index}.href`)}
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-md font-medium text-gray-700">Child Links</h4>
                        <button
                          type="button"
                          onClick={() => addChildLink(index)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-primary-50 text-primary-600 hover:bg-primary-100"
                        >
                          <PlusIcon className="h-3 w-3 mr-1" />
                          Add Child Link
                        </button>
                      </div>
                      
                      {watch(`linksInfo.${index}.children`)?.map((child, childIndex) => (
                        <div key={childIndex} className="mb-4 p-4 border border-gray-100 rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start mb-3">
                            <h5 className="text-sm font-medium text-gray-700">
                              {child.name || `Child ${childIndex + 1}`}
                            </h5>
                            <button
                              type="button"
                              onClick={() => removeChildLink(index, childIndex)}
                              className="p-1 rounded-full hover:bg-red-100 text-red-500"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block mb-1 text-xs font-semibold text-gray-700">
                                Name
                              </label>
                              <input
                                type="text"
                                className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none text-sm"
                                placeholder="Name"
                                {...register(`linksInfo.${index}.children.${childIndex}.name`)}
                              />
                            </div>
                            
                            <div>
                              <label className="block mb-1 text-xs font-semibold text-gray-700">
                                Link (URL)
                              </label>
                              <input
                                type="text"
                                className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none text-sm"
                                placeholder="URL"
                                {...register(`linksInfo.${index}.children.${childIndex}.href`)}
                              />
                            </div>
                            
                            <div>
                              <label className="block mb-1 text-xs font-semibold text-gray-700">
                                Icon
                              </label>
                              <select
                                className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none text-sm"
                                {...register(`linksInfo.${index}.children.${childIndex}.icon`)}
                              >
                                {['ChartPieIcon', 'CursorArrowRaysIcon', 'FingerPrintIcon', 'SquaresPlusIcon', 'ArrowPathIcon', 'PlayCircleIcon', 'PhoneIcon'].map((icon) => (
                                  <option key={icon} value={icon}>
                                    {icon.replace('Icon', '')}
                                  </option>
                                ))}
                              </select>
                            </div>
                            
                            <div>
                              <label className="block mb-1 text-xs font-semibold text-gray-700">
                                Description
                              </label>
                              <input
                                type="text"
                                className="w-full rounded-lg border-2 border-gray-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-all px-3 py-2 outline-none text-sm"
                                placeholder="Description"
                                {...register(`linksInfo.${index}.children.${childIndex}.description`)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {(!watch(`linksInfo.${index}.children`) || watch(`linksInfo.${index}.children`).length === 0) && (
                        <p className="text-sm text-gray-500 italic">No child links added yet.</p>
                      )}
                    </div>
                  </div>
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        ))}
        
        {linksFields.length === 0 && (
          <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p className="text-gray-500">No navigation links added yet. Click the button above to add your first link.</p>
          </div>
        )}
      </div>
    </div>
  );
}