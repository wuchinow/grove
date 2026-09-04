import "./globals.css";

export const metadata = {
  title: "Grove",
  description: "Snap a photo of your schoolwork and grow a grove while you study.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#EFE4D2",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
