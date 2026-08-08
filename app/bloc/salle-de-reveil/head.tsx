export default function Head() {
  return (
    <>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&amp;family=Manrope:wght@600;700;800&amp;family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap"
        rel="stylesheet"
      />
      <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
      <script
        id="tailwind-config"
        dangerouslySetInnerHTML={{
          __html: `
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    "colors": {
                        "on-error-container": "#93000a",
                        "secondary-fixed-dim": "#6fd7d6",
                        "surface-container-high": "#d5ecf8",
                        "on-secondary-container": "#007070",
                        "on-tertiary-fixed": "#410003",
                        "tertiary-fixed-dim": "#ffb3ac",
                        "surface-container-lowest": "#ffffff",
                        "primary": "#00478d",
                        "surface-dim": "#c7dde9",
                        "secondary-fixed": "#8cf3f3",
                        "secondary": "#006a6a",
                        "tertiary": "#940010",
                        "outline-variant": "#c2c6d4",
                        "error-container": "#ffdad6",
                        "primary-container": "#005eb8",
                        "on-tertiary-fixed-variant": "#930010",
                        "surface": "#f3faff",
                        "surface-container-low": "#e6f6ff",
                        "on-secondary": "#ffffff",
                        "on-primary-fixed": "#001b3d",
                        "surface-container-highest": "#cfe6f2",
                        "on-tertiary": "#ffffff",
                        "tertiary-fixed": "#ffdad6",
                        "on-background": "#071e27",
                        "primary-fixed-dim": "#a9c7ff",
                        "primary-fixed": "#d6e3ff",
                        "tertiary-container": "#bb1b21",
                        "surface-variant": "#cfe6f2",
                        "on-secondary-fixed": "#002020",
                        "surface-tint": "#005db6",
                        "inverse-primary": "#a9c7ff",
                        "background": "#f3faff",
                        "secondary-container": "#8cf3f3",
                        "on-error": "#ffffff",
                        "on-primary-fixed-variant": "#00468c",
                        "inverse-surface": "#1e333c",
                        "on-primary-container": "#c8daff",
                        "surface-bright": "#f3faff",
                        "inverse-on-surface": "#dff4ff",
                        "on-tertiary-container": "#ffceca",
                        "on-secondary-fixed-variant": "#004f4f",
                        "outline": "#727783",
                        "surface-container": "#dbf1fe",
                        "error": "#ba1a1a",
                        "on-surface-variant": "#424752",
                        "on-surface": "#071e27",
                        "on-primary": "#ffffff"
                    },
                    "borderRadius": {
                        "DEFAULT": "0.125rem",
                        "lg": "0.25rem",
                        "xl": "0.5rem",
                        "full": "0.75rem"
                    },
                    "fontFamily": {
                        "headline": ["Manrope"],
                        "display": ["Manrope"],
                        "body": ["Inter"],
                        "label": ["Inter"]
                    }
                },
            },
        }
    `,
        }}
      />
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        body { font-family: 'Inter', sans-serif; }
        h1, h2, h3 { font-family: 'Manrope', sans-serif; }
        .nav-item-active {
            background-color: white;
            color: #00478d;
            box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }
    `,
        }}
      />
    </>
  );
}
