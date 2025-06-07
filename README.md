# Radiation Shielding Calculator

A web-based tool for calculating radiation exposure and shielding requirements in medical environments. This calculator uses the Archer equation to model radiation attenuation through various barrier materials.

> ⚠️ **Validation Pending**: This calculator is currently undergoing validation. Results should not be used for clinical purposes without independent verification.

## Features

- **Multi-source radiation calculations** using the Archer equation
- **Supported isotopes**: Tc-99m, I-131, F-18, I-123, Ga-67, In-111
- **Interactive floor plan** with scale calibration
- **Barrier materials**: Lead, Concrete, Steel, Plasterboard, Glass, Brick, Wood
- **Heatmap visualization** for dose distribution
- **Energy-dependent calculations** with buildup factors
- **Export functionality** (CSV and PDF reports)

## Tech Stack

- **Framework**: Vite + TypeScript
- **Language**: TypeScript (strict mode)
- **Styling**: Custom CSS with CSS variables
- **UI**: Canvas-based drawing with HTML5
- **Deployment**: GitHub Pages with GitHub Actions

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shielding-calculator.git
cd shielding-calculator

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start development server on port 3000
npm run build        # Build for production
npm run type-check   # Run TypeScript type checking (tsc --noEmit)
npm run preview      # Preview production build
```

## Project Structure

```
src/
├── calculations/          # Core calculation logic
│   ├── archer.ts         # Archer equation implementation
│   ├── exposure.ts       # Multi-source exposure calculations
│   └── geometry.ts       # Geometry utilities
├── components/           # UI components and handlers
│   ├── archer-ui.ts      # Archer parameter interface
│   ├── calculations-client.ts  # Calculation coordinator
│   ├── ceiling-floor-calc.ts   # Multi-floor calculations
│   ├── drawing.ts        # Canvas rendering
│   ├── event-handlers.ts # User interactions
│   ├── heatmap-client.ts # Heatmap generation
│   └── ui-controls.ts    # UI state management
├── data/                 # Static data
│   ├── isotopes.ts       # Isotope properties
│   └── materials.ts      # Shielding materials
├── types/                # TypeScript definitions
├── utils/                # Utility functions
│   ├── archer-params.ts  # Archer equation parameters
│   ├── constants.ts      # App constants
│   ├── export.ts         # Export functionality
│   ├── state.ts          # Global state management
│   └── unit-conversions.ts # Unit conversion helpers
├── styles/               # Styling
├── auth.html            # Authentication page
├── index.html           # Main application
└── main.ts              # Entry point
```

## Usage

1. **Calibrate the floor plan**: Upload a floor plan image and set the scale
2. **Add radiation sources**: Click to place sources and specify isotope/activity
3. **Draw barriers**: Select material and draw protective barriers
4. **Add measurement points**: Place points to calculate exposure
5. **Generate heatmap**: Visualize dose distribution across the space
6. **Export results**: Download calculations as CSV or PDF

## Technical Details

- **Calculations**: Based on the Archer equation with energy-dependent attenuation
- **Units**: SI units internally (meters, mCi, mR/hr)
- **Coordinate system**: Canvas pixels converted to meters using calibration
- **State management**: Centralized AppState class for all application state
- **Rendering**: Canvas-based with real-time updates

## Deployment

The application is deployed to GitHub Pages automatically on push to the main branch.

### Manual Deployment

```bash
# Build the application
npm run build

# The dist/ folder contains the production build
```

### GitHub Pages Setup

1. Push code to GitHub repository
2. Go to Settings → Pages
3. Set source to "GitHub Actions"
4. Access at `https://[username].github.io/shielding-calculator/`

## Authentication

The application includes basic obfuscation-level authentication to discourage use during validation:
- Access code: `radiation2024`
- Session-based authentication
- Redirects to auth.html if not authenticated

## Development Notes

- ES modules require a dev server for local testing
- TypeScript strict mode enforced
- All calculations validated against known standards
- Debug panel available for calculation transparency

## Contributing

This project is currently under development and validation. Please contact the maintainers before contributing.

## License

[License information to be added]

## Disclaimer

This calculator is a tool for educational and planning purposes. All calculations should be independently verified by qualified professionals before use in clinical settings.