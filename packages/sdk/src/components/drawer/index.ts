import { Drawer as DrawerPrimitive } from '../vaul';

import Content from './drawer-content.svelte';
import Overlay from './drawer-overlay.svelte';
import Root from './drawer.svelte';

const Trigger = DrawerPrimitive.Trigger;
const Portal = DrawerPrimitive.Portal;
const Close = DrawerPrimitive.Close;

export {
  Root,
  Content,
  Overlay,
  Trigger,
  Portal,
  Close,
  //
  Root as Drawer,
  Content as DrawerContent,
  Overlay as DrawerOverlay,
  Trigger as DrawerTrigger,
  Portal as DrawerPortal,
  Close as DrawerClose,
};
