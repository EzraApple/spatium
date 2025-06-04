# Spatium (space in latin)

**A tool for figuring out how to make your space work for you**

Spatium is a collaborative floor plan designer that lets you create stunning layouts, arrange furniture, and work together with roommates or family members to design your perfect living space. All for free, right in your browser.

## 🚀 Features

- **Collaborative Design**: Work together with roommates and family members in real-time
- **Drag & Drop Interface**: Easily place and arrange furniture with an intuitive interface
- **Precise Grid System**: Design with accuracy using our built-in grid system
- **Room Creation**: Draw custom room shapes and layouts
- **Door Placement**: Add doors with customizable sizes, directions, and hinge positions
- **Furniture Library**: Choose from a variety of furniture types including tables, beds, couches, and more
- **Real-time Sync**: Changes are instantly synced across all collaborators
- **Shareable Layouts**: Generate unique 8-letter codes to easily share your layouts

## 🎯 How to Use

### Creating a New Layout

1. **Start from the Homepage**: Visit the Spatium homepage
2. **Create Layout**: Click the "Create Layout" button
3. **Name Your Layout**: Give your layout a descriptive name (e.g., "My Apartment", "Studio Layout", "Shared House")
4. **Start Designing**: You'll be taken to the layout editor with a unique 8-letter code

### Joining an Existing Layout

1. **Get the Code**: Ask a collaborator for the 8-letter layout code
2. **Enter the Code**: On the homepage, enter the code in the "Enter 8-letter code" field
3. **Join Layout**: Click "Join Layout" to start collaborating

### Using the Layout Editor

#### Room Design
- **Create Rooms**: Draw room boundaries by placing vertices and connecting them with wall segments
- **Add Doors**: Place doors on walls with customizable:
  - Size (32" or 36" width)
  - Opening direction (in or out)
  - Hinge side (left or right)
  - Position along the wall

#### Furniture Placement
- **Browse Furniture**: Choose from various furniture types including:
  - Tables (rectangular and circular)
  - Beds
  - Couches and seating
  - Storage furniture
  - And more
- **Place & Position**: Drag furniture from the library into your rooms
- **Rotate**: Rotate furniture in 90-degree increments (0°, 90°, 180°, 270°)
- **Resize**: Adjust furniture dimensions as needed

#### Collaboration
- **Real-time Updates**: See changes from other collaborators instantly
- **Share Your Code**: Give your 8-letter layout code to others to invite them
- **Multiple Users**: Work simultaneously with multiple people on the same layout

## 🛠 Getting Started (Development)

### Prerequisites
- Node.js (v18 or higher)
- pnpm package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd spatium
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Convex (Backend)**
   ```bash
   npx convex dev
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build the application for production
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint for code quality

## 📱 Browser Support

Spatium works best on modern browsers with support for:
- Canvas API (for drawing)
- WebSocket connections (for real-time collaboration)
- Modern JavaScript features

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bug reports and feature requests.

---

## 🔧 Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com/)** - Beautiful, accessible React components built on Radix UI
- **[Radix UI](https://www.radix-ui.com/)** - Low-level UI primitives
- **[Lucide React](https://lucide.dev/)** - Beautiful icon library

### Backend & Database
- **[Convex](https://convex.dev/)** - Real-time backend with database, authentication, and file storage
- **Real-time Synchronization** - Live collaboration features

### UI Components & Libraries
- **[React Hook Form](https://react-hook-form.com/)** - Performant form library
- **[Zod](https://zod.dev/)** - TypeScript-first schema validation
- **[class-variance-authority](https://cva.style/)** - CSS class variance utility
- **[clsx](https://github.com/lukeed/clsx)** - Utility for constructing className strings
- **[cmdk](https://cmdk.paco.me/)** - Command palette component
- **[date-fns](https://date-fns.org/)** - Modern JavaScript date utility library
- **[Embla Carousel](https://www.embla-carousel.com/)** - Carousel library
- **[Recharts](https://recharts.org/)** - Chart library built on D3
- **[Sonner](https://sonner.emilkowal.ski/)** - Toast notifications
- **[Vaul](https://vaul.emilkowal.ski/)** - Drawer component

### Development Tools
- **[pnpm](https://pnpm.io/)** - Fast, disk space efficient package manager
- **[PostCSS](https://postcss.org/)** - CSS transformation tool
- **[Autoprefixer](https://autoprefixer.github.io/)** - CSS vendor prefixing
- **[ESLint](https://eslint.org/)** - JavaScript/TypeScript linting

### Styling & Theming
- **[next-themes](https://github.com/pacocoursey/next-themes)** - Theme switching
- **[tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate)** - Animation utilities
- **[tailwind-merge](https://github.com/dcastil/tailwind-merge)** - Utility for merging Tailwind classes 