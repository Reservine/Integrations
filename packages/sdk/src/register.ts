import ReservineButtonElement from './reservine-button.component.svelte';
import ReservineMembershipsElement from './reservine-memberships.component.svelte';
import ReservineWidgetElement from './reservine-widget.component.svelte';

if (!customElements.get('reservine-button')) {
  customElements.define('reservine-button', ReservineButtonElement as unknown as CustomElementConstructor);
}

if (!customElements.get('reservine-widget')) {
  customElements.define('reservine-widget', ReservineWidgetElement as unknown as CustomElementConstructor);
}

if (!customElements.get('reservine-memberships')) {
  customElements.define(
    'reservine-memberships',
    ReservineMembershipsElement as unknown as CustomElementConstructor
  );
}
