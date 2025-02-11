<script lang="ts">
	import { Drawer as DrawerPrimitive } from "../vaul";
	import DrawerOverlay from "./drawer-overlay.svelte";

	type $$Props = DrawerPrimitive.ContentProps;
</script>

<DrawerPrimitive.Portal>
	<DrawerOverlay />


	<DrawerPrimitive.Content
		{...$$restProps}
	>
    <DrawerPrimitive.Close class="r-drawer-close">
      <svg style="width:22px; height:22px;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </DrawerPrimitive.Close>

    <div class="r-drawer-header">
		  <div class="r-drawer-handle" />
    </div>

		<slot />
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
