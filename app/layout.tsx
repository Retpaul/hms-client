import type { Metadata } from "next";
import { sfProDisplay } from "./fonts";
import "./globals.css";
import "./demo.css";
import "./organisation.css";
import "./capabilities.css";
import "./workspace-ui.css";

export const metadata: Metadata = {
  title: { default: "HMS · Connected hospital care", template: "%s | HMS" },
  description: "A connected workspace for hospital teams, patient records, appointments, pharmacy and daily operations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sfProDisplay.variable} h-full antialiased`}
    >
      <body className={`${sfProDisplay.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
