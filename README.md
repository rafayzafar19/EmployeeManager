# Employee Manager

A React-based employee management system with attendance and payroll tracking features.

## Features

- Employee attendance tracking
- Payroll management
- Modern UI with Tailwind CSS
- Responsive design

## Development

To run the project locally:

```bash
npm install
npm run dev
```

## Deployment

### GitHub Pages

This project is configured for GitHub Pages deployment. To deploy:

1. Make sure you have the latest changes committed to your repository
2. Run the deployment command:
   ```bash
   npm run deploy
   ```
3. The site will be available at: https://rafay-ahmed.github.io/EmployeeManager

### Vercel (Recommended)

For Vercel deployment:

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy with: `vercel`
3. Or connect your GitHub repository to Vercel for automatic deployments

**Note:** The project is configured for both GitHub Pages and Vercel. For Vercel deployment, the base path is automatically handled.

## Build

To build for production:

```bash
npm run build
```

## Technologies Used

- React 19
- Vite
- Tailwind CSS
- XLSX for Excel file handling
- File-saver for file downloads
