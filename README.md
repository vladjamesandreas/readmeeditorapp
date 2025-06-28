# GitHub README Editor

This is a Next.js application that allows users to edit a GitHub repository's README.md file directly in the browser and push changes back to the repository.

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm
- A GitHub account
- A Supabase account

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/github-readme-editor.git
    cd github-readme-editor
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    Create a `.env.local` file by copying the example file:

    ```bash
    cp .env.local.example .env.local
    ```

    Update the `.env.local` file with your credentials:

    - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL.
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase project anon key.
    - `NEXT_PUBLIC_GITHUB_CLIENT_ID`: Your GitHub OAuth App client ID.
    - `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App client secret.
    - `APP_COOKIE_SECRET`: A random string for signing cookies. You can generate one with `openssl rand -base64 32`.

4.  **Run the development server:**

    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **GitHub Authentication:** Sign in with your GitHub account using OAuth.
- **Repository List:** View a paginated and searchable list of your repositories.
- **Markdown Editor:** Edit your README.md file with a simple Markdown editor that includes a preview tab.
- **Commit Changes:** Save your changes and commit them directly to the default branch of your repository.
- **Responsive UI:** The application is built with Tailwind CSS and is responsive across different screen sizes.
- **Toast Notifications:** Get feedback on your actions with toast notifications.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.io/) - Authentication and database
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API client
- [React Hot Toast](https://react-hot-toast.com/) - Toast notifications
- [UIW React Markdown Editor](https://uiwjs.github.io/react-markdown-editor/) - Markdown editor
