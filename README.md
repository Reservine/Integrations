# @reservine/integrations

A powerful integration package that allows easy implementation of [Reservine's](https://reservine.me) booking system into any website. The package includes a customizable booking button component built with Svelte and packaged as a Web Component.

## Features

- 🎯 Easy to integrate with any website or framework
- 📱 Responsive design
- 🌐 Framework-agnostic (works with any web framework)

## Live Examples

You can see our booking system in action:
- Demo version: [https://dev.reservine.me](https://dev.reservine.me)
- Production example: [MyTime Gym](https://mytimegym.cz)
- Reservine website: [https://reservine.me](https://reservine.me)

## Installation

### Development Setup

1. Ensure you have the following prerequisites installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/)

2. Clone and set up the repository:
```bash
git clone [repository-url]
cd [repository-name]
pnpm install
```

### Available Scripts

```bash
# Start development server
pnpm run serve:reservine-button    # Serves the button component on port 3333

# Build for production
pnpm run build:reservine-button    # Creates production build

# Release new version
pnpm run release:reservine-button  # Releases a new version
```

## Integration Guide

### Quick Start

1. Add the script to your HTML `<head>`:
```html
<script defer src="https://unpkg.com/reservine-button@latest"></script>
```

2. Add the booking button component where needed:
```html
<reservine-button
  reservationUrl="https://your-business.reservine.me"
  text="Book Now"
  color="#3b82f6"
  size="medium"
  appearance="primary"
  width="auto"
  borderRadius="6"
></reservine-button>
```

### Real-World Examples

Here are some example implementations:

1. Basic implementation (like on [MyTime Gym](https://mytimegym.cz)):
```html
<reservine-button
  reservationUrl="https://mytimegym.reservine.me"
  text="Book Now"
  color="#3b82f6"
  size="medium"
></reservine-button>
```

2. Demo version implementation:
```html
<reservine-button
  reservationUrl="https://dev.reservine.me"
  text="Try Demo"
  color="#10b981"
  appearance="outline"
></reservine-button>
```

### Component Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `reservationUrl` | string | required | Your Reservine booking URL |
| `text` | string | '' | Button text |
| `size` | 'small' \| 'medium' \| 'large' | 'medium' | Button size |
| `width` | 'auto' \| 'full' | 'auto' | Button width |
| `color` | string | '#ffffff' | Button color (hex format) |
| `borderRadius` | string | '6px' | Border radius |
| `appearance` | 'primary' \| 'text' \| 'outline' | 'primary' | Button style |
| `branch` | number | null | Branch ID for multi-location businesses |
| `service` | number | null | Pre-select specific service |
| `employee` | number | null | Pre-select specific employee |
| `asWrapper` | boolean | false | Use as wrapper for custom content |

### Advanced Usage

#### Custom Styling
The button supports three appearance modes:
```html
<!-- Primary Button -->
<reservine-button appearance="primary" color="#3b82f6"></reservine-button>

<!-- Text Button -->
<reservine-button appearance="text" color="#3b82f6"></reservine-button>

<!-- Outline Button -->
<reservine-button appearance="outline" color="#3b82f6"></reservine-button>
```

#### Pre-selecting Services or Employees
You can pre-select specific services or employees:
```html
<reservine-button
  reservationUrl="https://your-business.reservine.me"
  service="123"
  employee="456"
></reservine-button>
```

#### Custom Content Wrapper
Use the button as a wrapper for custom content:
```html
<reservine-button asWrapper="true">
  <div class="custom-button">
    <img src="calendar-icon.svg" alt="Calendar">
    <span>Book Your Appointment</span>
  </div>
</reservine-button>
```

## Development

### Building for Production

The production build process:
1. Compiles TypeScript and Svelte components
2. Bundles the code using Vite
3. Creates a UMD module for browser usage
4. Copies the output to the appropriate directory

```bash
pnpm run build:reservine-button
```

### Running Tests

## Browser Support

The package supports all modern browsers:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## License

This project is licensed under a proprietary license. For more information, please contact the project maintainers.

## Support

For technical support or integration questions:
- Website: [https://reservine.me](https://reservine.me)
- Email: [hello@reservine.me](mailto:hello@reservine.me)
- Issues: [GitHub Issues](https://github.com/Reservine/Integrations/issues)
