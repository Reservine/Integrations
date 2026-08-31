import { defineComponent, h, onBeforeUnmount, onMounted, ref, watchEffect, type PropType } from 'vue';

import type { ReservineButtonElement, ReservineButtonProps, ReservineOpenChangeDetail } from '../contract.js';
import { RESERVINE_BUTTON_TAG, RESERVINE_OPEN_CHANGE_EVENT } from '../contract.js';
import { applyReservineProps, defineReservineElements, setReservineOpen } from '../element.js';

export const ReservineButton = defineComponent({
  name: 'ReservineButton',
  inheritAttrs: false,
  props: {
    config: {
      type: Object as PropType<ReservineButtonProps>,
      default: () => ({})
    }
  },
  emits: {
    openChange: (open: boolean) => typeof open === 'boolean'
  },
  setup(props, { attrs, emit, expose, slots }) {
    const element = ref<ReservineButtonElement>();
    const handleOpenChange = (event: Event): void => {
      emit('openChange', (event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
    };

    onMounted(() => {
      void defineReservineElements();
      element.value?.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, handleOpenChange);
    });

    onBeforeUnmount(() => {
      element.value?.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, handleOpenChange);
    });

    watchEffect(() => {
      if (element.value) applyReservineProps(element.value, props.config);
    });

    expose({
      close: () => setReservineOpen(element.value ?? null, false),
      open: () => setReservineOpen(element.value ?? null, true)
    });

    return () => {
      const elementProps: Record<string, unknown> = {
        ...attrs,
        ref: (value: Element | null) => {
          element.value = value as ReservineButtonElement | undefined;
        }
      };
      return h(RESERVINE_BUTTON_TAG, elementProps, slots.default?.());
    };
  }
});
