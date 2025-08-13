
# 🐣 Hatchery Performance Dashboard

A comprehensive hatchery data management and analytics platform built with modern web technologies. This dashboard simplifies data entry, analysis, and visualization of hatchery KPIs, egg fertility, and residue analysis — all in one interactive and insightful application.

---

## 🚀 Application Overview

This application is designed to digitize and streamline hatchery operations through three core data sheets:

### 1. **Performance Dashboard**

* Track key hatchery metrics: Fertility, Hatch Rate, Early Deaths
* Real-time KPIs and charts with filtering by hatchery (DHN, SAM, ENT)
* Aggregated performance insights

### 2. **Fertility Sheet**

* Record egg fertility and hatch performance per breeder flock
* Fixed 648-egg input format for standardized analysis
* Automatic computation of FERTILITY%, DEAD%, and HOF%

### 3. **Residue Sheet**

* Analyze unhatched eggs to identify failure causes
* Classify across 15+ categories (e.g., contamination, embryo issues)
* Cross-validation with fertility data to pinpoint root causes

---

## 🌟 Key Features

* **Interactive Dashboard:** 7 navigation tabs — Overview, Performance, Comparison, Data Entry, Fertility, Residue, Upload
* **Real-Time Filtering & Visualization:** Use charts, KPI blocks, and comparison tools for rapid insight
* **Data Management:** CRUD operations and CSV upload across all data sheets
* **Advanced Analytics:** Trend monitoring, inter-hatchery comparisons, residue-fertility correlation, and summary stats
* **Demo Onboarding:** Built-in guided tutorial for new users (using intro.js-style flow)

---

## 🧠 Tech Stack Overview

### ⚙️ Core Framework & Build Tools

* **React 18.3.1** – Modern React with hooks and functional components
* **TypeScript 5.5.3** – Static typing for a better development experience
* **Vite 5.4.1** – Lightning-fast dev server and build tool (on port `8080`)
* **SWC** – High-performance compiler via `@vitejs/plugin-react-swc`

### 🎨 UI & Styling

* **Tailwind CSS 3.4.11** – Utility-first styling
* **shadcn/ui** – Modern UI components built on Radix
* **Radix UI** – Headless, accessible UI primitives (dialogs, dropdowns, etc.)
* **Lucide React** – Icon set with 400+ clean icons
* **CVA (Class Variance Authority)** – Type-safe styling variants

### 📊 Charts & Data

* **Recharts 2.12.7** – Responsive charting for dashboard visualizations
* **React Query** – Server state and caching for live data

### 🧾 Forms & Validation

* **React Hook Form 7.53.0** – High-performance form handling
* **Zod 3.23.8** – Schema-based validation with full TypeScript support
* **@hookform/resolvers** – Zod integration with React Hook Form

### 🧭 Routing & Navigation

* **React Router DOM 6.26.2** – Client-side routing

### 🔧 Utilities

* **date-fns** – Date manipulation utilities
* **Sonner** – Elegant toast notifications
* **cmdk** – Command palette UX
* **next-themes** – Light/dark theme toggle support

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── ui/                        # 30+ shadcn/ui-based reusable components
│   └── dashboard/
│       ├── OverviewDashboard.tsx      # KPIs and real-time charts
│       ├── PerformanceCharts.tsx      # Graphs and metrics display
│       ├── ComparisonAnalysis.tsx     # Side-by-side performance analysis
│       ├── DataEntry.tsx              # Manual data input
│       ├── FertilityDataEntry.tsx     # Fertility sheet forms
│       ├── ResidueDataEntry.tsx       # Residue cause tracking
│       ├── DataUpload.tsx             # CSV upload and parsing
│       └── DemoTutorial.tsx           # Guided walkthrough
├── hooks/                            # Custom hooks
├── lib/                              # Utility functions
├── pages/
│   ├── Index.tsx                    # Main landing page
│   └── NotFound.tsx                 # 404 fallback
└── App.tsx                          # Root component with routing
```

---

## 💻 Local Development Setup

```sh
# Install dependencies
npm install

# Start development server (http://localhost:8080)
npm run dev

# Build production version
npm run build

# Preview production build locally
npm run preview
```

---

## 🧩 Development Best Practices

* **Component Composition** using `shadcn/ui` for consistency and accessibility
* **Type Safety** with strict TypeScript interfaces and Zod schemas
* **Local & Server State** managed via React hooks and React Query
* **Form Handling** with validation and optimized performance
* **Responsive UI** designed mobile-first with Tailwind CSS
* **Modern Patterns** with fully functional components and hooks

