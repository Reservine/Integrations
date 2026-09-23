import './register.js';

export {
  RESERVINE_BUTTON_TAG,
  RESERVINE_MEMBERSHIP_PURCHASED_EVENT,
  RESERVINE_MEMBERSHIPS_TAG,
  RESERVINE_OPEN_CHANGE_EVENT
} from './contract.js';

/** The release this bundle was built from — `window.ReservineSDK.version` on the CDN. */
export const version: string = __RESERVINE_SDK_VERSION__;
