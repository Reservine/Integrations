export const IntegrationConstants = {
  adjustedFontSize: 'adjustedFontSize',
  /** Billing picked on a membership card (`subscription` | `purchase`), honoured by the embed route. */
  billing: 'billing',
  baseFontSize: 16,
  employee: 'employee',
  promo: 'promo',
  reservineNavigation: 'reservine-navigation',
  reservineMembershipPurchased: 'reservine-membership-purchased',
  /** Posted by the embedded app to ask the host to close the modal/drawer (SDK 1.5+). */
  reservineClose: 'reservine-close',
  /** Query flag the SDK adds to the iframe url: this host closes on `reservine-close`. */
  reservineCanClose: 'reservine-can-close',
  reservinePrimary: 'reservine-primary',
  reservineHost: 'reservine-host',
  reservineTheme: 'reservine-theme',
  branch: 'branch',
  service: 'service',
  showGallery: 'showGallery'
} as const;

export const ResConsole = {
  blue: '#1e90ff',
  green: '#34c759',
  yellow: '#fadb14'
} as const;
