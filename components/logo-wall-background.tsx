const LOGO_PATHS = [
  "M58.54,44.73v-24.42c-.01-2.9-1.56-5.58-4.07-7.03l-10.28-5.93c-10.09,19.28-25.67,52.01-17.99,57.11,1.24.51,2.57.68,3.88.55.75-.12,1.58-.34,2.49-.66.26-.12.52-.24.78-.38l21.14-12.22c2.51-1.45,4.06-4.13,4.06-7.03Z",
  "M.81,48.22c.56,1.18,1.39,2.23,2.46,3.02,8.15,3.56,28.57-26.05,40.19-44.31l-10.14-5.85c-2.51-1.45-5.61-1.45-8.12,0L4.06,13.31C1.55,14.76,0,17.44,0,20.34v24.4c.19,1.39.46,2.54.81,3.49Z",
] as const;

export function LogoWallBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="logo-wall-scene">
        <div className="logo-wall-plane">
          <svg
            className="logo-wall-pattern"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="hexa-logo-wall"
                width="92"
                height="98"
                patternUnits="userSpaceOnUse"
              >
                <g transform="translate(16 14) scale(0.56)" opacity="0.16">
                  {LOGO_PATHS.map((d) => (
                    <path key={d.slice(0, 12)} d={d} fill="var(--primary)" />
                  ))}
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexa-logo-wall)" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,var(--background)_94%)]" />
    </div>
  );
}
