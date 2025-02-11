<script lang="ts">
	import { Drawer as DrawerPrimitive } from "../vaul";

	type $$Props = DrawerPrimitive.OverlayProps;

	export let el: $$Props["el"] = undefined;
	let className: $$Props["class"] = undefined;
</script>

<DrawerPrimitive.Overlay
	bind:el
	class={'r-drawer-overlay'}
	{...$$restProps}
>
	<slot />
</DrawerPrimitive.Overlay>
