<script lang="ts">
	// 	Internal only component used to detect when the content
	// is actually mounted (via a conditional {#if ...}) and sets the visible
	// state, which triggers the open animation
	import { onMount } from "svelte";
	import { getCtx } from "../ctx.js";
	import { reset } from "../../internal/helpers/style.js";

	const {
		states: { visible },
		methods: { scaleBackground, restorePositionSetting },
	} = getCtx();

	onMount(() => {
		visible.set(true);

		return () => {
			scaleBackground(false);
			restorePositionSetting();
			// Every close path unmounts the content (a programmatic close never reaches
			// closeDrawer()), so the host gets its own <html> scroll styles back here.
			reset(document.documentElement);
		};
	});
</script>
