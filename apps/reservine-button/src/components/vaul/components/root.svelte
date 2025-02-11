<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import { setCtx } from "../ctx.js";
	import type { Props } from "./types.js";
	import { get } from "svelte/store";

	type $$Props = Props;

	export let open = false;
	export let onOpenChange: $$Props["onOpenChange"] = undefined;
	export let closeThreshold: $$Props["closeThreshold"] = undefined;
	export let scrollLockTimeout: $$Props["scrollLockTimeout"] = undefined;
	export let snapPoints: $$Props["snapPoints"] = undefined;
	export let fadeFromIndex: $$Props["fadeFromIndex"] = undefined;
	export let openFocus: $$Props["openFocus"] = undefined;
	export let onOutsideClick: $$Props["onOutsideClick"] = undefined;
	export let closeOnOutsideClick: $$Props["closeOnOutsideClick"] = true;
	export let backgroundColor: $$Props["backgroundColor"] = "black";
	export let nested: $$Props["nested"] = false;
	export let shouldScaleBackground: $$Props["shouldScaleBackground"] = false;
	export let activeSnapPoint: $$Props["activeSnapPoint"] = undefined;
	export let onActiveSnapPointChange: $$Props["onActiveSnapPointChange"] = undefined;
	export let onRelease: $$Props["onRelease"] = undefined;
	export let onDrag: $$Props["onDrag"] = undefined;
	export let onClose: $$Props["onClose"] = undefined;
	export let dismissible: $$Props["dismissible"] = undefined;
	export let direction: $$Props["direction"] = "bottom";

	const {
		states: { keyboardIsOpen, activeSnapPoint: localActiveSnapPoint, drawerId, openDrawerIds },
		methods: { closeDrawer, openDrawer },
		options: { dismissible: localDismissible },
		updateOption,
	} = setCtx({
		defaultOpen: open,
		defaultActiveSnapPoint: activeSnapPoint,
		onOpenChange: ({ next }) => {
			if (open !== next) {
				onOpenChange?.(next);
				open = next;
			}
			return next;
		},
		onActiveSnapPointChange: ({ next }) => {
			if (next === undefined && snapPoints && activeSnapPoint !== next) {
				const newNext = snapPoints[0];
				onActiveSnapPointChange?.(newNext);
				activeSnapPoint = newNext;
				return newNext;
			}

			if (activeSnapPoint !== next) {
				onActiveSnapPointChange?.(next);
				activeSnapPoint = next;
			}
			return next;
		},
		closeThreshold,
		scrollLockTimeout,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		snapPoints: snapPoints as any,
		fadeFromIndex,
		nested,
		onDrag,
		onClose,
		onRelease,
		shouldScaleBackground,
		backgroundColor,
		dismissible,
		direction,
	});

	$: activeSnapPoint !== undefined && localActiveSnapPoint.set(activeSnapPoint);

	$: updateOption("closeThreshold", closeThreshold);
	$: updateOption("scrollLockTimeout", scrollLockTimeout);
	$: updateOption("snapPoints", snapPoints);
	$: updateOption("fadeFromIndex", fadeFromIndex);
	$: updateOption("openFocus", openFocus);
	$: updateOption("shouldScaleBackground", shouldScaleBackground);
	$: updateOption("backgroundColor", backgroundColor);
	$: updateOption("dismissible", dismissible);
	$: updateOption("direction", direction);
</script>

<DialogPrimitive.Root
	{closeOnOutsideClick}
	closeOnEscape={false}
	bind:open
	preventScroll={false}
	onOpenChange={(o) => {
		onOpenChange?.(o);
		if (!o) {
			closeDrawer();
		} else if (o) {
			openDrawer();
		}
	}}
	onOutsideClick={(e) => {
		if (!closeOnOutsideClick) return;

		onOutsideClick?.(e);

		if (e?.defaultPrevented) return;

		if ($keyboardIsOpen) {
			keyboardIsOpen.set(false);
		}
		e.preventDefault();
		if (!$localDismissible) {
			return;
		}
		const $openDialogIds = get(openDrawerIds);
		const isLast = $openDialogIds[$openDialogIds.length - 1] === get(drawerId);
		if (isLast) {
			onOpenChange?.(false);
			closeDrawer();
		}
	}}
	{...$$restProps}
>
	<slot />
</DialogPrimitive.Root>
