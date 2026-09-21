import { defineComponent, h, onBeforeUnmount, onMounted, ref, watchEffect, type PropType } from 'vue';

import type {
  ReservineButtonElement,
  ReservineButtonHandle,
  ReservineButtonProps,
  ReservineMembershipPurchasedDetail,
  ReservineMembershipsElement,
  ReservineMembershipsHandle,
  ReservineMembershipsProps,
  ReservineOpenChangeDetail
} from '../contract.js';
import {
  RESERVINE_BUTTON_TAG,
  RESERVINE_MEMBERSHIP_PURCHASED_EVENT,
  RESERVINE_MEMBERSHIPS_TAG,
  RESERVINE_OPEN_CHANGE_EVENT
} from '../contract.js';
import {
  applyReservineMembershipsPropsWhenReady,
  applyReservinePropsWhenReady,
  defineReservineElements,
  setReservineOpen
} from '../element.js';

const ReservineButtonDefinition = defineComponent({
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
      if (element.value) void applyReservinePropsWhenReady(element.value, props.config);
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

export const ReservineButton = ReservineButtonDefinition as typeof ReservineButtonDefinition & {
  new (): InstanceType<typeof ReservineButtonDefinition> & ReservineButtonHandle;
};

// ---------------------------------------------------------------------------
// <reservine-memberships>
// ---------------------------------------------------------------------------

const ReservineMembershipsDefinition = defineComponent({
  name: 'ReservineMemberships',
  inheritAttrs: false,
  props: {
    config: {
      type: Object as PropType<ReservineMembershipsProps>,
      default: () => ({})
    }
  },
  emits: {
    openChange: (open: boolean) => typeof open === 'boolean',
    purchased: (detail: ReservineMembershipPurchasedDetail) =>
      typeof detail === 'object' && detail !== null
  },
  setup(props, { attrs, emit, expose }) {
    const element = ref<ReservineMembershipsElement>();
    const handleOpenChange = (event: Event): void => {
      emit('openChange', (event as CustomEvent<ReservineOpenChangeDetail>).detail.open);
    };
    const handlePurchased = (event: Event): void => {
      emit('purchased', (event as CustomEvent<ReservineMembershipPurchasedDetail>).detail);
    };

    onMounted(() => {
      void defineReservineElements();
      element.value?.addEventListener(RESERVINE_OPEN_CHANGE_EVENT, handleOpenChange);
      element.value?.addEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, handlePurchased);
    });

    onBeforeUnmount(() => {
      element.value?.removeEventListener(RESERVINE_OPEN_CHANGE_EVENT, handleOpenChange);
      element.value?.removeEventListener(RESERVINE_MEMBERSHIP_PURCHASED_EVENT, handlePurchased);
    });

    watchEffect(() => {
      if (element.value) void applyReservineMembershipsPropsWhenReady(element.value, props.config);
    });

    expose({
      close: () => setReservineOpen(element.value ?? null, false),
      open: (planId?: number) => {
        const target = element.value;
        if (!target) return;
        if (planId === undefined) setReservineOpen(target, true);
        else if (typeof target.open === 'function') target.open(planId);
        else target.opened = true;
      },
      refresh: () => element.value?.refresh()
    });

    return () => {
      const elementProps: Record<string, unknown> = {
        ...attrs,
        ref: (value: Element | null) => {
          element.value = value as ReservineMembershipsElement | undefined;
        }
      };
      return h(RESERVINE_MEMBERSHIPS_TAG, elementProps);
    };
  }
});

export const ReservineMemberships = ReservineMembershipsDefinition as typeof ReservineMembershipsDefinition & {
  new (): InstanceType<typeof ReservineMembershipsDefinition> & ReservineMembershipsHandle;
};
